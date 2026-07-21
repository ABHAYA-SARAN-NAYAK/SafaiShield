import { useState } from 'react';
import { useWorker } from '../../context/WorkerContext';
import { t } from '../../lib/i18n';
import BigButton from '../shared/BigButton';

export default function ShareReport({ reportText, onSave }) {
  const { worker } = useWorker();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (onSave) onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTelegramShare = () => {
    const textEncoded = encodeURIComponent(reportText);
    const botUser = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'SafaiShieldBot';
    const url = `https://t.me/${botUser}?start=report_${Date.now()}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Telegram Share Button */}
      <BigButton
        variant="accent"
        onClick={handleTelegramShare}
        icon="📱"
      >
        {t('rights.shareOnTelegram', worker.language)}
      </BigButton>

      <div className="grid grid-cols-2 gap-3">
        {/* Save to records */}
        <button
          onClick={handleSave}
          disabled={saved}
          className={`h-14 font-semibold text-sm border rounded-xl flex items-center justify-center gap-2 transition-colors ${
            saved
              ? 'bg-safe/20 border-safe text-safe'
              : 'bg-surface border-border-custom text-text-primary hover:border-accent'
          }`}
        >
          <span>{saved ? '✓' : '💾'}</span>
          <span>{saved ? t('rights.saved', worker.language) : t('rights.saveToRecords', worker.language)}</span>
        </button>

        {/* Copy text */}
        <button
          onClick={handleCopy}
          disabled={copied}
          className={`h-14 font-semibold text-sm border rounded-xl flex items-center justify-center gap-2 transition-colors ${
            copied
              ? 'bg-safe/20 border-safe text-safe'
              : 'bg-surface border-border-custom text-text-primary hover:border-accent'
          }`}
        >
          <span>{copied ? '✓' : '📋'}</span>
          <span>{copied ? t('rights.copied', worker.language) : t('rights.copyReport', worker.language)}</span>
        </button>
      </div>
    </div>
  );
}
