import { useState, useEffect } from 'react';
import { useWorker } from '../context/WorkerContext';
import { t } from '../lib/i18n';
import RiskBadge from '../components/risk/RiskBadge';
import { apiCall } from '../lib/api';
import { downloadReportPDF } from '../lib/pdfExporter';

const INITIAL_JOB_HISTORY = [
  {
    checkCompletedAt: Date.now() - 2 * 24 * 3600 * 1000,
    descentStartedAt: Date.now() - 2 * 24 * 3600 * 1000,
    endedAt: Date.now() - 2 * 24 * 3600 * 1000 + 15 * 60 * 1000,
    siteType: 'septic',
    riskLevel: 'high',
    riskScore: 82,
    gearProvided: 'no',
    hasViolations: true,
    reportText: 'SAFAISHIELD RIGHTS REPORT\nDate: 19 July 2026\nSite: Septic Tank\nRisk Level: HIGH\n\n⚠️ VIOLATIONS FOUND:\n1. Worker was directed to enter without protective gear.\n\n📋 YOUR LEGAL RIGHTS:\n1. Section 7, Manual Scavengers Act 2013: Employing any person without protective gear is ILLEGAL.',
  },
  {
    checkCompletedAt: Date.now() - 5 * 24 * 3600 * 1000,
    descentStartedAt: Date.now() - 5 * 24 * 3600 * 1000,
    endedAt: Date.now() - 5 * 24 * 3600 * 1000 + 10 * 60 * 1000,
    siteType: 'sewer',
    riskLevel: 'medium',
    riskScore: 55,
    gearProvided: 'yes',
    hasViolations: false,
    reportText: 'SAFAISHIELD RIGHTS REPORT\nDate: 16 July 2026\nSite: Sewer Manhole\nRisk Level: MEDIUM\n\n✅ No violations detected for this job. Safety equipment was verified prior to entry.',
  },
];

const loadLocalHistory = () => {
  try {
    const saved = localStorage.getItem('safaishield_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return INITIAL_JOB_HISTORY;
  } catch {
    return INITIAL_JOB_HISTORY;
  }
};

export default function JobHistory() {
  const { worker } = useWorker();
  const [history, setHistory] = useState(loadLocalHistory);
  const [loading, setLoading] = useState(true);
  const [activeReportId, setActiveReportId] = useState(null);

  const fetchAndSyncHistory = async () => {
    setLoading(true);
    let localHistory = loadLocalHistory();
    setHistory(localHistory);

    if (navigator.onLine && worker.deviceId) {
      try {
        if (localHistory.length > 0) {
          const formattedJobs = localHistory.map((job) => {
            const siteMap = { septic: 'septic_tank', ewaste: 'ewaste_pit', sewer: 'sewer', drain: 'sewer' };
            
            let lastCleanedDate = null;
            if (job.lastCleaned === '<1week') {
              lastCleanedDate = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0];
            } else if (job.lastCleaned === '1-4weeks') {
              lastCleanedDate = new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString().split('T')[0];
            } else if (job.lastCleaned === '1-6months') {
              lastCleanedDate = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().split('T')[0];
            } else if (job.lastCleaned === '>6months') {
              lastCleanedDate = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString().split('T')[0];
            }

            return {
              local_id: job.checkCompletedAt ? job.checkCompletedAt.toString() : Date.now().toString(),
              device_id: worker.deviceId,
              site_type: siteMap[job.siteType] || 'sewer',
              last_cleaned_date: lastCleanedDate,
              risk_tier: (job.riskLevel || 'medium').toUpperCase(),
              risk_reason: job.reportText || job.riskDetails || '',
              started_at: new Date(job.descentStartedAt || job.checkCompletedAt || Date.now()).toISOString(),
              ended_at: new Date(job.endedAt || Date.now()).toISOString(),
              gear_confirmed: job.gearProvided === 'yes' || job.gearProvided === 'full',
              employer_name: job.employer || null,
              language: worker.language || 'en',
              lat: job.latitude || null,
              lng: job.longitude || null,
              evidence_hash: job.reportHash || job.evidenceHash || null,
            };
          });

          await apiCall('/api/jobs/sync', {
            method: 'POST',
            body: JSON.stringify({ jobs: formattedJobs }),
          });
        }

        const serverHistory = await apiCall(`/api/jobs/history?device_id=${worker.deviceId}`);
        if (Array.isArray(serverHistory) && serverHistory.length > 0) {
          const mapped = serverHistory.map((h) => {
            const siteMapReverse = { septic_tank: 'septic', ewaste_pit: 'ewaste', sewer: 'sewer' };
            return {
              checkCompletedAt: new Date(h.started_at).getTime(),
              siteType: siteMapReverse[h.site_type] || 'sewer',
              endedAt: new Date(h.ended_at || h.started_at).getTime(),
              descentStartedAt: new Date(h.started_at).getTime(),
              riskLevel: (h.risk_tier || 'medium').toLowerCase(),
              riskScore: h.risk_tier === 'HIGH' ? 85 : h.risk_tier === 'MEDIUM' ? 55 : 25,
              gearProvided: h.gear_confirmed ? 'yes' : 'no',
              hasViolations: !h.gear_confirmed,
              reportText: h.risk_reason || 'Job completed safely.',
            };
          });
          setHistory(mapped);
          localStorage.setItem('safaishield_history', JSON.stringify(mapped));
        } else {
          localStorage.setItem('safaishield_history', JSON.stringify(localHistory));
        }
      } catch (err) {
        console.error('Job sync/fetch failed:', err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAndSyncHistory();
  }, [worker.deviceId]);

  const handleExportPDF = () => {
    if (!history || history.length === 0) {
      alert("No logged job history available to export.");
      return;
    }

    const summaryText = history.map((j, i) => {
      const d = new Date(j.endedAt || j.checkCompletedAt).toLocaleDateString('en-IN');
      return `JOB RECORD #${i + 1}\nDate: ${d}\nSite Type: ${j.siteType}\nRisk Level: ${(j.riskLevel || 'medium').toUpperCase()}\nGear Provided: ${j.gearProvided || 'no'}\nDetails: ${j.reportText || 'Safe exit'}\n----------------------------------------`;
    }).join('\n\n');

    downloadReportPDF({
      title: 'SafaiShield Consolidated Job History & Evidence Log',
      reportText: summaryText,
      workerName: worker.name,
    });
  };

  const gearLabels = {
    no: t('history.noGear', worker.language),
    partial: t('history.partialGear', worker.language),
    full: t('history.fullGear', worker.language),
  };

  return (
    <div className="page max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <div>
          <h1 className="text-base font-bold text-text-primary uppercase tracking-wider">
            📂 {t('history.title', worker.language)}
          </h1>
          <p className="text-xs text-muted mt-1">
            {history.length} {t('history.jobsLogged', worker.language)}
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20"
        >
          Export All
        </button>
      </div>

      {history.length === 0 ? (
        <div className="card text-center py-12 text-muted">
          <p className="text-sm">{t('history.noJobs', worker.language)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((job, idx) => {
            const formattedDate = new Date(job.endedAt || job.checkCompletedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isExpanded = activeReportId === job.checkCompletedAt;

            return (
              <div key={idx} className="card border border-border-custom space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {job.siteType ? t(`check.${job.siteType}`, worker.language) : 'Confined Space Entry'}
                    </h3>
                    <p className="text-[10px] text-muted mt-0.5">{formattedDate}</p>
                  </div>
                  <RiskBadge level={job.riskLevel || 'medium'} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-night p-2 rounded-lg border border-border-custom">
                  <div className="text-muted">
                    Gear: <span className="font-semibold text-text-primary">{gearLabels[job.gearProvided] || 'None'}</span>
                  </div>
                  <div className="text-muted text-right">
                    Duration:{' '}
                    <span className="font-semibold text-text-primary">
                      {job.descentStartedAt && job.endedAt
                        ? `${Math.max(1, Math.round((job.endedAt - job.descentStartedAt) / 1000 / 60))} min`
                        : '15 min'}
                    </span>
                  </div>
                </div>

                {job.hasViolations && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-danger/10 text-danger text-[10px] font-bold">
                    ⚠️ LAW VIOLATION DETECTED
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveReportId(isExpanded ? null : job.checkCompletedAt)}
                    className="flex-1 py-2 bg-surface hover:bg-slate-700 text-xs font-semibold text-text-primary rounded-xl border border-border-custom"
                  >
                    {isExpanded ? 'Hide Report' : t('history.viewReport', worker.language)}
                  </button>
                  <button
                    onClick={() => {
                      const shareText = encodeURIComponent(job.reportText || '');
                      window.open(`https://t.me/share/url?url=${shareText}`, '_blank');
                    }}
                    className="px-4 py-2 bg-surface hover:bg-slate-700 text-xs font-semibold text-text-primary rounded-xl border border-border-custom"
                  >
                    {t('history.share', worker.language)}
                  </button>
                </div>

                {isExpanded && job.reportText && (
                  <div className="mt-3 bg-night border border-border-custom rounded-xl p-3 font-mono text-[10px] text-muted whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {job.reportText}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
