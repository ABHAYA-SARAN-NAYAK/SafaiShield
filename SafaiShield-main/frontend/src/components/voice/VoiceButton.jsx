import { useWorker } from '../../context/WorkerContext';
import { t } from '../../lib/i18n';

export default function VoiceButton({
  onResult,
  listening = false,
  startListening,
  stopListening,
  promptText,
  interimTranscript = '',
  transcript = '',
  parsedFields = null,
  onConfirmParsed,
}) {
  const { worker } = useWorker();

  const handleToggle = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const hasConfirmation = parsedFields && Object.values(parsedFields).some(v => v !== null && v !== undefined);

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

      {/* Live interim transcript feedback */}
      {listening && interimTranscript && (
        <p className="text-[11px] font-mono text-accent bg-night/60 p-1.5 rounded max-w-full break-words text-center">
          "{interimTranscript}"
        </p>
      )}

      {/* Final transcript after listening stops */}
      {!listening && transcript && !hasConfirmation && (
        <p className="text-[11px] font-mono text-accent bg-night/60 p-1.5 rounded max-w-full break-words text-center">
          "{transcript}"
        </p>
      )}

      {/* Parsed confirmation bar */}
      {hasConfirmation && (
        <div className="flex flex-col gap-2 w-full">
          <div className="bg-safe/10 border border-safe/30 rounded-xl p-3 text-center">
            <p className="text-xs font-bold text-safe mb-1">✅ I heard:</p>
            <ul className="text-[11px] text-text-primary space-y-0.5">
              {parsedFields.site_type && <li>Site: <span className="font-semibold">{parsedFields.site_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></li>}
              {parsedFields.last_cleaned && <li>Last cleaned: <span className="font-semibold">{parsedFields.last_cleaned}</span></li>}
              {parsedFields.recent_rain !== null && parsedFields.recent_rain !== undefined && <li>Rain/Flood: <span className="font-semibold">{parsedFields.recent_rain ? 'Yes' : 'No'}</span></li>}
              {parsedFields.depth_feet && <li>Depth: <span className="font-semibold">{parsedFields.depth_feet} feet</span></li>}
              {parsedFields.has_ventilation !== null && parsedFields.has_ventilation !== undefined && <li>Ventilation: <span className="font-semibold">{parsedFields.has_ventilation ? 'Yes' : 'No'}</span></li>}
              {parsedFields.has_gas_detector !== null && parsedFields.has_gas_detector !== undefined && <li>Gas detector: <span className="font-semibold">{parsedFields.has_gas_detector ? 'Yes' : 'No'}</span></li>}
            </ul>
          </div>
          {onConfirmParsed && (
            <button
              onClick={onConfirmParsed}
              className="w-full py-2.5 bg-safe text-white rounded-xl font-bold text-xs hover:bg-green-600 transition-all"
            >
              ✓ Correct — Fill Form
            </button>
          )}
        </div>
      )}
    </div>
  );
}
