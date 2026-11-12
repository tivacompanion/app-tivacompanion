import { useState, useCallback } from 'react';

const STORAGE_KEY = 'tiva_institution_alert_settings';

export const DEFAULT_ALERT_SETTINGS = {
  red: {
    soundEnabled: true,
    volume: 0.5,
    frequency: 880,
    vibrationEnabled: true,
    vibrationPattern: [200, 100, 200, 100, 200],
  },
  amber: {
    soundEnabled: true,
    volume: 0.25,
    frequency: 600,
    vibrationEnabled: true,
    vibrationPattern: [100, 50, 100],
  },
  green: {
    soundEnabled: false,
    volume: 0.1,
    frequency: 440,
    vibrationEnabled: false,
    vibrationPattern: [50],
  },
};

const VIBRATION_PRESETS = {
  short: [50],
  medium: [100, 50, 100],
  long: [200, 100, 200, 100, 200],
  intense: [300, 100, 300, 100, 300, 100, 500],
};

export { VIBRATION_PRESETS };

export function useAlertSoundSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_ALERT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_ALERT_SETTINGS;
  });

  const persist = useCallback((next) => {
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const updateLevel = useCallback((level, updates) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        [level]: { ...prev[level], ...updates },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    persist(DEFAULT_ALERT_SETTINGS);
  }, [persist]);

  return { settings, updateLevel, resetSettings };
}