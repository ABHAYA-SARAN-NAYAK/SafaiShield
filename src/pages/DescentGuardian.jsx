import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../context/WorkerContext';
import { useSession } from '../context/SessionContext';
import { useAlert } from '../context/AlertContext';
import { useTimer } from '../hooks/useTimer';
import { t } from '../lib/i18n';
import DescentTimer from '../components/guardian/DescentTimer';
import DeadManSwitch from '../components/guardian/DeadManSwitch';
import SafetyWindow from '../components/guardian/SafetyWindow';
import AlarmTrigger from '../components/guardian/AlarmTrigger';
import BigButton from '../components/shared/BigButton';

export default function DescentGuardian() {
  const { worker } = useWorker();
  const { session, startDescent, addPing, endSession } = useSession();
  const { triggerAlarm } = useAlert();
  const navigate = useNavigate();

  const [emergencyActive, setEmergencyActive] = useState(false);
  const [buddyCode, setBuddyCode] = useState('');
  const [companionVerified, setCompanionVerified] = useState(session.companionVerified);

  // Setup dead man's switch interval values
  const timer = useTimer({
    intervalSeconds: 90,
    graceSeconds: 15,
    onMiss: () => {
      // Trigger Siren and send Telegram alert
      setEmergencyActive(true);
      triggerAlarm(
        `🚨 SAFAISHIELD AUTO-ALARM: ${worker.name || 'Worker'} missed safety ping at ${session.siteType || 'manhole'}. Last location: ${session.latitude?.toFixed(4)}°N, ${session.longitude?.toFixed(4)}°E.`,
        { lat: session.latitude, lng: session.longitude }
      );
    },
    onWarning: () => {
      // Warning beep/vibration check
      if (window.navigator.vibrate) {
        window.navigator.vibrate([300, 100, 300]);
      }
      playLoudBeep();
    },
  });

  // Start Descent on Mount
  useEffect(() => {
    if (!session.descentActive) {
      startDescent();
      // Generate randomized 6-digit Buddy Verification Code
      const code = 'SW-' + Math.floor(100000 + Math.random() * 900000);
      setBuddyCode(code);
    }
  }, [session.descentActive, startDescent]);

  const playLoudBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 500);
    } catch {}
  };

  const handlePingConfirm = () => {
    timer.confirm();
    addPing();
  };

  const handleVerifyBuddy = () => {
    setCompanionVerified(true);
    // Sync companion verified status
    session.companionVerified = true;
  };

  const handleExitedSafely = () => {
    timer.reset();
    // Complete session and write job log
    endSession();
    navigate('/report');
  };

  return (
    <div className="page max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <h1 className="text-base font-bold text-text-primary uppercase tracking-wider">
          🛡️ {t('guardian.title', worker.language)}
        </h1>
        {companionVerified ? (
          <span className="badge-safe text-[10px] font-bold">
            ✅ {t('guardian.buddyVerified', worker.language)}
          </span>
        ) : (
          <span className="badge-danger text-[10px] font-bold">
            ⚠️ {t('guardian.noBuddy', worker.language)}
          </span>
        )}
      </div>

      {/* Emergency trigger layout */}
      {emergencyActive ? (
        <AlarmTrigger
          coords={{ lat: session.latitude, lng: session.longitude }}
          onResolve={() => setEmergencyActive(false)}
        />
      ) : (
        <>
          {/* Buddy Verification code request (Feature A) */}
          {!companionVerified && (
            <div className="card border-l-4 border-l-warning bg-warning/5 space-y-3">
              <h2 className="text-xs font-bold text-warning uppercase tracking-wider">
                {t('guardian.buddyVerify', worker.language)}
              </h2>
              <p className="text-xs text-muted">
                {t('guardian.noBuddyWarning', worker.language)}
              </p>
              <div className="flex items-center gap-3">
                <div className="bg-night border border-border-custom font-mono text-center font-bold px-4 py-2.5 rounded-xl text-lg flex-1">
                  {buddyCode}
                </div>
                <button
                  onClick={handleVerifyBuddy}
                  className="h-12 px-5 bg-warning text-night hover:bg-amber-500 rounded-xl font-bold text-xs"
                >
                  Confirm Buddy
                </button>
              </div>
            </div>
          )}

          {/* Descent Timers */}
          <div className="card text-center space-y-4">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
              {t('guardian.undergroundSince', worker.language)}
            </h2>
            <DescentTimer elapsed={timer.elapsed} status={timer.status} />
          </div>

          {/* Safety Window Progress Graph */}
          <SafetyWindow
            elapsed={timer.elapsed}
            maxMinutes={session.safeWindowMinutes || 12}
          />

          {/* Dead man switch confirmation button */}
          <div className="flex justify-center py-4">
            <DeadManSwitch
              timeToNextPing={timer.timeToNextPing}
              intervalSeconds={90}
              status={timer.status}
              isGracePeriod={timer.isGracePeriod}
              onConfirm={handlePingConfirm}
            />
          </div>

          {/* Live Ping history tracker */}
          {timer.pingHistory.length > 0 && (
            <div className="card space-y-2">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                {t('guardian.pingHistory', worker.language)}
              </h3>
              <div className="max-h-24 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
                {timer.pingHistory.map((ping, index) => (
                  <div key={index} className="flex justify-between text-safe">
                    <span>✅ OK Check-in</span>
                    <span>{ping.elapsed}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct CTA options */}
          <div className="space-y-3 pt-4">
            <BigButton
              variant="safe"
              onClick={handleExitedSafely}
              icon="✓"
            >
              {t('guardian.workerExited', worker.language)}
            </BigButton>

            <AlarmTrigger
              coords={{ lat: session.latitude, lng: session.longitude }}
              onResolve={() => setEmergencyActive(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
