import { Link, useNavigate } from 'react-router-dom';
import { useWorker } from '../context/WorkerContext';
import { useSession } from '../context/SessionContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWeather } from '../hooks/useWeather';
import { t } from '../lib/i18n';
import OfflineBanner from '../components/shared/OfflineBanner';
import BigButton from '../components/shared/BigButton';

export default function Home() {
  const { worker } = useWorker();
  const { session, startCheck } = useSession();
  const { lat, lng } = useGeolocation();
  const { temp, humidity, loading: weatherLoading } = useWeather(lat, lng);
  const navigate = useNavigate();

  // Get job history to compute last job summary
  const history = JSON.parse(localStorage.getItem('safaishield_history') || '[]');
  const lastJob = history[0];

  const daysSinceLastJob = lastJob
    ? Math.floor((Date.now() - new Date(lastJob.endedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleStartCheck = () => {
    startCheck();
    navigate('/check');
  };

  const isDescentAllowed = session.checkCompleted && (Date.now() - session.checkCompletedAt < 2 * 60 * 60 * 1000);

  return (
    <div className="page space-y-6 max-w-lg mx-auto">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {t('home.greeting', worker.language)}, {worker.name || 'Worker 👷'}
          </h1>
          <p className="text-xs text-muted mt-1">
            {daysSinceLastJob !== null
              ? `${t('home.lastJob', worker.language)}: ${daysSinceLastJob === 0 ? t('home.today', worker.language) : `${daysSinceLastJob} ${t('home.daysAgo', worker.language)}`}`
              : t('home.never', worker.language)}
          </p>
        </div>
        <OfflineBanner />
      </div>

      {/* Primary Safety Check CTA */}
      <div className="card border-l-4 border-l-danger bg-danger/5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🛡️</div>
          <div>
            <h2 className="text-base font-bold text-text-primary">
              {t('home.startCheck', worker.language)}
            </h2>
            <p className="text-xs text-muted mt-1">
              {t('home.startCheckSub', worker.language)}
            </p>
          </div>
        </div>
        <BigButton variant="danger" onClick={handleStartCheck}>
          {t('home.startCheck', worker.language)}
        </BigButton>
      </div>

      {/* Layer 2 & 3 Quick Access Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to={isDescentAllowed ? "/descend" : "#"}
          onClick={(e) => {
            if (!isDescentAllowed) {
              e.preventDefault();
              alert(t('home.noCheckWarning', worker.language));
            }
          }}
          className={`card flex flex-col justify-between h-28 text-left border ${
            isDescentAllowed
              ? 'border-safe/30 hover:border-safe bg-safe/5 text-safe'
              : 'border-border-custom opacity-50 cursor-not-allowed'
          }`}
        >
          <span className="text-2xl">⏱️</span>
          <div>
            <div className="font-bold text-sm text-text-primary">{t('home.descentGuardian', worker.language)}</div>
            <div className="text-[10px] text-muted mt-0.5">
              {isDescentAllowed ? 'Ready for descent' : 'Do check first'}
            </div>
          </div>
        </Link>

        <Link
          to="/report"
          className="card flex flex-col justify-between h-28 text-left border border-border-custom hover:border-accent bg-surface"
        >
          <span className="text-2xl">📋</span>
          <div>
            <div className="font-bold text-sm text-text-primary">{t('home.rightsAdvisor', worker.language)}</div>
            <div className="text-[10px] text-muted mt-0.5">Post-job legal aid</div>
          </div>
        </Link>
      </div>

      {/* Alerts / Info */}
      <div className="card space-y-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          {t('home.todayAlerts', worker.language)}
        </h3>

        <div className="space-y-2">
          {/* Temperature Warning */}
          {temp !== null && temp > 35 && (
            <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-xl text-warning">
              <span className="text-xl">🌡️</span>
              <div className="text-xs font-medium">
                {temp}°C — {t('home.heatWarning', worker.language)}
              </div>
            </div>
          )}

          {/* Location Safety History */}
          <div className="flex items-center gap-3 p-3 bg-accent/10 border border-accent/20 rounded-xl text-accent">
            <span className="text-xl">⚠️</span>
            <div className="text-xs font-medium">
              Danger map active in your current grid area.
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation Shortcuts */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <Link
          to="/history"
          className="py-3 px-4 bg-surface border border-border-custom rounded-xl text-xs font-semibold text-text-primary hover:border-accent transition-colors"
        >
          📂 {t('home.jobHistory', worker.language)}
        </Link>
        <Link
          to="/map"
          className="py-3 px-4 bg-surface border border-border-custom rounded-xl text-xs font-semibold text-text-primary hover:border-accent transition-colors"
        >
          🗺️ {t('home.dangerMap', worker.language)}
        </Link>
      </div>
    </div>
  );
}
