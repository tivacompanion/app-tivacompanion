import { useRef, useCallback, useEffect } from 'react';
import { DEFAULT_ALERT_SETTINGS } from './useAlertSoundSettings';

/**
 * Plays one-shot alert sounds and triggers vibration based on
 * per-severity settings. Used by the institution portal.
 */
export function useInstitutionAlertSound(settings) {
  const audioCtxRef = useRef(null);

  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((frequency, volume, duration, type = 'sine') => {
    const ctx = ensureCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.setValueAtTime(volume, now + Math.max(duration - 0.02, 0.01));
    gain.gain.linearRampToValueAtTime(0, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }, [ensureCtx]);

  const playAlert = useCallback((severity) => {
    const config = (settings || DEFAULT_ALERT_SETTINGS)[severity];
    if (!config) return;

    if (config.soundEnabled && config.volume > 0) {
      if (severity === 'red') {
        playTone(config.frequency, config.volume, 0.15, 'sine');
        setTimeout(() => playTone(config.frequency * 0.75, config.volume, 0.15, 'sine'), 180);
        setTimeout(() => playTone(config.frequency, config.volume, 0.15, 'sine'), 400);
      } else if (severity === 'amber') {
        playTone(config.frequency, config.volume, 0.25, 'sine');
        setTimeout(() => playTone(config.frequency, config.volume, 0.2, 'sine'), 300);
      } else {
        playTone(config.frequency, config.volume, 0.35, 'triangle');
      }
    }

    if (config.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(config.vibrationPattern);
    }
  }, [settings, playTone]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  return { playAlert };
}