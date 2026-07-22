import { useState } from 'react';
import { useWorker } from '../context/WorkerContext';
import { t } from '../lib/i18n';

export default function AdminPanel() {
  const { worker } = useWorker();
  const [reports, setReports] = useState(() => {
    // Collect all job logs marked with violations
    const history = JSON.parse(localStorage.getItem('safaishield_history') || '[]');
    const dangerSites = JSON.parse(localStorage.getItem('safaishield_danger_sites') || '[]');
    return [
      ...history.filter(x => x.hasViolations).map(x => ({
        id: x.checkCompletedAt || 'h1',
        siteType: x.siteType,
        latitude: x.latitude,
        longitude: x.longitude,
        incidentCount: 1,
        riskLevel: x.riskLevel,
        employer: x.employer || 'Unknown contractor',
        details: x.reportText || 'No details provided.',
        status: 'pending',
      })),
      ...dangerSites.map(x => ({
        id: x.id,
        siteType: x.siteType,
        latitude: x.latitude,
        longitude: x.longitude,
        incidentCount: x.incidentCount,
        riskLevel: x.riskLevel,
        employer: 'N/A (Anonymous community report)',
        details: 'High-risk site flagged directly by worker community.',
        status: 'approved',
      }))
    ];
  });

  const handleModerate = (id, newStatus) => {
    setReports(prev =>
      prev.map(rep =>
        rep.id === id ? { ...rep, status: newStatus } : rep
      )
    );
  };

  return (
    <div className="page max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <div>
          <h1 className="text-base font-bold text-text-primary uppercase tracking-wider">
            🛡️ Admin Panel
          </h1>
          <p className="text-xs text-muted mt-1">
            Moderating crowdsourced incident records
          </p>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
          Incident Moderation Queue
        </h2>

        {reports.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted">
            No pending safety violations to review.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((rep, idx) => (
              <div key={idx} className="bg-night border border-border-custom rounded-xl p-3.5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-text-primary block">
                      {rep.siteType ? t(`check.${rep.siteType}`, worker.language) : 'Confined Entry'}
                    </span>
                    <span className="text-[10px] text-muted block mt-0.5">
                      GPS: {rep.latitude?.toFixed(4)}, {rep.longitude?.toFixed(4)}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    rep.status === 'approved' ? 'bg-safe/25 text-safe' :
                    rep.status === 'rejected' ? 'bg-danger/25 text-danger' :
                    'bg-warning/25 text-warning animate-pulse'
                  }`}>
                    {rep.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1 text-[10px] leading-relaxed">
                  <p className="text-muted">
                    <span className="font-semibold text-text-primary">Employer:</span> {rep.employer}
                  </p>
                  <p className="text-muted">
                    <span className="font-semibold text-text-primary font-mono text-[9px]">Details:</span> {rep.details.slice(0, 100)}...
                  </p>
                </div>

                {rep.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleModerate(rep.id, 'approved')}
                      className="flex-1 py-1.5 bg-safe/20 hover:bg-safe text-white hover:text-night text-xs font-semibold rounded-lg border border-safe/30 transition-colors"
                    >
                      Approve & Add to Map
                    </button>
                    <button
                      onClick={() => handleModerate(rep.id, 'rejected')}
                      className="flex-1 py-1.5 bg-danger/20 hover:bg-danger text-white text-xs font-semibold rounded-lg border border-danger/30 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
