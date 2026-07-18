// ============================================================
//  useVoiceOutput — shared text-to-speech hook (Web Speech
//  Synthesis API). Used by both the customer store assistant
//  (Store.tsx) and the admin AI assistant (AssistantView.tsx) so
//  the AI can speak its replies out loud, Siri/Alexa-style.
//
//  Browser support: Chrome/Edge (desktop + Android) — good.
//  Safari/iOS has its own voice list but generally works too.
//  Degrades gracefully (isSupported=false) if unavailable.
// ============================================================
import { useEffect, useRef, useState, useCallback } from "react";

interface UseVoiceOutputOptions {
  // BCP-47 language tag to prefer when picking a voice. Falls back to
  // the browser's default voice if no exact match is installed.
  lang?: string;
  rate?: number; // 0.1–10, 1 = normal speed
  pitch?: number; // 0–2, 1 = normal
}

interface UseVoiceOutputReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  voiceEnabled: boolean;
  toggleVoiceEnabled: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  // Speaks immediately, ignoring the voiceEnabled gate. Only meant to be
  // called directly inside a click handler (e.g. the "Voice on" toggle
  // button) — Android Chrome blocks speechSynthesis calls that happen
  // after an async gap (like a fetch response), so this "primes" the
  // audio engine with a real user-gesture-linked call first.
  speakUnlocked: (text: string) => void;
}

export function useVoiceOutput({
  lang = "ur-PK",
  rate = 1,
  pitch = 1,
}: UseVoiceOutputOptions = {}): UseVoiceOutputReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Off by default — auto-speaking every reply the moment the widget opens
  // would surprise people; they opt in via the speaker toggle button.
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    // Voice list loads asynchronously in some browsers (esp. Chrome) —
    // listen for the change event instead of assuming it's ready immediately.
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      const exact = voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase());
      const family = voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
      voiceRef.current = exact || family || voices[0];
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [lang]);

  const stopSpeaking = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speakInternal = useCallback(
    (text: string) => {
      if (!isSupported || !text?.trim()) return;

      // ---- Android Chrome bug workaround ----
      // Calling speak() immediately after cancel() silently does nothing on
      // many Android Chrome builds — the engine needs a beat to actually
      // clear before it'll accept new speech. A short setTimeout after
      // cancel() is the standard workaround (no fixed delay is documented
      // as "the" right number; ~150ms is reliably enough in practice).
      window.speechSynthesis.cancel();

      window.setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceRef.current) utterance.voice = voiceRef.current;
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);

        // ---- Second Android Chrome bug workaround ----
        // On some Android builds, speechSynthesis silently pauses itself
        // after ~15 seconds of continuous speech (a long AI reply can
        // easily exceed that) and never resumes on its own. Nudging it
        // with pause()+resume() every few seconds while still speaking
        // keeps long replies from cutting off partway through.
        const keepAlive = window.setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            window.clearInterval(keepAlive);
            return;
          }
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }, 4000);
      }, 150);
    },
    [isSupported, lang, rate, pitch]
  );

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled) return;
      speakInternal(text);
    },
    [voiceEnabled, speakInternal]
  );

  // No voiceEnabled gate — call ONLY from inside a direct click handler.
  const speakUnlocked = useCallback(
    (text: string) => {
      speakInternal(text);
    },
    [speakInternal]
  );

  const toggleVoiceEnabled = useCallback(() => {
    setVoiceEnabled((v) => {
      if (v) stopSpeaking(); // turning off mid-speech should cut it immediately
      return !v;
    });
  }, [stopSpeaking]);

  return { isSupported, isSpeaking, voiceEnabled, toggleVoiceEnabled, speak, stopSpeaking, speakUnlocked };
}
