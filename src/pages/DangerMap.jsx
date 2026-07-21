import { useState, useEffect } from 'react';
import { useWorker } from '../context/WorkerContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { t } from '../lib/i18n';
import DangerMapView from '../components/map/DangerMapView';
import BigButton from '../components/shared/BigButton';

// Initial pre-loaded crowdsourced danger markers across Hyderabad region
const INITIAL_MAP_SITES = [
  {
    id: 's1',
    siteType: 'septic',
    latitude: 17.3850,
    longitude: 78.4867,
    incidentCount: 3,
    riskLevel: 'high',
    lastCleaned: '1-6months',
    lastReported: '3 days ago',
  },
  {
    id: 's2',
    siteType: 'sewer',
    latitude: 17.4060,
    longitude: 78.4710,
    incidentCount: 1,
    riskLevel: 'medium',
    lastCleaned: '1-4weeks',
    lastReported: '5 days ago',
  },
  {
    id: 's3',
    siteType: 'ewaste',
    latitude: 17.3620,
    longitude: 78.5020,
    incidentCount: 0,
    riskLevel: 'low',
    lastCleaned: '<1week',
    lastReported: '1 week ago',
  },
  {
    id: 's4',
    siteType: 'sewer',
    latitude: 17.4250,
    longitude: 78.4520,
    incidentCount: 2,
    riskLevel: 'high',
    lastCleaned: '>6months',
    lastReported: 'Today',
  },
];

export default function DangerMap() {
  const { worker } = useWorker();
  const { lat, lng, loading: geoLoading } = useGeolocation();
  const [sites, setSites] = useState(() => {
    const saved = localStorage.getItem('safaishield_danger_sites');
    return saved ? JSON.parse(saved) : INITIAL_MAP_SITES;
  });

  const [filterType, setFilterType] = useState('all');
  const [anonymousSuccess, setAnonymousSuccess] = useState(false);

  useEffect(() => {
    localStorage.setItem('safaishield_danger_sites', JSON.stringify(sites));
  }, [sites]);

  // Anonymous Community Incident Reporting (Feature C)
  const handleAnonymousReport = () => {
    if (!lat || !lng) {
      alert("GPS location required to file anonymous incident report.");
      return;
    }

    const newSite = {
      id: 'anon_' + Date.now(),
      siteType: 'sewer',
      latitude: lat + (Math.random() - 0.5) * 0.002, // slight jitter to protect anonymity
      longitude: lng + (Math.random() - 0.5) * 0.002,
      incidentCount: 1,
      riskLevel: 'high',
      lastCleaned: 'unknown',
      lastReported: 'Just now',
    };

    setSites(prev => [newSite, ...prev]);
    setAnonymousSuccess(true);
    setTimeout(() => setAnonymousSuccess(false), 3000);
  };

  const handleReportIncident = (siteId) => {
    setSites(prev =>
      prev.map(site =>
        site.id === siteId
          ? { ...site, incidentCount: (site.incidentCount || 0) + 1, lastReported: 'Just now', riskLevel: 'high' }
          : site
      )
    );
  };

  // Filter criteria
  const filteredSites = sites.filter(site => {
    if (filterType === 'all') return true;
    if (filterType === 'near_me') {
      if (!lat || !lng) return true;
      // Filter items within ~3km radius
      const dist = Math.abs(site.latitude - lat) + Math.abs(site.longitude - lng);
      return dist < 0.03;
    }
    return site.siteType === filterType;
  });

  return (
    <div className="page max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <h1 className="text-base font-bold text-text-primary uppercase tracking-wider">
          🗺️ {t('map.title', worker.language)}
        </h1>
        <span className="text-[10px] text-muted">
          GPS: {lat?.toFixed(4) || '...'}, {lng?.toFixed(4) || '...'}
        </span>
      </div>

      {/* Leaflet map view */}
      <DangerMapView
        center={lat && lng ? [lat, lng] : [17.3850, 78.4867]}
        sites={filteredSites}
        onReportIncident={handleReportIncident}
      />

      {/* Map filtering controls */}
      <div className="space-y-2">
        <span className="text-xs text-muted font-bold block">{t('map.filter', worker.language)}</span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: t('map.all', worker.language) },
            { id: 'sewer', label: t('check.sewer', worker.language) },
            { id: 'septic', label: t('check.septic', worker.language) },
            { id: 'near_me', label: t('map.nearMe', worker.language) },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilterType(opt.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border flex-shrink-0 transition-all ${
                filterType === opt.id
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-surface border-border-custom text-muted hover:text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Anonymous Report Action Banner (Feature C) */}
      <div className="card border border-danger/30 bg-danger/5 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-xs font-bold text-danger uppercase tracking-wider">
              {t('map.breakSilence', worker.language)}
            </h3>
            <p className="text-[10px] text-muted leading-relaxed">
              {t('map.breakSilenceSub', worker.language)}
            </p>
          </div>
        </div>

        {anonymousSuccess ? (
          <div className="bg-safe/10 border border-safe/30 text-safe text-center py-2.5 rounded-xl text-xs font-semibold">
            ✓ {t('map.reported', worker.language)}
          </div>
        ) : (
          <BigButton
            variant="danger"
            onClick={handleAnonymousReport}
            disabled={geoLoading}
          >
            🚨 Report Site Anonymously
          </BigButton>
        )}
      </div>
    </div>
  );
}
