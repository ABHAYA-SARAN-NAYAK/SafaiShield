import { useWorker } from '../../context/WorkerContext';
import { t } from '../../lib/i18n';
import { useVoice } from '../../hooks/useVoice';
import { useState, useEffect } from 'react';

export default function ReportCard({ reportText, evidenceHash }) {
  const { worker } = useWorker();
  const { speak, listening, stopSpeaking } = useVoice(worker.language);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      speak(reportText);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return (
    <div className="card border border-border-custom space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted tracking-wider uppercase">
          {t('rights.yourReport', worker.language)}
        </h3>
        <button
          onClick={handleSpeak}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isPlaying ? 'bg-danger/20 text-danger border border-danger/30' : 'bg-accent/20 text-accent border border-accent/30'
          }`}
        >
          <span>{isPlaying ? '⏹️' : '🔊'}</span>
          <span>{isPlaying ? 'Stop' : t('rights.tapToHear', worker.language)}</span>
        </button>
      </div>

      <div className="bg-night border border-border-custom rounded-xl p-4 font-mono text-xs text-text-primary whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
        {reportText}
      </div>

      {evidenceHash && (
        <div className="bg-surface/50 border border-border-custom rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-safe font-semibold text-[10px]">
            <span>🛡️ EVIDENCE SECURED</span>
          </div>
          <p className="text-[10px] text-muted font-mono break-all leading-tight">
            SHA-256 Hash: {evidenceHash}
          </p>
          <p className="text-[9px] text-muted italic">
            This digital signature validates the date, location and safety conditions of this report.
          </p>
        </div>
      )}
    </div>
  );
}
