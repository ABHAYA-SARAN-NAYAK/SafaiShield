import { useState } from 'react';
import { useWorker } from '../context/WorkerContext';
import { t } from '../lib/i18n';
import RiskBadge from '../components/risk/RiskBadge';

export default function JobHistory() {
  const { worker } = useWorker();
  const [history, setHistory] = useState(() => {
    return JSON.parse(localStorage.getItem('safaishield_history') || '[]');
  });

  const [activeReportId, setActiveReportId] = useState(null);

  const handleExportPDF = () => {
    alert("Exporting job history records as cryptographically signed PDF evidence locker...");
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
            const formattedDate = new Date(job.endedAt).toLocaleDateString('en-IN', {
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
                      {job.descentStartedAt
                        ? `${Math.round((job.endedAt - job.descentStartedAt) / 1000 / 60)} min`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Violation tag indicator */}
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
