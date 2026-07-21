import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../context/WorkerContext';
import { useSession } from '../context/SessionContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWeather } from '../hooks/useWeather';
import { useVoice } from '../hooks/useVoice';
import { useOfflineAI } from '../hooks/useOfflineAI';
import { geminiRiskAssess } from '../lib/gemini';
import { t } from '../lib/i18n';
import BigButton from '../components/shared/BigButton';
import VoiceButton from '../components/voice/VoiceButton';
import RiskMeter from '../components/risk/RiskMeter';
import ChecklistCard from '../components/risk/ChecklistCard';

export default function PreEntryCheck() {
  const { worker } = useWorker();
  const { session, updateSession, completeCheck } = useSession();
  const { lat, lng } = useGeolocation();
  const { temp, humidity } = useWeather(lat, lng);
  const { predict } = useOfflineAI();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Setup Voice Interface
  const { transcript, listening, startListening, stopListening, speak } = useVoice(worker.language);

  // Sync GPS Coordinates
  useEffect(() => {
    if (lat && lng) {
      updateSession({ latitude: lat, longitude: lng });
    }
  }, [lat, lng, updateSession]);

  // Sync Weather Conditions
  useEffect(() => {
    if (temp && humidity) {
      updateSession({ temperature: temp, humidity: humidity });
    }
  }, [temp, humidity, updateSession]);

  // Handle Voice Control Input
  useEffect(() => {
    if (!transcript) return;
    const lower = transcript.toLowerCase();
    
    // Voice selection matching words
    if (lower.includes('sewer') || lower.includes('सीवर') || lower.includes('మురుగు')) {
      updateSession({ siteType: 'sewer' });
    } else if (lower.includes('septic') || lower.includes('सेप्टिक') || lower.includes('ట్యాంక్')) {
      updateSession({ siteType: 'septic' });
    } else if (lower.includes('waste') || lower.includes('कचरा') || lower.includes('గొయ్యి')) {
      updateSession({ siteType: 'ewaste' });
    } else if (lower.includes('drain') || lower.includes('नाला') || lower.includes('కాలువ')) {
      updateSession({ siteType: 'drain' });
    }
  }, [transcript, updateSession]);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Perform AI Risk Calculation (Layer 1)
  const calculateRisk = async () => {
    setSubmitting(true);
    
    // Ensure temperature and humidity are recorded
    const sessionData = {
      ...session,
      temperature: session.temperature || temp || 30,
      humidity: session.humidity || humidity || 55,
    };

    let result = null;

    if (navigator.onLine) {
      // Online flow using Gemini
      try {
        result = await geminiRiskAssess(sessionData);
      } catch (e) {
        console.error("Gemini failed, using offline engine:", e);
      }
    }

    if (!result) {
      // Local TensorFlow.js / Rule fallback engine (Offline)
      result = predict(sessionData);
    }

    completeCheck(result);
    setSubmitting(false);
    
    // Text-to-Speech announce safety verdict
    if (result.details) {
      speak(result.details);
    }
    
    handleNext();
  };

  // Equipment List checklist handler
  const handleEquipmentToggle = (id) => {
    let list = [...(session.equipment || [])];
    if (id === 'none') {
      list = ['none'];
    } else {
      list = list.filter(x => x !== 'none');
      if (list.includes(id)) {
        list = list.filter(x => x !== id);
      } else {
        list.push(id);
      }
    }
    updateSession({ equipment: list });
  };

  return (
    <div className="page max-w-lg mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <h1 className="text-base font-bold text-text-primary uppercase tracking-wider">
          {t('check.title', worker.language)}
        </h1>
        <div className="step-indicator font-semibold">
          {step === 1 && t('check.step1Title', worker.language)}
          {step === 2 && t('check.step2Title', worker.language)}
          {step === 3 && t('check.step3Title', worker.language)}
          <span className="ml-2 px-2 py-0.5 bg-surface border border-border-custom rounded-lg">{step}/3</span>
        </div>
      </div>

      {/* Step 1: Site Info */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-primary block">
              {t('check.siteType', worker.language)}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'sewer', label: t('check.sewer', worker.language), icon: '🕳️' },
                { id: 'septic', label: t('check.septic', worker.language), icon: '🚽' },
                { id: 'ewaste', label: t('check.ewaste', worker.language), icon: '🏭' },
                { id: 'drain', label: t('check.drain', worker.language), icon: '💧' },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => updateSession({ siteType: opt.id })}
                  className={`option-card flex-col items-center py-5 ${
                    session.siteType === opt.id ? 'selected' : ''
                  }`}
                >
                  <span className="text-2xl mb-2">{opt.icon}</span>
                  <span className="text-xs font-bold text-center">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-primary block">
              {t('check.lastCleaned', worker.language)}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: '<1week', label: t('check.week', worker.language) },
                { id: '1-4weeks', label: t('check.weeks', worker.language) },
                { id: '1-6months', label: t('check.months', worker.language) },
                { id: '>6months', label: t('check.monthsPlus', worker.language) },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => updateSession({ lastCleaned: opt.id })}
                  className={`option-card ${session.lastCleaned === opt.id ? 'selected' : ''}`}
                >
                  <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                    session.lastCleaned === opt.id ? 'border-accent bg-accent' : 'border-muted'
                  }`}>
                    {session.lastCleaned === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-primary block">
              {t('check.recentRain', worker.language)}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'yes', label: t('check.yes', worker.language) },
                { id: 'no', label: t('check.no', worker.language) },
                { id: 'unsure', label: t('check.notSure', worker.language) },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => updateSession({ recentRain: opt.id })}
                  className={`option-card justify-center text-center ${
                    session.recentRain === opt.id ? 'selected' : ''
                  }`}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center py-2">
            <VoiceButton
              listening={listening}
              startListening={startListening}
              stopListening={stopListening}
              promptText="Say Site Type..."
            />
          </div>

          <BigButton
            variant="accent"
            onClick={handleNext}
            disabled={!session.siteType || !session.lastCleaned || !session.recentRain}
          >
            {t('check.next', worker.language)} →
          </BigButton>
        </div>
      )}

      {/* Step 2: Conditions */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="card bg-surface border border-border-custom py-3.5 px-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted block">{t('check.conditions', worker.language)}</span>
              <span className="text-sm font-bold text-text-primary">
                {session.temperature || temp || 32}°C · {session.humidity || humidity || 60}% Humidity
              </span>
            </div>
            <span className="badge-safe text-[10px]">
              {t('check.autoFetched', worker.language)}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-primary block">
              {t('check.depth', worker.language)}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: '<3ft', label: t('check.depthOptions.shallow', worker.language) },
                { id: '3-6ft', label: t('check.depthOptions.medium', worker.language) },
                { id: '6-10ft', label: t('check.depthOptions.deep', worker.language) },
                { id: '>10ft', label: t('check.depthOptions.veryDeep', worker.language) },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => updateSession({ depth: opt.id })}
                  className={`option-card justify-center text-center ${
                    session.depth === opt.id ? 'selected' : ''
                  }`}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-primary block">
              {t('check.equipment', worker.language)}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'gas_detector', label: t('check.gasDetector', worker.language), icon: '📟' },
                { id: 'rope', label: t('check.rope', worker.language), icon: '🪢' },
                { id: 'blower', label: t('check.blower', worker.language), icon: '🌀' },
                { id: 'gloves', label: t('check.gloves', worker.language), icon: '🧤' },
                { id: 'helmet', label: t('check.helmet', worker.language), icon: '🪖' },
                { id: 'none', label: t('check.noneAbove', worker.language), icon: '❌' },
              ].map(opt => {
                const isSel = session.equipment?.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleEquipmentToggle(opt.id)}
                    className={`option-card ${isSel ? 'selected' : ''}`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-sm">{opt.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-primary block">
              {t('check.employer', worker.language)}
            </label>
            <input
              type="text"
              value={session.employer || ''}
              onChange={(e) => updateSession({ employer: e.target.value })}
              placeholder={t('check.employer', worker.language)}
              className="input-field"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={handleBack} className="btn-cta-surface w-1/3">
              ← {t('check.back', worker.language)}
            </button>
            <BigButton
              variant="orange"
              onClick={calculateRisk}
              disabled={submitting || !session.depth || !session.equipment?.length}
              className="flex-1"
            >
              {submitting ? t('check.analyzing', worker.language) : `${t('check.next', worker.language)} →`}
            </BigButton>
          </div>
        </div>
      )}

      {/* Step 3: AI Verdict & Pre-entry Checklist */}
      {step === 3 && (
        <div className="space-y-6 animate-slide-up">
          <div className="card text-center space-y-4">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
              {t('check.result', worker.language)}
            </h2>

            <RiskMeter score={session.riskScore} label={session.riskLevel} />

            <div className="bg-night rounded-2xl p-4 text-left border border-border-custom leading-relaxed">
              <p className="text-sm text-text-primary">
                {session.riskDetails}
              </p>
            </div>
          </div>

          {/* Heatstroke Reduction Warning Overlay */}
          {(session.temperature > 35) && (
            <div className="card bg-warning/10 border border-warning/30 space-y-2">
              <div className="flex items-center gap-2 text-warning font-bold text-xs">
                <span>🌡️ HEATSTROKE WARNING</span>
              </div>
              <p className="text-xs text-muted">
                {t('check.heatstrokeWarning', worker.language)} Safe window reduced to {session.safeWindowMinutes} min.
              </p>
            </div>
          )}

          <div className="card space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
              {t('check.checklist', worker.language)}
            </h3>
            <ChecklistCard
              items={session.checklist}
              onComplete={() => updateSession({ checkCompleted: true })}
            />
          </div>

          <BigButton
            variant="safe"
            onClick={() => navigate('/descend')}
            disabled={!session.checkCompleted}
          >
            ▶ {t('check.startDescent', worker.language)}
          </BigButton>
        </div>
      )}
    </div>
  );
}
