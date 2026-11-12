import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Volume2, Vibrate, RotateCcw, Play, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import {
  useAlertSoundSettings,
  DEFAULT_ALERT_SETTINGS,
  VIBRATION_PRESETS,
} from '@/hooks/useAlertSoundSettings';
import { useInstitutionAlertSound } from '@/hooks/useInstitutionAlertSound';

const LEVEL_CONFIG = [
  {
    level: 'red',
    label: 'Urgent (Red)',
    description: 'Critical health changes, emergencies',
    icon: AlertTriangle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
  },
  {
    level: 'amber',
    label: 'Attention (Amber)',
    description: 'Missed medications, concerning trends',
    icon: AlertCircle,
    color: 'text-peach-deep',
    bg: 'bg-peach/10',
    border: 'border-peach-deep/20',
  },
  {
    level: 'green',
    label: 'Routine (Green)',
    description: 'Stable readings, normal updates',
    icon: CheckCircle,
    color: 'text-mint-deep',
    bg: 'bg-mint/10',
    border: 'border-mint-deep/20',
  },
];

const VIBRATION_OPTIONS = [
  { label: 'Short', value: 'short' },
  { label: 'Medium', value: 'medium' },
  { label: 'Long', value: 'long' },
  { label: 'Intense', value: 'intense' },
];

export default function AlertSoundSettingsModal({ open, onClose }) {
  const { settings, updateLevel, resetSettings } = useAlertSoundSettings();
  const { playAlert } = useInstitutionAlertSound(settings);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleTest = useCallback((level) => {
    playAlert(level);
  }, [playAlert]);

  const handleReset = () => {
    resetSettings();
    setConfirmReset(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-tiva-teal" />
            Alert Sound &amp; Vibration
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Customize how staff are notified for each alert severity level.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {LEVEL_CONFIG.map(({ level, label, description, icon: Icon, color, bg, border }) => {
            const config = settings[level] || DEFAULT_ALERT_SETTINGS[level];
            return (
              <div key={level} className={`rounded-2xl border ${border} ${bg} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="font-heading font-semibold text-sm text-navy">{label}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTest(level)}
                    className="h-7 px-2 text-xs"
                  >
                    <Play className="w-3 h-3 mr-1" /> Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{description}</p>

                {/* Sound toggle */}
                <div className="space-y-2.5">
                  <label className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Volume2 className="w-3 h-3" /> Sound
                    </span>
                    <button
                      onClick={() => updateLevel(level, { soundEnabled: !config.soundEnabled })}
                      className={`relative w-9 h-5 rounded-full transition-colors ${config.soundEnabled ? 'bg-tiva-teal' : 'bg-white/15'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.soundEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </label>

                  {config.soundEnabled && (
                    <div className="pl-5 space-y-2">
                      <label className="block">
                        <span className="text-[10px] text-muted-foreground">Volume: {Math.round(config.volume * 100)}%</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={config.volume}
                          onChange={(e) => updateLevel(level, { volume: parseFloat(e.target.value) })}
                          className="w-full h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer accent-tiva-teal"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-muted-foreground">Pitch: {config.frequency} Hz</span>
                        <input
                          type="range"
                          min="200"
                          max="1200"
                          step="20"
                          value={config.frequency}
                          onChange={(e) => updateLevel(level, { frequency: parseInt(e.target.value) })}
                          className="w-full h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer accent-tiva-teal"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Vibration toggle */}
                <div className="mt-3 space-y-2.5">
                  <label className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Vibrate className="w-3 h-3" /> Vibration
                    </span>
                    <button
                      onClick={() => updateLevel(level, { vibrationEnabled: !config.vibrationEnabled })}
                      className={`relative w-9 h-5 rounded-full transition-colors ${config.vibrationEnabled ? 'bg-tiva-teal' : 'bg-white/15'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.vibrationEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </label>

                  {config.vibrationEnabled && (
                    <div className="pl-5">
                      <div className="flex gap-1 flex-wrap">
                        {VIBRATION_OPTIONS.map(opt => {
                          const isActive = JSON.stringify(config.vibrationPattern) === JSON.stringify(VIBRATION_PRESETS[opt.value]);
                          return (
                            <button
                              key={opt.value}
                              onClick={() => updateLevel(level, { vibrationPattern: VIBRATION_PRESETS[opt.value] })}
                              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${isActive ? 'bg-tiva-teal text-[#0A0F0D]' : 'bg-white/5 text-muted-foreground hover:text-navy'}`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">Vibration works on supported mobile devices.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex items-center justify-between">
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Reset to defaults?</span>
              <Button size="sm" variant="outline" onClick={() => setConfirmReset(false)} className="h-7 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleReset} className="h-7 text-xs bg-tiva-teal text-[#0A0F0D]">
                <RotateCcw className="w-3 h-3 mr-1" /> Confirm
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)} className="text-xs text-muted-foreground hover:text-navy">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset to defaults
            </Button>
          )}
          <Button onClick={onClose} className="bg-tiva-teal text-[#0A0F0D]">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}