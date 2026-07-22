import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useWorker } from '../../context/WorkerContext';
import { t } from '../../lib/i18n';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon URL issues in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      try {
        map.setView(center, map.getZoom());
      } catch (err) {
        console.warn('RecenterMap error:', err);
      }
    }
  }, [center, map]);
  return null;
}

const RISK_COLORS = {
  high: '#DC2626',
  medium: '#D97706',
  low: '#16A34A',
  unknown: '#D97706',
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatMonthYear(my) {
  if (!my) return 'Recent';
  const parts = String(my).split('-');
  if (parts.length === 2) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    if (monthIdx >= 0 && monthIdx < 12) return `${MONTH_NAMES[monthIdx]} ${year}`;
  }
  return my;
}

function formatSiteType(site) {
  const st = site.siteType || site.site_type || 'sewer';
  if (st === 'septic' || st === 'septic_tank') return 'Septic Tank';
  if (st === 'ewaste' || st === 'ewaste_pit') return 'E-Waste Pit';
  if (st === 'drain' || st === 'drain_canal') return 'Drain Canal';
  return 'Sewer Manhole';
}

function createBadgeIcon(count) {
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:rgba(0,0,0,0.85);color:white;
      display:flex;align-items:center;justify-content:center;
      font-size:10px;font-weight:800;border:1px solid white;
      pointer-events:none;
    ">${count}</div>`,
  });
}

// OSM Overpass fetcher component using standard React state for markers
function OSMOverlay({ enabled }) {
  const map = useMap();
  const [osmNodes, setOsmNodes] = useState([]);

  useEffect(() => {
    if (!enabled) {
      setOsmNodes([]);
      return;
    }

    const fetchOSM = async () => {
      try {
        const bounds = map.getBounds();
        const south = bounds.getSouth().toFixed(4);
        const west = bounds.getWest().toFixed(4);
        const north = bounds.getNorth().toFixed(4);
        const east = bounds.getEast().toFixed(4);
        const query = `https://overpass-api.de/api/interpreter?data=[out:json];node[man_made=manhole](${south},${west},${north},${east});out;`;

        const res = await fetch(query);
        const data = await res.json();
        if (data && data.elements) {
          setOsmNodes(data.elements);
        }
      } catch (e) {
        console.warn('OSM fetch failed:', e);
      }
    };

    fetchOSM();

    map.on('moveend', fetchOSM);
    return () => {
      map.off('moveend', fetchOSM);
    };
  }, [enabled, map]);

  if (!enabled || !osmNodes.length) return null;

  return (
    <>
      {osmNodes.map((node) => (
        <CircleMarker
          key={`osm-${node.id}`}
          center={[node.lat, node.lon]}
          radius={6}
          fillColor="#9CA3AF"
          fillOpacity={0.7}
          color="#6B7280"
          weight={1}
        >
          <Popup>
            <div className="text-xs">OSM Manhole</div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

export default function DangerMapView({
  center = [17.3850, 78.4867],
  sites = [],
  osmEnabled = false,
  onReportIncident,
}) {
  const { worker } = useWorker();
  const lang = worker?.language || 'en';
  const defaultCenter = (center && center[0] && center[1]) ? center : [17.3850, 78.4867];

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-border-custom bg-surface relative z-10 shadow-lg">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <RecenterMap center={defaultCenter} />

        {center && center[0] && center[1] && (
          <Marker position={defaultCenter}>
            <Popup>
              <div className="text-xs font-semibold text-text-primary">
                📍 {t('map.nearMe', lang)} (Your Location)
              </div>
            </Popup>
          </Marker>
        )}

        {Array.isArray(sites) && sites.map((site, idx) => {
          const lat = Number(site.latitude || site.lat || site.lat_rounded);
          const lng = Number(site.longitude || site.lng || site.lng_rounded);
          if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

          const riskLevel = String(site.risk_level || site.riskLevel || site.risk_tier || 'high').toLowerCase();
          const fillColor = RISK_COLORS[riskLevel] || RISK_COLORS.unknown;
          const incidentCount = site.incident_count_30d ?? site.incidentCount ?? site.incident_count ?? 1;
          const siteTypeDisplay = formatSiteType(site);
          const lastReportedText = formatMonthYear(site.month_year) || site.last_reported || site.lastReported || 'Recent';
          const gearProvided = site.gear_provided ?? site.gear_compliance ?? false;

          return (
            <CircleMarker
              key={site.id || `${lat}-${lng}-${idx}`}
              center={[lat, lng]}
              radius={14}
              fillOpacity={0.85}
              stroke={true}
              weight={2}
              color="white"
              fillColor={fillColor}
            >
              <Popup>
                <div className="p-2 space-y-2 text-text-primary text-xs min-w-[200px]">
                  <div className="flex items-center justify-between border-b border-border-custom pb-1.5">
                    <span className="font-bold text-base text-accent">{siteTypeDisplay}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      riskLevel === 'high' ? 'bg-danger/20 text-danger border border-danger/30' :
                      riskLevel === 'medium' ? 'bg-warning/20 text-warning border border-warning/30' :
                      'bg-safe/20 text-safe border border-safe/30'
                    }`}>{riskLevel.toUpperCase()} RISK</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">Last Reported:</span>
                      <span className="font-semibold text-text-primary">{lastReportedText}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Incidents (30 Days):</span>
                      <span className="font-bold text-danger">{incidentCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Gear Provided:</span>
                      <span className={`font-semibold ${gearProvided ? 'text-safe' : 'text-danger'}`}>
                        {gearProvided ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  {onReportIncident && (
                    <button
                      onClick={() => onReportIncident(site)}
                      className="w-full mt-2 py-1.5 bg-danger/20 border border-danger/40 text-danger hover:bg-danger hover:text-white rounded-xl font-bold text-[10px] transition-all"
                    >
                      🚨 + Report incident at this site
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Incident count badges for merged markers rendered safely via React-Leaflet Marker */}
        {Array.isArray(sites) && sites.map((site, idx) => {
          const lat = Number(site.latitude || site.lat || site.lat_rounded);
          const lng = Number(site.longitude || site.lng || site.lng_rounded);
          const count = Number(site.incident_count_30d ?? site.incidentCount ?? 1);
          if (!lat || !lng || isNaN(lat) || isNaN(lng) || count <= 1) return null;
          return (
            <Marker
              key={`badge-${site.id || idx}`}
              position={[lat, lng]}
              icon={createBadgeIcon(count)}
              interactive={false}
            />
          );
        })}

        <OSMOverlay enabled={osmEnabled} />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 z-[1000] bg-surface/90 border border-border-custom rounded-lg p-2 text-[10px] space-y-1 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] border border-white" />
          <span className="text-muted">HIGH risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] border border-white" />
          <span className="text-muted">MEDIUM risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] border border-white" />
          <span className="text-muted">LOW risk</span>
        </div>
        {osmEnabled && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-border-custom mt-1">
            <span className="w-2 h-2 rounded-full bg-[#9CA3AF] border border-[#6B7280]" />
            <span className="text-muted">OSM manhole</span>
          </div>
        )}
      </div>
    </div>
  );
}
