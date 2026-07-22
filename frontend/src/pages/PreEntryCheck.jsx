import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../context/WorkerContext';
import { useSession } from '../context/SessionContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWeather } from '../hooks/useWeather';
import { useVoice } from '../hooks/useVoice';
import { useVoiceWizard } from '../hooks/useVoiceWizard';
import { useOfflineAI } from '../hooks/useOfflineAI';
import { geminiRiskAssess } from '../lib/gemini';
import { apiCall } from '../lib/api';
import { t } from '../lib/i18n';
import BigButton from '../components/shared/BigButton';
import RiskMeter from '../components/risk/RiskMeter';
import ChecklistCard from '../components/risk/ChecklistCard';
import VoiceButton from '../components/voice/VoiceButton';

export default function PreEntryCheck() {
  const { worker } = useWorker();
  const { session, updateSession, completeCheck } = useSession();
  const { lat, lng } = useGeolocation();
  const { temp, humidity } = useWeather(lat, lng);
  const { predict } = useOfflineAI();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [parsedVoiceFields, setParsedVoiceFields] = useState(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Setup Voice TTS
  const voice = useVoice(worker.language);
  const { speak } = voice;

  // Parse full voice command via backend
  const handleVoiceResult = useCallback(async (transcript) => {
    if (!transcript || transcript.trim().length === 0) return;
    setVoiceTranscript(transcript);
    try {
      const res = await apiCall('/api/parse-voice-input', {
        method: 'POST',
        body: JSON.stringify({ transcript, language: worker.language }),
      });
      if (res && !res.offline) {
        setParsedVoiceFields(res);

        // Programmatically apply non-null fields to form state immediately
        const updates = {};
        if (res.site_type) {
          const map = { septic_tank: 'septic', sewer: 'sewer', ewaste_pit: 'ewaste', drain_canal: 'drain' };
          updates.siteType = map[res.site_type] || res.site_type;
        }
        if (res.last_cleaned) {
          updates.lastCleaned = res.last_cleaned;
        }
        if (res.recent_rain !== null && res.recent_rain !== undefined) {
          updates.recentRain = res.recent_rain ? 'yes' : 'no';
        }
        if (res.depth_feet) {
          if (res.depth_feet <= 3) updates.depth = '<3ft';
          else if (res.depth_feet <= 6) updates.depth = '3-6ft';
          else if (res.depth_feet <= 10) updates.depth = '6-10ft';
          else updates.depth = '>10ft';
        }
        if ((res.has_ventilation !== null && res.has_ventilation !== undefined) || (res.has_gas_detector !== null && res.has_gas_detector !== undefined)) {
          const current = [...(session.equipment || [])].filter(x => x !== 'none');
          if (res.has_ventilation && !current.includes('blower')) current.push('blower');
          if (res.has_gas_detector && !current.includes('gas_detector')) current.push('gas_detector');
          updates.equipment = current.length > 0 ? current : ['none'];
        }
        if (Object.keys(updates).length > 0) {
          updateSession(updates);
        }

        // Speak confirmation
        const spokenFields = [];
        if (res.site_type) spokenFields.push(res.site_type.replace(/_/g, ' '));
        if (res.last_cleaned) spokenFields.push(`last cleaned ${res.last_cleaned}`);
        if (res.recent_rain !== null && res.recent_rain !== undefined) spokenFields.push(res.recent_rain ? 'rain' : 'no rain');
        if (res.depth_feet) spokenFields.push(`${res.depth_feet} feet deep`);
        const confirmation = worker.language === 'te'
          ? `నేను విన్నాను: ${spokenFields.join(', ')}. ఇది సరైనదేనా?`
          : worker.language === 'hi'
          ? `मैंने सुना: ${spokenFields.join(', ')}. क्या यह सही है?`
          : worker.language === 'ta'
          ? `நான் கேட்டேன்: ${spokenFields.join(', ')}. இது சரிதானா?`
          : `I heard: ${spokenFields.join(', ')}. Is this correct?`;
        speak(confirmation);
      }
    } catch (err) {
      console.warn('Voice parse failed:', err);
    }
  }, [worker.language, speak, session.equipment, updateSession]);

  // Apply parsed fields to form
  const applyParsedFields = useCallback(() => {
    if (!parsedVoiceFields) return;
    const f = parsedVoiceFields;
    const updates = {};

    // Site type
    if (f.site_type) {
      const map = { septic_tank: 'septic', sewer: 'sewer', ewaste_pit: 'ewaste', drain_canal: 'drain' };
      updates.siteType = map[f.site_type] || f.site_type;
    }

    // Last cleaned
    if (f.last_cleaned) {
      updates.lastCleaned = f.last_cleaned;
    }

    // Recent rain
    if (f.recent_rain !== null && f.recent_rain !== undefined) {
      updates.recentRain = f.recent_rain ? 'yes' : 'no';
    }

    // Depth
    if (f.depth_feet) {
      if (f.depth_feet <= 3) updates.depth = '<3ft';
      else if (f.depth_feet <= 6) updates.depth = '3-6ft';
      else if (f.depth_feet <= 10) updates.depth = '6-10ft';
      else updates.depth = '>10ft';
    }

    // Ventilation -> equipment
    if (f.has_ventilation !== null && f.has_ventilation !== undefined) {
      const current = [...(session.equipment || [])].filter(x => x !== 'none');
      if (f.has_ventilation && !current.includes('blower')) current.push('blower');
      if (!f.has_ventilation) {
        // remove blower if present
        const idx = current.indexOf('blower');
        if (idx >= 0) current.splice(idx, 1);
      }
      updates.equipment = current.length > 0 ? current : ['none'];
    }

    // Gas detector
    if (f.has_gas_detector !== null && f.has_gas_detector !== undefined) {
      const current = [...(updates.equipment || session.equipment || [])].filter(x => x !== 'none');
      if (f.has_gas_detector && !current.includes('gas_detector')) current.push('gas_detector');
      if (!f.has_gas_detector) {
        const idx = current.indexOf('gas_detector');
        if (idx >= 0) current.splice(idx, 1);
      }
      updates.equipment = current.length > 0 ? current : ['none'];
    }

    updateSession(updates);
    setParsedVoiceFields(null);
    speak(worker.language === 'te' ? 'ఫారమ్ నింపబడింది' : worker.language === 'hi' ? 'फॉर्म भर दिया गया है' : 'Form filled');
  }, [parsedVoiceFields, session.equipment, updateSession, speak, worker.language]);

  const handleUpdateField = useCallback((key, val) => {
    updateSession({ [key]: val });
  }, [updateSession]);

  const handleStepChange = useCallback((newStep) => {
    setStep(newStep);
  }, []);

  // Voice Wizard Hook for capturing all form fields across Steps 1 & 2
  const voiceWizard = useVoiceWizard({
    language: worker.language,
    onUpdateField: handleUpdateField,
    onStepChange: handleStepChange
  });

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

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Perform AI Risk Calculation
  const calculateRisk = async () => {
    setSubmitting(true);
    
    const sessionData = {
      ...session,
      temperature: session.temperature || temp || 30,
      humidity: session.humidity || humidity || 55,
    };

    let result = null;

    if (navigator.onLine) {
      try {
        result = await geminiRiskAssess(sessionData);
      } catch (e) {
        console.error("Gemini failed, using offline engine:", e);
      }
    }

    if (!result) {
      result = predict(sessionData);
    }

    console.log("PreEntryCheck complete check result:", result);
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

  const safeMinutes = session.safeWindowMinutes || session.safe_entry_time_minutes || session.safe_window_minutes || 6;
  const scoreValue = session.riskScore ?? session.score ?? session.risk_score ?? 0;
  const riskLabelValue = session.riskLevel || session.risk || '';

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

      {/* Voice Assistant Status Bar */}
      {(voiceWizard.statusMessage || voiceWizard.isListening || voiceWizard.isSpeaking) && (
        <div className="card bg-accent/10 border border-accent/30 p-3.5 space-y-2 animate-pulse-slow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎙️</span>
              <span className="text-xs font-bold text-accent uppercase tracking-wider">
                {voiceWizard.isListening ? 'Listening...' : voiceWizard.isSpeaking ? 'Speaking...' : 'Voice Assistant'}
              </span>
            </div>
            <button
              onClick={voiceWizard.stopWizard}
              className="text-[10px] bg-surface px-2 py-1 rounded text-muted hover:text-text-primary border border-border-custom"
            >
              Stop Voice
            </button>
          </div>
          <p className="text-xs text-text-primary font-medium">
            {voiceWizard.statusMessage}
          </p>
          {voiceWizard.transcript && (
            <p className="text-[11px] font-mono text-accent bg-night/60 p-1.5 rounded">
              "{voiceWizard.transcript}"
            </p>
          )}
        </div>
      )}

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

          {/* Voice Button — one full command fills all fields */}
          <div className="flex flex-col items-center gap-2 py-2">
            <VoiceButton
              listening={voice.listening}
              startListening={() => {
                setParsedVoiceFields(null);
                setVoiceTranscript('');
                voice.startListening();
              }}
              stopListening={() => {
                voice.stopListening();
                const finalText = voice.transcript || voiceTranscript;
                if (finalText) handleVoiceResult(finalText);
              }}
              promptText="Say one full command e.g. 'Septic tank, last cleaned 3 months ago, no rain, 10 feet deep, no ventilation'"
              interimTranscript={voice.interimTranscript}
              transcript={voice.transcript || voiceTranscript}
              parsedFields={parsedVoiceFields}
              onConfirmParsed={applyParsedFields}
            />
            <span className="text-[10px] text-muted">Say one full sentence with all details</span>
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

            <RiskMeter score={scoreValue} label={riskLabelValue} heatstrokeWarning={session.heatstroke_warning || null} />

            <div className="bg-night rounded-2xl p-4 text-left border border-border-custom leading-relaxed">
              <p className="text-sm text-text-primary">
                {session.riskDetails || session.details}
              </p>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
              {t('check.checklist', worker.language)}
            </h3>
            <ChecklistCard
              items={session.checklist}
              onComplete={(isReady) => updateSession({ checkCompleted: isReady })}
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
