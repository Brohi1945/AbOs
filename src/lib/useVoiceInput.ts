// ============================================================
//  useVoiceInput — shared voice-to-text hook (Web Speech API)
//  Used by both the customer store assistant (Store.tsx) and the
//  admin AI assistant (AssistantView.tsx) so mic behavior stays
//  identical in one place.
//
//  Browser support: Chrome/Edge (desktop + Android) — good.
//  Safari/iOS — limited/inconsistent, hook degrades gracefully
//  (isSupported=false, mic button hides itself).
//
//  BUG FIX (this version): recognition is only ever created ONCE
//  (the effect below intentionally doesn't re-run per render), but
//  the caller's onResult/onError callbacks are NEW functions every
//  render (they usually close over component state like `send`).
//  Previously the recognition object's onresult handler captured
//  whatever onResult was passed in on the FIRST render and called
//  that forever — so mic input kept triggering a permanently stale
//  version of the caller's logic (e.g. always seeing voiceEnabled
//  as false, no matter what it actually is now). Fixed by stashing
//  the latest onResult/onError in refs that update every render,
//  and having the recognition handlers call through the ref.
// ============================================================
import { useEffect, useRef, useState, useCallback } from "react";

interface UseVoiceInputOptions {
  // Called once with the final recognized transcript when the user stops speaking.
  onResult: (transcript: string) => void;
  // Called on any recognition error (permission denied, no speech, network, etc.)
  onError?: (message: string) => void;
  // BCP-47 language tag. Roman Urdu speech is typically best matched by
  // Urdu (ur-PK) or Hindi (hi-IN) acoustic models depending on device support;
  // "ur-PK" is tried first, caller can override.
  lang?: string;
}

interface UseVoiceInputReturn {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useVoiceInput({
  onResult,
  onError,
  lang = "ur-PK",
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // ---- stale-closure fix: always call the LATEST callback, never the
  // one that happened to be in scope when the recognition object was built.
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (interimText) setInterimTranscript(interimText);
      if (finalText.trim()) {
        setInterimTranscript("");
        // always the current callback, never a stale one
        onResultRef.current(finalText.trim());
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setInterimTranscript("");
      const messages: Record<string, string> = {
        "not-allowed": "Microphone permission denied hai — browser settings mein allow karein.",
        "no-speech": "Kuch sunai nahi diya — dobara koshish karein.",
        network: "Network issue — voice recognition ke liye internet chahiye.",
      };
      onErrorRef.current?.(messages[event.error] || "Voice input mein masla hua — dobara try karein.");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
    };
    // Intentionally only depends on `lang` — recognition is expensive to
    // recreate and the callback staleness is now handled via refs above,
    // not by rebuilding the recognition object every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    try {
      recognitionRef.current.start();
    } catch {
      /* recognition already started — ignore duplicate start calls */
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  return { isSupported, isListening, interimTranscript, startListening, stopListening, toggleListening };
}
