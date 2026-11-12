import { useRef, useCallback, useEffect } from 'react';

/**
 * Generates a repeating ring-style alarm tone using the Web Audio API.
 * No external audio files needed.
 */
export function useAlarmSound() {
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const oscillatorsRef = useRef([]);

  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playRing = useCallback(() => {
    const ctx = ensureCtx();
    const now = ctx.currentTime;

    // Two-tone ring (like a phone ring): 800Hz then 600Hz
    const tones = [
      { freq: 800, start: 0, dur: 0.15 },
      { freq: 600, start: 0.18, dur: 0.15 },
    ];

    tones.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.4, now + start + 0.02);
      gain.gain.setValueAtTime(0.4, now + start + dur - 0.02);
      gain.gain.linearRampToValueAtTime(0, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  }, [ensureCtx]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    ensureCtx();
    playRing();
    // Repeat the ring pattern every 1.2 seconds
    intervalRef.current = setInterval(playRing, 1200);
  }, [playRing, ensureCtx]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Stop any active oscillators
    oscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
    oscillatorsRef.current = [];
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { start, stop };
}