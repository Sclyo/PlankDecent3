import { useState, useCallback, useRef, useEffect } from 'react';

interface VoiceFeedbackOptions {
  enabled?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export function useVoiceFeedback(options: VoiceFeedbackOptions = {}) {
  const [isEnabled, setIsEnabled] = useState(options.enabled ?? true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const lastMessageRef = useRef<string>('');
  const messageTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setIsSupported(true);
    }
  }, []);

  const speak = useCallback((message: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    if (!isEnabled || !isSupported || !synthRef.current || !message.trim()) {
      return;
    }

    // Prevent spam by filtering duplicate messages
    if (lastMessageRef.current === message && priority !== 'high') {
      return;
    }

    // Cancel current speech if high priority message
    if (priority === 'high' && synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    // Clear any existing timeout
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 0.8;
    utterance.lang = options.lang ?? 'en-US';

    utterance.onstart = () => {
      setIsSpeaking(true);
      lastMessageRef.current = message;
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      // Reset last message after a delay to allow similar messages
      messageTimeoutRef.current = setTimeout(() => {
        lastMessageRef.current = '';
      }, 3000);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      console.error('Speech synthesis error');
    };

    synthRef.current.speak(utterance);
  }, [isEnabled, isSupported, options]);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const toggle = useCallback(() => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    
    if (!newEnabled && synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
    
    return newEnabled;
  }, [isEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  return {
    isEnabled,
    isSpeaking,
    isSupported,
    speak,
    stopSpeaking,
    toggle,
    setEnabled: setIsEnabled,
  };
}
