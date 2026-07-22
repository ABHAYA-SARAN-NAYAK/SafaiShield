import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../context/WorkerContext';
import { useSession } from '../context/SessionContext';
import { useAlert } from '../context/AlertContext';
import { useTimer } from '../hooks/useTimer';
import { useVoiceCheckIn } from '../hooks/useVoiceCheckIn';
import { t } from '../lib/i18n';
import DescentTimer from '../components/guardian/DescentTimer';
import DeadManSwitch from '../components/guardian/DeadManSwitch';
import SafetyWindow from '../components/guardian/SafetyWindow';
import AlarmTrigger from '../components/guardian/AlarmTrigger';
import BigButton from '../components/shared/BigButton';
import { apiCall } from '../lib/api';

export default function DescentGuardian() {
  const { worker } = useWorker();
  const { session, updateSession, startDescent, addPing, endSession } = useSession();
  const { triggerAlarm } = useAlert();
  const navigate = useNavigate();

  const [emergencyActive, setEmergencyActive] = useState(false);
  const [buddyCode, setBuddyCode] = useState('');
  const [companionVerified, setCompanionVerified] = useState(session.companionVerified);

  const handleTriggerEmergency = useCallback(() => {
    setEmergencyActive(true);
    const emergencyPhone = worker.emergencyContactTelegram || worker.phone || '';
    triggerAlarm(
      `🚨 SAFAISHIELD AUTO-ALARM: ${worker.name || 'Worker'} missed safety check-in / requested help at ${session.siteType || 'manhole'}. Location: ${session.latitude?.toFixed(4) || '17.3850'}°N, ${session.longitude?.toFixed(4) || '78.4867'}°E.`,
      { lat: session.latitude || 17.3850, lng: session.longitude || 78.4867 },
      emergencyPhone
    );
  }, [worker.name, worker.emergencyContactTelegram, worker.phone, session, triggerAlarm]);

  const timer = useTimer({
    intervalSeconds: 90,
    graceSeconds: 10,
    onMiss: () => {
      handleTriggerEmergency();
    },
    onWarning: () => {
      if (window.navigator.vibrate) {
        window.navigator.vibrate([300, 100, 300]);
      }
      voiceCheckIn.startVoiceCheckInPrompt();
    },
  });

  const voiceCheckIn = useVoiceCheckIn({
    language: worker.language,
    onSafeConfirmed: () => {
      timer.confirm('voice_ok');
      timer.resetMissedCount();
      addPing();
    },
    onEmergencyTriggered: () => {
      timer.emergencyTriggered();
      handleTriggerEmergency();
    },
    onTimeout: () => {
      timer.incrementMissed();
    },
  });

  useEffect(() => {
    if (!session.descentActive) {
      startDescent();
    }

    if (navigator.onLine && worker.deviceId && session.localId) {
      apiCall('/api/companion/session', {
        method: 'POST',
        body: JSON.stringify({
          device_id: worker.deviceId,
          job_id: session.localId,
          companion_name: 'Surface Buddy',
        }),
      })
        .then((res) => {
          if (res && res.code) setBuddyCode(res.code);
        })
        .catch(() => {
          const fallbackCode = 'SW-' + Math.floor(100000 + Math.random() * 900000);
          setBuddyCode(fallbackCode);
        });
    } else {
      const fallbackCode = 'SW-' + Math.floor(100000 + Math.random() * 900000);
      setBuddyCode(fallbackCode);
    }
  }, [session.descentActive, startDescent, worker.deviceId, session.localId]);

  useEffect(() => {
    if (!buddyCode || companionVerified || !navigator.onLine) return;
    if (buddyCode.startsWith('SW-') && buddyCode.length > 8) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiCall(`/api/companion/verify/${buddyCode}`);
        if (res && res.verified) {
          setCompanionVerified(true);
          updateSession({ companionVerified: true });
          clearInterval(interval);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [buddyCode, companionVerified, session]);

  const handlePingConfirm = () => {
    voiceCheckIn.stopVoiceCheckIn();
    timer.confirm('tap');
    addPing();
  };

  const handleVerifyBuddy = () => {
    setCompanionVerified(true);
    updateSession({ companionVerified: true });
  };

  const handleExitedSafely = () => {
    voiceCheckIn.stopVoiceCheckIn();
    timer.reset();
    endSession();
    navigate('/report');
  };

  const pingLabel = (type) => {
    switch (type) {
      case 'voice_ok': return '🎤 Voice: OK';
      case 'voice_distress': return '🚨 Voice: DISTRESS';
      case 'voice_timeout': return '⏰ Voice: No response';
      case 'tap': return '👆 Tap: OK';
      default: return '✅ OK';
    }
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

      {emergencyActive ? (
        <AlarmTrigger
          coords={{ lat: session.latitude || 17.3850, lng: session.longitude || 78.4867 }}
          onResolve={() => setEmergencyActive(false)}
        />
      ) : (
        <>
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

          {/* Voice Check-in Prompt Banner */}
          {(voiceCheckIn.isPrompting || voiceCheckIn.isListening) && (
            <div className={`card bg-accent/10 border-2 border-accent/40 p-4 text-center space-y-2 ${
              voiceCheckIn.isListening ? 'animate-pulse-slow' : ''
            }`}>
              <div className="flex items-center justify-center gap-2 text-accent font-bold text-xs uppercase tracking-wider">
                <span className={`text-lg ${voiceCheckIn.isListening ? 'animate-ping' : ''}`}>🎙️</span>
                <span>
                  {voiceCheckIn.isPrompting
                    ? 'Asking Worker Status...'
                    : 'Listening for response...'}
                </span>
              </div>
              <p className="text-sm font-semibold text-text-primary">
                {voiceCheckIn.isPrompting
                  ? 'Speaking aloud...'
                  : 'Say "YES", "OKAY", "HAAN", "AVUNU" to confirm.'}
              </p>
              {voiceCheckIn.lastSpeech && (
                <p className="text-xs font-mono text-accent">
                  Recognized: "{voiceCheckIn.lastSpeech}"
                </p>
              )}
            </div>
          )}

          {/* Pulsing red ring when listening */}
          {voiceCheckIn.isListening && (
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-danger animate-ping opacity-50" />
            </div>
          )}

          <div className="card text-center space-y-4">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
              {t('guardian.undergroundSince', worker.language)}
            </h2>
            <DescentTimer elapsed={timer.elapsed} status={timer.status} />
          </div>

          <SafetyWindow
            elapsed={timer.elapsed}
            maxMinutes={session.safeWindowMinutes || 12}
          />

          {/* Dead man switch */}
          <div className="flex justify-center py-4">
            <DeadManSwitch
              timeToNextPing={timer.timeToNextPing}
              intervalSeconds={90}
              status={timer.status}
              isGracePeriod={timer.isGracePeriod}
              isListening={voiceCheckIn.isListening}
              warningMessage={voiceCheckIn.warningMessage}
              flashGreen={voiceCheckIn.flashGreen}
              onConfirm={handlePingConfirm}
            />
          </div>

          {/* I AM OKAY fallback button during voice window */}
          {(voiceCheckIn.isListening || voiceCheckIn.isPrompting) && (
            <div className="flex justify-center">
              <button
                onClick={handlePingConfirm}
                className="w-full h-16 bg-safe text-white font-extrabold text-xl rounded-2xl shadow-lg shadow-safe/30 hover:bg-green-600 transition-all active:scale-[0.97]"
              >
                👆 I AM OKAY
              </button>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={voiceCheckIn.startVoiceCheckInPrompt}
              className="text-[11px] font-semibold text-accent underline hover:text-accent/80"
            >
              🔊 Test Voice Check-in Prompt Now
            </button>
          </div>

          {/* Live Ping history tracker */}
          {timer.pingHistory.length > 0 && (
            <div className="card space-y-2">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                {t('guardian.pingHistory', worker.language)}
              </h3>
              <div className="max-h-24 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
                {timer.pingHistory.map((ping, index) => {
                  const isSafe = ping.type === 'tap' || ping.type === 'voice_ok';
                  const isDistress = ping.type === 'voice_distress';
                  const isTimeout = ping.type === 'voice_timeout';
                  return (
                    <div key={index} className={`flex justify-between ${
                      isDistress ? 'text-danger' : isTimeout ? 'text-warning' : 'text-safe'
                    }`}>
                      <span>{pingLabel(ping.type)}</span>
                      <span>{ping.elapsed}s</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-4">
            <BigButton
              variant="safe"
              onClick={handleExitedSafely}
              icon="✓"
            >
              {t('guardian.workerExited', worker.language)}
            </BigButton>

            <AlarmTrigger
              coords={{ lat: session.latitude || 17.3850, lng: session.longitude || 78.4867 }}
              onResolve={() => setEmergencyActive(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
