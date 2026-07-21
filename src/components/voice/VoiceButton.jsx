import { useWorker } from '../../context/WorkerContext';
import { t } from '../../lib/i18n';

export default function VoiceButton({ onResult, listening = false, startListening, stopListening, promptText }) {
  const { worker } = useWorker();

  const handleToggle = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleToggle}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
          listening
            ? 'bg-accent text-white animate-mic-pulse scale-105 shadow-lg shadow-accent/50'
            : 'bg-surface border border-border-custom text-muted hover:border-accent hover:text-text-primary'
        }`}
      >
        <span className="text-2xl">{listening ? '🛑' : '🎙️'}</span>
      </button>
      <span className="text-xs text-muted font-medium">
        {listening ? (promptText || 'Listening...') : t('check.speakOrType', worker.language)}
      </span>
    </div>
  );
}
