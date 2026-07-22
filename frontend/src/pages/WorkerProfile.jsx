import { useState, useEffect } from 'react';
import { useWorker } from '../context/WorkerContext';
import { t } from '../lib/i18n';
import LanguagePicker from '../components/shared/LanguagePicker';
import BigButton from '../components/shared/BigButton';
import { apiCall } from '../lib/api';

export default function WorkerProfile() {
  const { worker, updateWorker } = useWorker();
  const [name, setName] = useState(worker.name || '');
  const [phone, setPhone] = useState(worker.phone || '');
  const [city, setCity] = useState(worker.city || '');
  const [emergencyContactName, setEmergencyContactName] = useState(worker.emergencyContactName || '');
  const [emergencyContactTelegram, setEmergencyContactTelegram] = useState(worker.emergencyContactTelegram || '');
  
  const [copiedCode, setCopiedCode] = useState(false);
  const [saved, setSaved] = useState(false);

  const [telegramCode, setTelegramCode] = useState(worker.telegramCode || '');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Fetch real linking code from backend if not linked
  useEffect(() => {
    if (!worker.telegramLinked && worker.deviceId) {
      apiCall('/api/telegram/generate-link-code', {
        method: 'POST',
        body: JSON.stringify({ device_id: worker.deviceId }),
      })
        .then((res) => {
          if (res && res.code) {
            setTelegramCode(res.code);
            updateWorker({ telegramCode: res.code });
          }
        })
        .catch((err) => console.error('Error generating link code:', err));
    }
  }, [worker.telegramLinked, worker.deviceId]);

  const handleSave = (e) => {
    e.preventDefault();
    updateWorker({
      name,
      phone,
      city,
      emergencyContactName,
      emergencyContactTelegram,
      setupComplete: true,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(telegramCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleConnectTelegram = () => {
    const botUser = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'SafaiShieldBot';
    window.open(`https://t.me/${botUser}?start=${telegramCode}`, '_blank');
  };

  const handleVerifyLink = async () => {
    if (!telegramCode || !worker.deviceId) return;
    setLinking(true);
    setLinkError('');
    try {
      const res = await apiCall('/api/telegram/link', {
        method: 'POST',
        body: JSON.stringify({
          device_id: worker.deviceId,
          link_code: telegramCode,
        }),
      });
      if (res && res.status === 'linked') {
        updateWorker({ telegramLinked: true });
      } else {
        setLinkError('Linking pending. Please send /start to the bot first.');
      }
    } catch (err) {
      setLinkError('Failed to verify connection. Make sure bot is started.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="page max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <h1 className="text-base font-bold text-text-primary uppercase tracking-wider">
          👤 {t('profile.title', worker.language)}
        </h1>
        {saved && (
          <span className="badge-safe text-[10px]">
            {t('profile.saved', worker.language)}
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic worker inputs */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted font-bold block">{t('profile.name', worker.language)}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="input-field"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted font-bold block">{t('profile.phone', worker.language)}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="input-field"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted font-bold block">{t('profile.city', worker.language)}</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Hyderabad"
              className="input-field"
              required
            />
          </div>
        </div>

        {/* Language selector selection grids */}
        <div className="space-y-2 border-t border-border-custom pt-4">
          <label className="text-xs text-muted font-bold block">{t('profile.language', worker.language)}</label>
          <LanguagePicker />
        </div>

        {/* Emergency contact handles */}
        <div className="space-y-4 border-t border-border-custom pt-4">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
            🚨 {t('profile.emergencyContact', worker.language)}
          </h2>

          <div className="space-y-1">
            <label className="text-xs text-muted font-bold block">{t('profile.contactName', worker.language)}</label>
            <input
              type="text"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              placeholder="e.g. Wife / Friend / NGO"
              className="input-field"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted font-bold block">{t('profile.contactTelegram', worker.language)}</label>
            <input
              type="text"
              value={emergencyContactTelegram}
              onChange={(e) => setEmergencyContactTelegram(e.target.value)}
              placeholder="e.g. @handle or phone number"
              className="input-field"
              required
            />
          </div>
        </div>

        {/* Telegram pairing sequence bot deep linking instructions (Feature A) */}
        <div className="space-y-4 border-t border-border-custom pt-4">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
            🤖 {t('profile.connectTelegram', worker.language)}
          </h2>

          <div className="bg-night border border-border-custom rounded-2xl p-4 space-y-3.5 text-xs text-muted leading-relaxed">
            <p>1. Open Telegram application on your phone.</p>
            <p>2. Search for <span className="text-accent font-semibold">@SafaiShieldBot</span> or click Connect below.</p>
            <p>3. Send command <span className="text-accent font-semibold">/start</span> to link bot.</p>
            <p>4. Send this pairing code to the bot: <span className="text-accent font-semibold">{telegramCode}</span></p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex-1 h-10 border border-border-custom rounded-xl font-bold hover:text-text-primary transition-colors bg-surface text-center"
              >
                {copiedCode ? 'Copied ✓' : t('profile.copyCode', worker.language)}
              </button>
              <button
                type="button"
                onClick={handleConnectTelegram}
                className="flex-1 h-10 bg-accent text-white font-bold rounded-xl transition-all hover:bg-blue-600"
              >
                Connect Bot
              </button>
            </div>

            {!worker.telegramLinked && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleVerifyLink}
                  disabled={linking}
                  className="w-full h-10 bg-surface border border-accent/35 text-accent font-bold rounded-xl transition-all hover:bg-accent/10 disabled:opacity-50"
                >
                  {linking ? 'Verifying...' : 'Verify Connection Link'}
                </button>
                {linkError && (
                  <p className="text-[10px] text-danger font-medium mt-1 text-center">{linkError}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${worker.telegramLinked ? 'bg-safe' : 'bg-muted'}`} />
            <span className="text-xs font-semibold text-text-primary">
              Status: {worker.telegramLinked ? t('profile.connected', worker.language) : t('profile.notConnected', worker.language)}
            </span>
          </div>
        </div>

        <BigButton variant="safe" type="submit" className="w-full">
          {t('profile.saveProfile', worker.language)}
        </BigButton>
      </form>
    </div>
  );
}
