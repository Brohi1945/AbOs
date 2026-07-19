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
//     within ~600ms, the engine is assumed jammed, is fully reset,
//     and the same text is retried (up to a few attempts with
//     backoff) instead of just giving up and falling back to text-only.
//  3. If ALL retries are exhausted, a visible toast is shown instead of
//     failing silently. Common real causes at that point are device-side,
//     not app-side: Android's media volume slider muted (separate from
//     ringer volume), the on-device TTS voice pack not downloaded, or
//     the tab having lost audio focus in the background.
//  4. Keeps the existing Android-specific workarounds: a short delay
//     after cancel() before speaking again, and a pause/resume
//     "keepAlive" nudge for the ~15s auto-pause bug on long replies.
// ============================================================
import { useEffect, useRef, useState, useCallback } from "react";
import { toastError } from "./toast";

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
// BUG FIX: this used to be 600ms, which is too tight — on real Android
// devices the TTS engine sometimes genuinely takes 700-1500ms to fire
// onstart even though audio is *already* playing. The watchdog was firing
// first, assuming a silent failure, and calling attemptSpeak() again —
// which immediately does speechSynthesis.cancel(), chopping off the
// in-progress utterance after just a word or two and restarting it from
// scratch. That's the "bol kar 1-2 word mein chup ho jata hai" glitch.
const START_TIMEOUT_MS = 1800;    // how long to wait for onstart before assuming it silently failed
const MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 250;  // backoff step between retries
// BUG FIX: this used to be 4000ms. pause()+resume() is itself a known
// trigger for some Android Chrome builds to silently kill the utterance
// instead of resuming it — no onend, no onerror, just dead air. That's
// the "thori der bol kar chup ho jata hai" bug on longer replies: short
// replies finished before the first nudge ever fired, so they always
// sounded fine, while anything long enough to reach 4s ran straight into
// this workaround's own side effect. Pushed close to the real ~15s
// browser bug boundary (with margin) so it fires far less often, and the
// check below now detects + recovers from a silent death instead of just
// hoping resume() worked.
const KEEPALIVE_INTERVAL_MS = 12000;

// BUG FIX: "lambi baat nahi bol sakta, thora bol kar band ho jata hai" —
// a single long utterance is exactly what Chrome/Android's speech engine
// handles worst: long replies were hitting the ~15s auto-pause bug (the
// pause()/resume() keepalive above helps, but isn't fully reliable on
// every device) or just stalling partway with no error at all. Instead
// of fighting that on one giant utterance, long replies are now split
// into short sentence-sized chunks and spoken as a chain of utterances
// (each one's onend triggers the next) — every individual utterance
// stays well under the danger zone, and it sounds like one continuous
// reply to the listener.
const MAX_CHUNK_CHARS = 140;

function splitIntoChunks(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];
  // Split on sentence-ending punctuation (., !, ?, Urdu ۔) or newlines.
  const sentences = clean
    .split(/(?<=[.!?۔])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushHardSplit = (piece: string) => {
    // A single "sentence" longer than the limit on its own — hard-split
    // on word boundaries so it never becomes one unbreakable utterance.
    let rest = piece;
    while (rest.length > MAX_CHUNK_CHARS) {
      let cut = rest.lastIndexOf(" ", MAX_CHUNK_CHARS);
      if (cut <= 0) cut = MAX_CHUNK_CHARS;
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    return rest;
  };

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= MAX_CHUNK_CHARS) {
      current = candidate;
      continue;
    }
    if (current) {
      chunks.push(current);
      current = "";
    }
    current = pushHardSplit(sentence);
  }
  if (current) chunks.push(current);

  return chunks.length ? chunks : [clean];
}

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
  // Guards against BOTH onerror and the watchdog timeout firing for the
  // SAME failed attempt and each independently scheduling a retry. Without
  // this, a single genuine failure could spawn two parallel retry chains,
  // each of which could again double — an exponential explosion of
  // speak() calls and (once MAX_ATTEMPTS hit) duplicate "voice out nahi
  // ho saka" toasts stacking up rapidly enough to freeze the page.
  const attemptSettledRef = useRef(false);
  const preSpeakTimerRef = useRef<number | null>(null);
  const watchdogTimerRef = useRef<number | null>(null);
  const keepAliveTimerRef = useRef<number | null>(null);

  // ---- chunk queue (see splitIntoChunks above) ----
  const queueRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  // attemptSpeak (defined below) needs to trigger "move on to the next
  // chunk" from inside utterance.onend, but that function is defined
  // further down — a ref sidesteps the circular useCallback ordering.
  const speakNextChunkRef = useRef<(myRequestId: number) => void>(() => {});

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
    queueRef.current = [];
    chunkIndexRef.current = 0;
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
    attemptSettledRef.current = false;

    // Always cancel first — speaking on top of a half-dead queue is one of
    // the ways the engine gets stuck in the first place.
    window.speechSynthesis.cancel();

    preSpeakTimerRef.current = window.setTimeout(() => {
      if (myRequestId !== requestIdRef.current) return;

      const utterance = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
        // IMPORTANT: use the voice's OWN lang, not the requested `lang`
        // option. If the requested language (e.g. "en-IN") isn't installed
        // on this device, pickVoice() already fell back to whatever IS
        // installed (e.g. "en-US") — but forcing utterance.lang to the
        // unavailable "en-IN" while utterance.voice is actually an en-US
        // voice creates a mismatch that some Android Chrome builds handle
        // inconsistently (works sometimes, silently fails other times).
        // Keeping them in sync removes that as a source of flakiness.
        utterance.lang = voiceRef.current.lang;
      } else {
        utterance.lang = langRef.current;
      }
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

          // BUG FIX: verify resume() actually kept the audio going. On the
          // Android/Chrome builds where this nudge backfires, `speaking`
          // drops to false right after resume() with no event at all —
          // that silent drop IS the "5-6 words bol kar chup ho jata hai"
          // bug. Catch it here and restart just this chunk from scratch
          // instead of leaving the user with silence.
          window.setTimeout(() => {
            if (myRequestId !== requestIdRef.current) return;
            if (!window.speechSynthesis.speaking && !attemptSettledRef.current) {
              attemptSettledRef.current = true;
              if (keepAliveTimerRef.current) { window.clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
              scheduleRetryOrGiveUp(text, myRequestId);
            }
          }, 250);
        }, KEEPALIVE_INTERVAL_MS);
      };

      utterance.onend = () => {
        if (myRequestId !== requestIdRef.current) return;
        attemptSettledRef.current = true;
        clearAllTimers();
        // More chunks left in this reply? Chain straight into the next
        // one so it sounds like one continuous sentence, not separate
        // clips. Only when the whole queue is done do we actually stop.
        chunkIndexRef.current += 1;
        if (chunkIndexRef.current < queueRef.current.length) {
          attemptCountRef.current = 0;
          speakNextChunkRef.current(myRequestId);
        } else {
          setIsSpeaking(false);
          attemptCountRef.current = 0;
        }
      };

      utterance.onerror = () => {
        if (myRequestId !== requestIdRef.current) return;
        // Already handled by the watchdog (or a prior error) for this
        // exact attempt — don't schedule a second, parallel retry chain.
        if (attemptSettledRef.current) return;
        attemptSettledRef.current = true;
        setIsSpeaking(false);
        clearAllTimers();
        scheduleRetryOrGiveUp(text, myRequestId);
      };

      window.speechSynthesis.speak(utterance);

      // Watchdog: this is the core fix. If onstart hasn't fired by now,
      // the browser silently swallowed the call — no error, no event.
      // That's the actual root cause of "voice works, then goes silent
      // with no explanation." Detect it and retry.
      watchdogTimerRef.current = window.setTimeout(() => {
        if (myRequestId !== requestIdRef.current) return;
        // Already handled (e.g. onerror already fired for this attempt,
        // or it actually started) — don't double-schedule.
        if (attemptSettledRef.current) return;
        if (!startedRef.current) {
          // BUG FIX: onstart is just an event — it can lag behind the audio
          // actually playing. Before declaring this a silent failure and
          // cutting off real, in-progress speech, check the browser's own
          // "is it speaking right now" flag. If it says yes, treat that as
          // started instead of cancelling genuine audio mid-sentence.
          if ("speechSynthesis" in window && window.speechSynthesis.speaking) {
            startedRef.current = true;
            setIsSpeaking(true);
            return;
          }
          attemptSettledRef.current = true;
          scheduleRetryOrGiveUp(text, myRequestId);
        }
      }, START_TIMEOUT_MS);
    }, PRE_SPEAK_DELAY_MS);
  }, []);

  const scheduleRetryOrGiveUp = useCallback((text: string, myRequestId: number) => {
    if (myRequestId !== requestIdRef.current) return;
    if (attemptCountRef.current >= MAX_ATTEMPTS) {
      // Genuinely out of options this time. Previously this failed
      // completely silently — the text reply still showed on screen, but
      // there was no way to tell "voice didn't speak" apart from "voice
      // wasn't supposed to speak this time." Surface it so it's obvious
      // this is a device/browser issue (volume, TTS voice pack, background
      // tab audio focus) and not the app silently ignoring the toggle.
      toastError("Voice out nahi ho saka — device ka media volume aur Text-to-Speech voice pack check karein.");
      setIsSpeaking(false);
      attemptCountRef.current = 0;
      queueRef.current = [];
      chunkIndexRef.current = 0;
      return;
    }
    const delay = RETRY_BASE_DELAY_MS * attemptCountRef.current; // 250, 500, 750...
    window.setTimeout(() => attemptSpeak(text, myRequestId), delay);
  }, [attemptSpeak]);

  // Speaks whichever chunk the queue is currently pointing at. attemptSpeak
  // itself doesn't know about chunking at all — it just speaks whatever
  // single string it's given, with its own retry/watchdog protection.
  const speakNextChunk = useCallback((myRequestId: number) => {
    if (myRequestId !== requestIdRef.current) return;
    const chunk = queueRef.current[chunkIndexRef.current];
    if (chunk === undefined) {
      setIsSpeaking(false);
      return;
    }
    attemptSpeak(chunk, myRequestId);
  }, [attemptSpeak]);

  useEffect(() => { speakNextChunkRef.current = speakNextChunk; }, [speakNextChunk]);

  const speakInternal = useCallback((text: string) => {
    if (!isSupported || !text?.trim()) return;
    requestIdRef.current += 1;
    const myRequestId = requestIdRef.current;
    clearAllTimers();
    attemptCountRef.current = 0;
    queueRef.current = splitIntoChunks(text);
    chunkIndexRef.current = 0;
    speakNextChunk(myRequestId);
  }, [isSupported, speakNextChunk]);

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
