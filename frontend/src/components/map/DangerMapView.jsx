import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useWorker } from '../../context/WorkerContext';
import { t } from '../../lib/i18n';
import 'leaflet/dist/leaflet.css';

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
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

function createColoredIcon(color, count) {
  const size = count > 1 ? 32 : 28;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};color:white;
      display:flex;align-items:center;justify-content:center;
      font-size:${count > 1 ? '11px' : '0'};font-weight:800;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">${count > 1 ? count : ''}</div>`,
  });
}

const RISK_COLORS = {
  high: '#DC2626',
  medium: '#D97706',
  low: '#16A34A',
  unknown: '#D97706',
};

// OSM Overpass fetcher component
function OSMOverlay({ enabled, onBoundsChange }) {
  const map = useMap();
  const osmNodesRef = useRef([]);

  useEffect(() => {
    if (!enabled) {
      osmNodesRef.current = [];
      map.eachLayer((layer) => {
        if (layer.options?.isOsmNode) {
          map.removeLayer(layer);
        }
      });
      return;
    }

    const fetchOSM = async () => {
      const bounds = map.getBounds();
      const south = bounds.getSouth().toFixed(4);
      const west = bounds.getWest().toFixed(4);
      const north = bounds.getNorth().toFixed(4);
      const east = bounds.getEast().toFixed(4);
      const query = `https://overpass-api.de/api/interpreter?data=[out:json];node[man_made=manhole](${south},${west},${north},${east});out;`;

      try {
        const res = await fetch(query);
        const data = await res.json();
        if (!data.elements) return;

        // Remove old OSM layers
        osmNodesRef.current.forEach((layer) => {
          if (map.hasLayer(layer)) map.removeLayer(layer);
        });
        osmNodesRef.current = [];

        data.elements.forEach((node) => {
          const marker = L.circleMarker([node.lat, node.lon], {
            radius: 6,
            fillColor: '#9CA3AF',
            fillOpacity: 0.7,
            color: '#6B7280',
            weight: 1,
            isOsmNode: true,
          });
          marker.bindPopup(`<div class="text-xs">OSM Manhole</div>`);
          marker.addTo(map);
          osmNodesRef.current.push(marker);
        });
      } catch {}
    };

    fetchOSM();
    if (onBoundsChange) onBoundsChange(fetchOSM);

    map.on('moveend', fetchOSM);
    return () => {
      map.off('moveend', fetchOSM);
      osmNodesRef.current.forEach((layer) => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      });
      osmNodesRef.current = [];
    };
  }, [enabled, map, onBoundsChange]);

  return null;
}

export default function DangerMapView({
  center = [17.3850, 78.4867],
  sites = [],
  osmEnabled = false,
  onReportIncident,
}) {
  const { worker } = useWorker();
  const defaultCenter = center[0] && center[1] ? center : [17.3850, 78.4867];
  const boundsChangeRef = useRef(null);

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-border-custom bg-surface relative z-10 shadow-lg">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <RecenterMap center={defaultCenter} />

        {center[0] && center[1] && (
          <Marker position={defaultCenter}>
            <Popup>
              <div className="text-xs font-semibold text-text-primary">
                📍 {t('map.nearMe', worker.language)} (Your Location)
              </div>
            </Popup>
          </Marker>
        )}

        {sites.map(site => {
          const lat = site.latitude || site.lat || site.lat_rounded;
          const lng = site.longitude || site.lng || site.lng_rounded;
          if (!lat || !lng) return null;

          const riskLevel = (site.risk_level || site.riskLevel || site.risk_tier || 'high').toLowerCase();
          const fillColor = RISK_COLORS[riskLevel] || RISK_COLORS.unknown;
          const incidentCount = site.incident_count_30d ?? site.incidentCount ?? site.incident_count ?? 1;
          const icon = createColoredIcon(fillColor, incidentCount);
          const siteTypeDisplay = site.siteType === 'septic' || site.site_type === 'septic_tank' ? 'Septic Tank'
            : site.siteType === 'ewaste' || site.site_type === 'ewaste_pit' ? 'E-Waste Pit'
            : site.siteType === 'drain' ? 'Drain Canal'
            : 'Sewer Manhole';
          const lastReportedText = site.last_reported || site.lastReported || site.month_year || 'Recent';
          const gearProvided = site.gear_provided ?? site.gear_compliance ?? false;

          return (
            <Marker
              key={site.id || `${lat}-${lng}`}
              position={[lat, lng]}
              icon={icon}
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
                      <span className="text-muted">Incidents (Last 30 Days):</span>
                      <span className="font-bold text-danger">{incidentCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Safety Gear Provided:</span>
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
            </Marker>
          );
        })}

        <OSMOverlay enabled={osmEnabled} onBoundsChange={(fn) => { boundsChangeRef.current = fn; }} />
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
