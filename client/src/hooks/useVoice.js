import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Browser speech recognition + synthesis for chat voice I/O.
 */
export function useVoice({ onTranscript, lang = 'en-IN' }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const hasTts = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceSupported(hasTts);
    setSttSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = lang;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript && onTranscript) onTranscript(transcript, event.results[event.results.length - 1]?.isFinal);
      };

      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
    }

    return () => {
      recognitionRef.current?.abort?.();
      window.speechSynthesis?.cancel();
    };
  }, [lang, onTranscript]);

  const startListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return false;
    try {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      rec.start();
      setIsListening(true);
      return true;
    } catch {
      setIsListening(false);
      return false;
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  }, [isListening, startListening, stopListening]);

  const speak = useCallback((text, { onEnd } = {}) => {
    if (!text || !window.speechSynthesis) return false;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
    utter.lang = lang;
    utter.rate = 0.95;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang.startsWith('en') && /female|samantha|zira|google/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
    return true;
  }, [lang]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    voiceSupported,
    sttSupported,
    toggleListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
