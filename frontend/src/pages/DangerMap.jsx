import { useState, useEffect, useCallback } from 'react';
import { useWorker } from '../context/WorkerContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { t } from '../lib/i18n';
import DangerMapView from '../components/map/DangerMapView';
import IncidentReportModal from '../components/map/IncidentReportModal';
import BigButton from '../components/shared/BigButton';
import { apiCall } from '../lib/api';

const DEMO_HYDERABAD_SITES = [
  { id:'demo_sewer_1', siteType:'sewer', site_type:'sewer', latitude:17.3850, longitude:78.4867, riskLevel:'high', risk_level:'high', incidentCount:3, incident_count_30d:3, lastReported:'3 days ago', last_reported:'3 days ago', gear_provided:false, month_year:'2026-07' },
  { id:'demo_septic_1', siteType:'septic', site_type:'septic_tank', latitude:17.4060, longitude:78.4710, riskLevel:'medium', risk_level:'medium', incidentCount:2, incident_count_30d:2, lastReported:'5 days ago', last_reported:'5 days ago', gear_provided:true, month_year:'2026-07' },
  { id:'demo_ewaste_1', siteType:'ewaste', site_type:'ewaste_pit', latitude:17.3620, longitude:78.5020, riskLevel:'low', risk_level:'low', incidentCount:1, incident_count_30d:1, lastReported:'12 days ago', last_reported:'12 days ago', gear_provided:false, month_year:'2026-07' },
  { id:'demo_sewer_2', siteType:'sewer', site_type:'sewer', latitude:17.4250, longitude:78.4520, riskLevel:'high', risk_level:'high', incidentCount:4, incident_count_30d:4, lastReported:'Today', last_reported:'Today', gear_provided:false, month_year:'2026-07' },
];

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RISK_ORDER = { high: 3, medium: 2, low: 1 };

function mergeSites(sites) {
  const grid = {};
  sites.forEach(s => {
    const lat = s.latitude || s.lat || s.lat_rounded;
    const lng = s.longitude || s.lng || s.lng_rounded;
    const key = `${lat?.toFixed(2)},${lng?.toFixed(2)}`;
    if (!grid[key]) {
      grid[key] = { ...s, incidentCount: s.incidentCount || 1, incident_count_30d: s.incident_count_30d || s.incidentCount || 1 };
    } else {
      grid[key].incidentCount = (grid[key].incidentCount || 1) + (s.incidentCount || 1);
      grid[key].incident_count_30d = (grid[key].incident_count_30d || 1) + (s.incident_count_30d || s.incidentCount || 1);
      const currRisk = (grid[key].risk_level || grid[key].riskLevel || 'low').toLowerCase();
      const newRisk = (s.risk_level || s.riskLevel || 'low').toLowerCase();
      if (RISK_ORDER[newRisk] > RISK_ORDER[currRisk]) {
        grid[key].risk_level = newRisk;
        grid[key].riskLevel = newRisk;
      }
    }
  });
  return Object.values(grid);
}

export default function DangerMap() {
  const { worker } = useWorker();
  const { lat, lng, loading: geoLoading, error: geoError } = useGeolocation();
  const [sites, setSites] = useState(() => {
    const saved = localStorage.getItem('safaishield_danger_sites');
    return saved ? JSON.parse(saved) : DEMO_HYDERABAD_SITES;
  });
  const [filterType, setFilterType] = useState('all');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportInitialSite, setReportInitialSite] = useState(null);
  const [osmEnabled, setOsmEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [mergedSites, setMergedSites] = useState(() => mergeSites(
    JSON.parse(localStorage.getItem('safaishield_danger_sites') || 'null') || DEMO_HYDERABAD_SITES
  ));

  const mapBackendPoints = (points) => {
    const siteMapReverse = { septic_tank: 'septic', ewaste_pit: 'ewaste', sewer: 'sewer', drain: 'drain' };
    return points.map((p, idx) => ({
      id: p.id || `backend_${idx}`,
      siteType: siteMapReverse[p.site_type] || 'sewer',
      site_type: p.site_type || 'sewer',
      latitude: p.latitude || p.lat || p.lat_rounded,
      longitude: p.longitude || p.lng || p.lng_rounded,
      lat_rounded: p.lat_rounded,
      lng_rounded: p.lng_rounded,
      incidentCount: p.incident_count_30d ?? p.incident_count ?? p.incidentCount ?? 1,
      incident_count_30d: p.incident_count_30d ?? p.incident_count ?? p.incidentCount ?? 1,
      riskLevel: (p.risk_level || p.risk_tier || 'high').toLowerCase(),
      risk_level: (p.risk_level || p.risk_tier || 'high').toLowerCase(),
      lastReported: p.last_reported || p.month_year || 'Recent',
      last_reported: p.last_reported || p.month_year || 'Recent',
      gear_provided: p.gear_provided ?? p.gear_compliance ?? false,
      month_year: p.month_year || '2026-07',
    }));
  };

  useEffect(() => {
    const fetchMapPoints = async () => {
      try {
        let points = await apiCall('/api/map').catch(async () => {
          return await apiCall('/api/map/points');
        });
        if (Array.isArray(points) && points.length > 0) {
          const mapped = mapBackendPoints(points);
          setSites(mapped);
        } else {
          setSites(DEMO_HYDERABAD_SITES);
        }
      } catch {
        setSites(DEMO_HYDERABAD_SITES);
      }
    };
    fetchMapPoints();
  }, []);

  useEffect(() => {
    const merged = mergeSites(sites);
    setMergedSites(merged);
    localStorage.setItem('safaishield_danger_sites', JSON.stringify(sites));
  }, [sites]);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  const handleOpenReport = (site = null) => {
    setReportInitialSite(site);
    setReportModalOpen(true);
  };

  const handleReportSuccess = (reportData) => {
    const newSite = {
      id: 'report_' + Date.now(),
      siteType: reportData.site_type === 'septic_tank' ? 'septic' : reportData.site_type === 'ewaste_pit' ? 'ewaste' : 'sewer',
      site_type: reportData.site_type,
      latitude: reportData.lat,
      longitude: reportData.lng,
      incidentCount: 1, incident_count_30d: 1,
      riskLevel: 'high', risk_level: 'high',
      lastReported: 'Just now', last_reported: 'Just now',
      gear_provided: false, month_year: '2026-07',
    };
    setSites(prev => [newSite, ...prev]);
  };

  // Show toast when Near Me filter is selected but location is unavailable
  useEffect(() => {
    if (filterType === 'near_me' && (!lat || !lng) && geoError) {
      setToastMessage('Location permission needed for Near Me filter');
    }
  }, [filterType, lat, lng, geoError]);

  const filteredSites = mergedSites.filter(site => {
    if (filterType === 'all') return true;
    if (filterType === 'near_me') {
      if (!lat || !lng) {
        return false;
      }
      const siteLat = site.latitude || site.lat;
      const siteLng = site.longitude || site.lng;
      if (!siteLat || !siteLng) return false;
      const distance = haversineDistanceKm(lat, lng, siteLat, siteLng);
      return distance <= 2.0;
    }
    return site.siteType === filterType || site.site_type === filterType;
  });

  return (
    <div className="page max-w-lg mx-auto space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-warning/90 text-night font-bold px-4 py-2 rounded-xl text-xs shadow-lg animate-slide-up">
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <h1 className="text-base font-bold text-text-primary uppercase tracking-wider">
          🗺️ {t('map.title', worker.language)}
        </h1>
        <span className="text-[10px] text-muted">
          GPS: {lat?.toFixed(4) || '—'}, {lng?.toFixed(4) || '—'}
        </span>
      </div>

      <DangerMapView
        center={lat && lng ? [lat, lng] : [17.3850, 78.4867]}
        sites={filteredSites}
        osmEnabled={osmEnabled}
        onReportIncident={(site) => handleOpenReport(site)}
      />

      <div className="space-y-2">
        <span className="text-xs text-muted font-bold block">{t('map.filter', worker.language)}</span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: t('map.all', worker.language) },
            { id: 'near_me', label: '📍 Near Me (2 km)' },
            { id: 'sewer', label: t('check.sewer', worker.language) },
            { id: 'septic', label: t('check.septic', worker.language) },
            { id: 'ewaste', label: t('check.ewaste', worker.language) },
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
          <button
            onClick={() => setOsmEnabled(v => !v)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border flex-shrink-0 transition-all ${
              osmEnabled
                ? 'bg-accent/15 border-accent text-accent'
                : 'bg-surface border-border-custom text-muted hover:text-text-primary'
            }`}
          >
            {osmEnabled ? '✓ OSM Manholes' : 'Show OSM Manholes'}
          </button>
        </div>
      </div>

      <div className="card border border-danger/30 bg-danger/5 space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-xs font-bold text-danger uppercase tracking-wider">
              {t('map.breakSilence', worker.language)} / SOMEONE WAS HURT HERE
            </h3>
            <p className="text-[10px] text-muted leading-relaxed">
              Report toxic sites or unsafe conditions anonymously to protect fellow sanitation workers.
            </p>
          </div>
        </div>
        <BigButton variant="danger" onClick={() => handleOpenReport(null)} disabled={geoLoading}>
          🚨 Report Site Anonymously
        </BigButton>
      </div>

      <IncidentReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        initialCoords={{ lat: reportInitialSite?.latitude || lat || 17.3850, lng: reportInitialSite?.longitude || lng || 78.4867 }}
        initialSiteType={reportInitialSite?.siteType || 'sewer'}
        onSuccess={handleReportSuccess}
      />
    </div>
  );
}
