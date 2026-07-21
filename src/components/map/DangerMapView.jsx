import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useWorker } from '../../context/WorkerContext';
import { t } from '../../lib/i18n';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issues in standard Leaflet with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically adjust map center when coordinates change
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

const INCIDENT_COLORS = {
  0: '#22c55e',    // No incidents — green
  1: '#eab308',    // 1 incident — yellow
  2: '#f97316',    // 2 incidents — orange
  3: '#dc2626',    // 3+ incidents — red
};

function createDangerIcon(incidentCount) {
  const color = INCIDENT_COLORS[Math.min(incidentCount, 3)];
  return L.divIcon({
    html: `
      <div style="
        width: 32px; height: 32px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: white; font-weight: bold; font-size: 12px;
          line-height: 1;
        ">${incidentCount}</span>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export default function DangerMapView({ center = [17.3850, 78.4867], sites = [], onReportIncident }) {
  const { worker } = useWorker();
  const defaultCenter = center[0] && center[1] ? center : [17.3850, 78.4867];

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-border-custom bg-surface relative z-10">
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

        {/* Current user marker */}
        {center[0] && center[1] && (
          <Marker position={defaultCenter}>
            <Popup>
              <div className="text-xs font-semibold text-text-primary">
                📍 {t('map.nearMe', worker.language)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Custom danger sites */}
        {sites.map(site => {
          if (!site.latitude || !site.longitude) return null;
          return (
            <Marker
              key={site.id}
              position={[site.latitude, site.longitude]}
              icon={createDangerIcon(site.incidentCount || 0)}
            >
              <Popup>
                <div className="p-2 space-y-2 text-text-primary text-xs min-w-[180px]">
                  <div className="flex items-center justify-between border-b border-border-custom pb-1.5">
                    <span className="font-bold text-accent">
                      {site.siteType ? t(`check.${site.siteType}`, worker.language) : 'Confined Entry'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      site.riskLevel === 'high' ? 'bg-danger/20 text-danger' :
                      site.riskLevel === 'medium' ? 'bg-warning/20 text-warning' :
                      'bg-safe/20 text-safe'
                    }`}>
                      {(site.riskLevel || 'unknown').toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted">Incidents:</span>
                      <span className="font-semibold">{site.incidentCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Last cleaned:</span>
                      <span className="font-semibold">
                        {site.lastCleaned ? t(`check.${site.lastCleaned.replace('<', 'shallow').replace('>', 'deep')}`, worker.language) : 'Unknown'}
                      </span>
                    </div>
                    {site.lastReported && (
                      <div className="flex justify-between">
                        <span className="text-muted">Reported:</span>
                        <span className="font-semibold">{site.lastReported}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted">Gear Provided:</span>
                      <span className="font-semibold text-danger">Never (3/3)</span>
                    </div>
                  </div>

                  {onReportIncident && (
                    <button
                      onClick={() => onReportIncident(site.id)}
                      className="w-full mt-2 py-1.5 bg-danger/20 border border-danger/40 text-danger hover:bg-danger hover:text-white rounded-lg font-semibold text-[10px] transition-colors"
                    >
                      + Report Incident at this site
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
