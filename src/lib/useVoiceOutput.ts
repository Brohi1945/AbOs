// ============================================================
//  useVoiceOutput — shared text-to-speech hook (Web Speech
//  Synthesis API). Used by both the customer store assistant
//  (Store.tsx) and the admin AI assistant (AssistantView.tsx) so
//  the AI can speak its replies out loud, Siri/Alexa-style.
//
//  Browser support: Chrome/Edge (desktop + Android) — good.
//  Safari/iOS has its own voice list but generally works too.
//  Degrades gracefully (isSupported=false) if unavailable.
//
//  THIS VERSION IS SELF-HEALING:
//  1. Stale-closure fix — `speak()` used to read `voiceEnabled` from a
//     closure that could be stale if called from a callback wired up
//     once elsewhere (e.g. a mic-input handler). Now it reads a ref
//     that's always current, so voice never silently "forgets" it was
//     turned on.
//  2. Retry-until-it-actually-speaks — Android Chrome sometimes
//     silently drops a speak() call: no error, no event, nothing.
//     Every attempt now has a watchdog: if `onstart` doesn't fire
//     within ~500ms, the engine is assumed jammed, is fully reset,
//     and the same text is retried (up to a few attempts with
//     backoff) instead of just giving up and falling back to text-only.
//  3. Keeps the existing Android-specific workarounds: a short delay
//     after cancel() before speaking again, and a pause/resume
//     "keepAlive" nudge for the ~15s auto-pause bug on long replies.
// ============================================================
import { useEffect, useRef, useState, useCallback } from "react";

interface UseVoiceOutputOptions {
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

const PRE_SPEAK_DELAY_MS = 150;   // let cancel() actually clear before speaking again
const START_TIMEOUT_MS = 600;     // how long to wait for onstart before assuming it silently failed
const MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 250;  // backoff step between retries
const KEEPALIVE_INTERVAL_MS = 4000; // Android's ~15s auto-pause bug workaround

export function useVoiceOutput({
  lang = "ur-PK",
  rate = 1,
  pitch = 1,
}: UseVoiceOutputOptions = {}): UseVoiceOutputReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // ---- refs so speak logic always reads the CURRENT value, never a
  // value frozen inside some earlier render's closure ----
  const voiceEnabledRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const langRef = useRef(lang);
  const rateRef = useRef(rate);
  const pitchRef = useRef(pitch);

  // ---- retry / watchdog bookkeeping ----
  const requestIdRef = useRef(0);      // bumped on every new speak() call; lets stale retries/timers detect they're obsolete and bail out silently
  const attemptCountRef = useRef(0);
  const startedRef = useRef(false);
  const preSpeakTimerRef = useRef<number | null>(null);
  const watchdogTimerRef = useRef<number | null>(null);
  const keepAliveTimerRef = useRef<number | null>(null);

  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => { pitchRef.current = pitch; }, [pitch]);

  const clearAllTimers = () => {
    if (preSpeakTimerRef.current) { window.clearTimeout(preSpeakTimerRef.current); preSpeakTimerRef.current = null; }
    if (watchdogTimerRef.current) { window.clearTimeout(watchdogTimerRef.current); watchdogTimerRef.current = null; }
    if (keepAliveTimerRef.current) { window.clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
  };

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
      const l = langRef.current;
      const exact = voices.find((v) => v.lang.toLowerCase() === l.toLowerCase());
      const family = voices.find((v) => v.lang.toLowerCase().startsWith(l.slice(0, 2).toLowerCase()));
      voiceRef.current = exact || family || voices[0];
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      clearAllTimers();
      window.speechSynthesis.cancel();
    };
  }, []);

  const hardStop = useCallback(() => {
    requestIdRef.current += 1; // invalidates any attempt/retry still in flight
    clearAllTimers();
    attemptCountRef.current = 0;
    startedRef.current = false;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    hardStop();
  }, [hardStop]);

  // One real attempt to speak `text`. If the engine doesn't confirm it
  // actually started within START_TIMEOUT_MS, treat it as a silent failure
  // and try again from scratch (fresh cancel + fresh utterance).
  const attemptSpeak = useCallback((text: string, myRequestId: number) => {
    if (myRequestId !== requestIdRef.current) return;

    attemptCountRef.current += 1;
    startedRef.current = false;

    // Always cancel first — speaking on top of a half-dead queue is one of
    // the ways the engine gets stuck in the first place.
    window.speechSynthesis.cancel();

    preSpeakTimerRef.current = window.setTimeout(() => {
      if (myRequestId !== requestIdRef.current) return;

      const utterance = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.lang = langRef.current;
      utterance.rate = rateRef.current;
      utterance.pitch = pitchRef.current;

      utterance.onstart = () => {
        if (myRequestId !== requestIdRef.current) return;
        startedRef.current = true;
        setIsSpeaking(true);

        // 15-second Android auto-pause workaround — only runs while this
        // utterance is actually the one playing.
        if (keepAliveTimerRef.current) window.clearInterval(keepAliveTimerRef.current);
        keepAliveTimerRef.current = window.setInterval(() => {
          if (myRequestId !== requestIdRef.current || !window.speechSynthesis.speaking) {
            if (keepAliveTimerRef.current) { window.clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
            return;
          }
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }, KEEPALIVE_INTERVAL_MS);
      };

      utterance.onend = () => {
        if (myRequestId !== requestIdRef.current) return;
        setIsSpeaking(false);
        attemptCountRef.current = 0;
        clearAllTimers();
      };

      utterance.onerror = () => {
        if (myRequestId !== requestIdRef.current) return;
        setIsSpeaking(false);
        if (keepAliveTimerRef.current) { window.clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
        scheduleRetryOrGiveUp(text, myRequestId);
      };

      window.speechSynthesis.speak(utterance);

      // Watchdog: this is the core fix. If onstart hasn't fired by now,
      // the browser silently swallowed the call — no error, no event.
      // That's the actual root cause of "voice works, then goes silent
      // with no explanation." Detect it and retry.
      watchdogTimerRef.current = window.setTimeout(() => {
        if (myRequestId !== requestIdRef.current) return;
        if (!startedRef.current) {
          scheduleRetryOrGiveUp(text, myRequestId);
        }
      }, START_TIMEOUT_MS);
    }, PRE_SPEAK_DELAY_MS);
  }, []);

  const scheduleRetryOrGiveUp = useCallback((text: string, myRequestId: number) => {
    if (myRequestId !== requestIdRef.current) return;
    if (attemptCountRef.current >= MAX_ATTEMPTS) {
      // Genuinely out of options this time — stop quietly. The text reply
      // is still visible on screen either way.
      setIsSpeaking(false);
      attemptCountRef.current = 0;
      return;
    }
    const delay = RETRY_BASE_DELAY_MS * attemptCountRef.current; // 250, 500, 750...
    window.setTimeout(() => attemptSpeak(text, myRequestId), delay);
  }, [attemptSpeak]);

  const speakInternal = useCallback((text: string) => {
    if (!isSupported || !text?.trim()) return;
    requestIdRef.current += 1;
    const myRequestId = requestIdRef.current;
    clearAllTimers();
    attemptCountRef.current = 0;
    attemptSpeak(text, myRequestId);
  }, [isSupported, attemptSpeak]);

  const speak = useCallback((text: string) => {
    // Stale-closure fix: read the ref, not the state captured in whatever
    // render this particular `speak` reference came from. This is what
    // makes voice replies keep working even when triggered from a callback
    // that was wired up once (e.g. mic input) rather than freshly per-render.
    if (!voiceEnabledRef.current) return;
    speakInternal(text);
  }, [speakInternal]);

  // No voiceEnabled gate — call ONLY from inside a direct click handler.
  const speakUnlocked = useCallback((text: string) => {
    speakInternal(text);
  }, [speakInternal]);

  const toggleVoiceEnabled = useCallback(() => {
    setVoiceEnabled((v) => {
      const next = !v;
      voiceEnabledRef.current = next; // update ref immediately, don't wait for the effect
      if (!next) hardStop(); // turning off mid-speech should cut it immediately
      return next;
    });
  }, [hardStop]);

  return { isSupported, isSpeaking, voiceEnabled, toggleVoiceEnabled, speak, stopSpeaking, speakUnlocked };
}
