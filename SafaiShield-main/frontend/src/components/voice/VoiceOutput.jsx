import { useState } from 'react';
import { useWorker } from '../../context/WorkerContext';
import { useVoice } from '../../hooks/useVoice';

export default function VoiceOutput({ text }) {
  const { worker } = useWorker();
  const { speak, stopSpeaking } = useVoice(worker.language);
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      speak(text);
      setSpeaking(true);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSpeak}
      className={`p-2 rounded-lg transition-colors ${
        speaking ? 'bg-danger/20 text-danger' : 'bg-surface text-muted hover:text-text-primary border border-border-custom'
      }`}
      title="Speak text aloud"
    >
      <span className="text-sm font-semibold flex items-center gap-1.5">
        <span>{speaking ? '⏹️' : '🔊'}</span>
        <span>Listen</span>
      </span>
    </button>
  );
}
