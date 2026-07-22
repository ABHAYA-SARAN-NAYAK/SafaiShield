import { useState } from 'react';
import { useWorker } from '../../context/WorkerContext';
import { t } from '../../lib/i18n';
import BigButton from '../shared/BigButton';
import { downloadReportPDF } from '../../lib/pdfExporter';

export default function ShareReport({ reportText, evidenceHash, onSave }) {
  const { worker } = useWorker();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleDownloadPDF = () => {
    downloadReportPDF({
      title: 'SafaiShield Worker Rights & Violation Report',
      reportText,
      evidenceHash,
      workerName: worker.name,
      employerName: worker.employer || '',
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    try {
      const history = JSON.parse(localStorage.getItem('safaishield_history') || '[]');
      const exists = history.some(h => h.reportText === reportText);
      if (!exists && reportText) {
        const newRecord = {
          checkCompletedAt: Date.now(),
          siteType: 'sewer',
          endedAt: Date.now(),
          riskLevel: 'high',
          riskScore: 80,
          gearProvided: 'no',
          hasViolations: true,
          reportText: reportText,
          evidenceHash: evidenceHash || '0x' + Math.random().toString(16).substring(2),
        };
        history.unshift(newRecord);
        localStorage.setItem('safaishield_history', JSON.stringify(history));
      }
    } catch (e) {
      console.error('Error saving to records:', e);
    }

    if (onSave) onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTelegramShare = () => {
    const botUser = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'SafaiShieldBot';
    const url = `https://t.me/${botUser}?start=report_${Date.now()}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Download PDF Button */}
      <BigButton
        variant="safe"
        onClick={handleDownloadPDF}
        icon="📄"
      >
        Download PDF Report
      </BigButton>

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
