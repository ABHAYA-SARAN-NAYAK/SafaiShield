import { useState, useRef, useCallback } from 'react';

const QUESTIONS = [
  {
    id: 'siteType',
    step: 1,
    prompt: 'What type of site? Say Sewer Manhole, Septic Tank, E-Waste Pit, or Drain Canal',
    teluguPrompt: 'ఏ తరహా సైట్? మురుగు మ్యాన్ హోల్, సెప్టిక్ ట్యాంక్, ఈ-వేస్ట్ గొయ్యి, లేదా డ్రెయిన్ కాలువ అని చెప్పండి',
    parse: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('sewer') || lower.includes('manhole') || lower.includes('మురుగు') || lower.includes('మ్యాన్ హోల్') || lower.includes('सीवर')) return 'sewer';
      if (lower.includes('septic') || lower.includes('tank') || lower.includes('సెప్టిక్') || lower.includes('ట్యాంక్') || lower.includes('सेप्टिक')) return 'septic';
      if (lower.includes('waste') || lower.includes('pit') || lower.includes('గొయ్యి') || lower.includes('कचरा')) return 'ewaste';
      if (lower.includes('drain') || lower.includes('canal') || lower.includes('కాలువ') || lower.includes('नाला')) return 'drain';
      return null;
    }
  },
  {
    id: 'lastCleaned',
    step: 1,
    prompt: 'When was this site last cleaned? Say less than one week, one to four weeks, one to six months, or more than six months',
    teluguPrompt: 'ఈ సైట్‌ను చివరిసారిగా ఎప్పుడు శుభ్రం చేశారు? ఒక వారం కంటే తక్కువ, ఒకటి నుండి నాలుగు వారాలు, ఒక నెల నుండి ఆరు నెలలు, లేదా ఆరు నెలల కంటే ఎక్కువ అని చెప్పండి',
    parse: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('less than one week') || lower.includes('less than a week') || lower.includes('1 week') || lower.includes('one week') || lower.includes('వారం') || lower.includes('हफ्ता')) return '<1week';
      if (lower.includes('1 to 4') || lower.includes('1-4') || lower.includes('four weeks') || lower.includes('4 weeks') || lower.includes('నాలుగు వారాలు') || lower.includes('हफ़्ते')) return '1-4weeks';
      if (lower.includes('1 to 6') || lower.includes('1-6') || lower.includes('six months') || lower.includes('6 months') || lower.includes('ఆరు నెలలు') || lower.includes('మహీనే')) return '1-6months';
      if (lower.includes('more than six') || lower.includes('more than 6') || lower.includes('over six') || lower.includes('>6') || lower.includes('ఎక్కువ') || lower.includes('జ्यादा')) return '>6months';
      return null;
    }
  },
  {
    id: 'recentRain',
    step: 1,
    prompt: 'Was there a recent flood or rain? Say Yes, No, or Not Sure',
    teluguPrompt: 'ఇటీవల వరద లేదా వాన వచ్చిందా? అవును, లేదు, లేదా తెలియదు అని చెప్పండి',
    parse: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('yes') || lower.includes('flood') || lower.includes('rain') || lower.includes('haan') || lower.includes('avunu') || lower.includes('varada') || lower.includes('vaana') || lower.includes('వరద') || lower.includes('వాన') || lower.includes('అవును') || lower.includes('हाँ')) return 'yes';
      if (lower.includes('no') || lower.includes('nahi') || lower.includes('ledu') || lower.includes('లేదు') || lower.includes('కాదు') || lower.includes('नहीं')) return 'no';
      if (lower.includes('sure') || lower.includes('know') || lower.includes('teliyadu') || lower.includes('తెలియదు') || lower.includes('పర్వాలేదు') || lower.includes('पता')) return 'unsure';
      return null;
    }
  },
  {
    id: 'depth',
    step: 2,
    prompt: 'How deep is the entry point? Say less than three feet, three to six feet, six to ten feet, or more than ten feet',
    teluguPrompt: 'ప్రవేశ స్థలం ఎంత లోతు ఉంది? మూడు అడుగుల కంటే తక్కువ, మూడు నుండి ఆరు అడుగులు, ఆరు నుండి పది అడుగులు, లేదా పది అడుగుల కంటే ఎక్కువ అని చెప్పండి',
    parse: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('less than three') || lower.includes('less than 3') || lower.includes('3 feet') || lower.includes('three feet') || lower.includes('మూడు అడుగుల') || lower.includes('తక్కువ')) return '<3ft';
      if (lower.includes('3 to 6') || lower.includes('3-6') || lower.includes('three to six') || lower.includes('six feet') || lower.includes('3 నుండి 6')) return '3-6ft';
      if (lower.includes('6 to 10') || lower.includes('6-10') || lower.includes('six to ten') || lower.includes('ten feet') || lower.includes('6 నుండి 10')) return '6-10ft';
      if (lower.includes('more than ten') || lower.includes('more than 10') || lower.includes('over ten') || lower.includes('>10') || lower.includes('10 అడుగుల') || lower.includes('చాలా లోతు')) return '>10ft';
      return null;
    }
  },
  {
    id: 'equipment',
    step: 2,
    prompt: 'What safety equipment is available? Say gas detector, rope, blower, gloves, helmet, or say none',
    teluguPrompt: 'ఏ సురక్షిత పరికరాలు అందుబాటులో ఉన్నాయి? గ్యాస్ డిటెక్టర్, తాడు, బ్లోవర్, గ్లౌజులు, హెల్మెట్, లేదా ఏదీ లేదు అని చెప్పండి',
    parse: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('none') || lower.includes('nothing') || lower.includes('ఏదీ లేదు') || lower.includes('ఏమీ లేదు') || lower.includes('कोई नहीं')) {
        return ['none'];
      }
      const items = [];
      if (lower.includes('gas') || lower.includes('detector') || lower.includes('meter') || lower.includes('గ్యాస్')) items.push('gas_detector');
      if (lower.includes('rope') || lower.includes('tadu') || lower.includes('తాడు') || lower.includes('రస్సీ')) items.push('rope');
      if (lower.includes('blower') || lower.includes('fan') || lower.includes('ventilation') || lower.includes('బ్లోవర్')) items.push('blower');
      if (lower.includes('glove') || lower.includes('gloves') || lower.includes('hand') || lower.includes('గ్లౌజులు') || lower.includes('दस्ताने')) items.push('gloves');
      if (lower.includes('helmet') || lower.includes('head') || lower.includes('హెల్మెట్') || lower.includes('हेलमेट')) items.push('helmet');
      return items.length > 0 ? items : null;
    }
  },
  {
    id: 'employer',
    step: 2,
    prompt: 'What is the employer or contractor name? You can skip this.',
    teluguPrompt: 'యజమాని లేదా కాంట్రాక్టర్ పేరు ఏమిటి? మీరు దీన్ని దాటవేయవచ్చు.',
    parse: (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('skip') || lower.includes('pass') || lower.includes('దాటవేయి') || lower.includes('అవసరం లేదు')) return '';
      return text.trim();
    }
  }
];

export function useVoiceWizard({ language = 'en', onUpdateField, onStepChange }) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const recognitionRef = useRef(null);
  const isRunningRef = useRef(false);

  const isSupported = typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const speakText = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.9;
    
    setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const listenForAnswer = useCallback((qObj, onResult) => {
    if (!isSupported) {
      setStatusMessage('Voice recognition not supported on this browser.');
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognitionRef.current = recognition;

    recognition.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalResult = '';

    recognition.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(text);
      if (e.results[0] && e.results[0].isFinal) {
        finalResult = text;
      }
    };

    recognition.onerror = (e) => {
      console.warn('Speech recognition error:', e.error);
      setIsListening(false);
      onResult(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      onResult(finalResult || transcript);
    };

    try {
      setIsListening(true);
      recognition.start();
    } catch (err) {
      setIsListening(false);
      onResult(null);
    }
  }, [language, isSupported, transcript]);

  const runQuestionStep = useCallback((index) => {
    if (index >= QUESTIONS.length) {
      setIsComplete(true);
      setActiveQuestionIndex(-1);
      isRunningRef.current = false;
      const completionText = language === 'te' 
        ? 'అన్ని వివరాలు నమోదు చేయబడ్డాయి. కొనసాగడానికి నెక్స్ట్ నొక్కండి.' 
        : 'All details captured. Tap Next to continue.';
      setStatusMessage(completionText);
      speakText(completionText);
      return;
    }

    const q = QUESTIONS[index];
    setActiveQuestionIndex(index);
    if (onStepChange && q.step) {
      onStepChange(q.step);
    }

    const promptText = language === 'te' ? q.teluguPrompt : q.prompt;
    setStatusMessage(promptText);

    speakText(promptText, () => {
      // After question is spoken, start listening
      listenForAnswer(q, (userSpeech) => {
        if (userSpeech) {
          const parsed = q.parse(userSpeech);
          if (parsed !== null && parsed !== undefined) {
            onUpdateField(q.id, parsed);
          }
        }
        // Advance to next question after small delay
        setTimeout(() => {
          if (isRunningRef.current) {
            runQuestionStep(index + 1);
          }
        }, 600);
      });
    });
  }, [language, onStepChange, speakText, listenForAnswer, onUpdateField]);

  const startWizard = useCallback(() => {
    setIsComplete(false);
    isRunningRef.current = true;
    setTranscript('');
    runQuestionStep(0);
  }, [runQuestionStep]);

  const stopWizard = useCallback(() => {
    isRunningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setIsSpeaking(false);
    setActiveQuestionIndex(-1);
    setStatusMessage('');
  }, []);

  return {
    startWizard,
    stopWizard,
    activeQuestionIndex,
    currentQuestion: activeQuestionIndex >= 0 ? QUESTIONS[activeQuestionIndex] : null,
    isListening,
    isSpeaking,
    isComplete,
    transcript,
    statusMessage,
    isSupported
  };
}
