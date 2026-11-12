import { useState, useEffect, useRef } from 'react';
import { Moon, Armchair, Timer, CheckCircle, Loader2 } from 'lucide-react';
import { speak, cancel } from '@/utils/tts';

export default function HeartRatePreFlight({ onCleared }) {
  const [stage, setStage] = useState('greeting'); // greeting | resting_check | need_rest | cleared
  const timerRef = useRef(null);

  useEffect(() => {
    speak("Before we measure your resting heart rate, let's make sure conditions are right for an accurate reading. Is this your first check-in of the day, right after waking up?");
    return () => {
      cancel();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const proceedToMeasurement = (message) => {
    speak(message);
    setStage('cleared');
    timerRef.current = setTimeout(() => onCleared(), 3000);
  };

  const handleFirstOfDay = () => {
    proceedToMeasurement("Perfect. Measuring right after waking gives us the most accurate baseline. Let's begin your heart rate measurement.");
  };

  const handleLaterInDay = () => {
    speak("Since it's later in the day, I need to make sure you're properly rested. Have you been sitting quietly for at least the last 20 minutes?");
    setStage('resting_check');
  };

  const handleRested = () => {
    proceedToMeasurement("Great, thank you for confirming. Let's begin your heart rate measurement now.");
  };

  const handleNotRested = () => {
    speak("No problem. To get an accurate resting heart rate, please sit quietly without activity for 20 minutes, then come back to this test. Your health data matters, so let's make sure we get it right.");
    setStage('need_rest');
  };

  const handleProceedAnyway = () => {
    proceedToMeasurement("Understood. Let's proceed with the measurement.");
  };

  // CLEARED — transitioning to measurement
  if (stage === 'cleared') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-tiva-teal/15 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-tiva-teal animate-spin" />
        </div>
        <p className="font-heading font-semibold text-navy">Starting measurement…</p>
      </div>
    );
  }

  // NEED REST — user hasn't been resting
  if (stage === 'need_rest') {
    return (
      <div className="space-y-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-peach/15 flex items-center justify-center mx-auto mb-1">
          <Timer className="w-8 h-8 text-peach-deep" />
        </div>
        <h2 className="font-heading font-bold text-lg text-navy">Please rest first</h2>
        <p className="text-sm text-muted-foreground">
          For an accurate resting heart rate, sit quietly without activity for 20 minutes before taking this test. Your body needs time to settle into its true resting state.
        </p>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left">
          <p className="text-sm text-navy font-medium mb-2">Tips while you rest:</p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Sit comfortably with your back supported</li>
            <li>• Avoid caffeine or heavy meals</li>
            <li>• Breathe slowly and relax</li>
            <li>• Stay away from stressful situations</li>
          </ul>
        </div>
        <button
          onClick={handleProceedAnyway}
          className="w-full py-3 rounded-2xl font-heading font-semibold text-sm bg-white/5 text-muted-foreground hover:bg-white/10 transition-all"
        >
          Proceed anyway
        </button>
      </div>
    );
  }

  // RESTING CHECK — asking if they've been at rest
  if (stage === 'resting_check') {
    return (
      <div className="space-y-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-tiva-teal/15 flex items-center justify-center mx-auto mb-1">
          <Armchair className="w-8 h-8 text-tiva-teal" />
        </div>
        <h2 className="font-heading font-bold text-lg text-navy">Have you been resting?</h2>
        <p className="text-sm text-muted-foreground">
          For an accurate reading, you should have been sitting quietly for at least 20 minutes without activity.
        </p>
        <div className="space-y-3">
          <button
            onClick={handleRested}
            className="w-full py-4 rounded-2xl font-heading font-semibold text-sm bg-tiva-teal text-[#0A0F0D] hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" /> Yes, I've been resting
          </button>
          <button
            onClick={handleNotRested}
            className="w-full py-3 rounded-2xl font-heading font-semibold text-sm bg-white/5 text-muted-foreground hover:bg-white/10 transition-all"
          >
            Not yet
          </button>
        </div>
      </div>
    );
  }

  // GREETING — first question
  return (
    <div className="space-y-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-tiva-teal/15 flex items-center justify-center mx-auto mb-1">
        <Moon className="w-8 h-8 text-tiva-teal" />
      </div>
      <h2 className="font-heading font-bold text-lg text-navy">Resting Heart Rate</h2>
      <p className="text-sm text-muted-foreground">
        To get an accurate reading, this test works best when your body is in a truly resting state. Let's make sure conditions are right.
      </p>
      <div className="space-y-3">
        <button
          onClick={handleFirstOfDay}
          className="w-full py-4 rounded-2xl font-heading font-semibold text-sm bg-tiva-teal text-[#0A0F0D] hover:brightness-110 transition-all flex items-center justify-center gap-2"
        >
          <Moon className="w-5 h-5" /> Yes, just woke up
        </button>
        <button
          onClick={handleLaterInDay}
          className="w-full py-3 rounded-2xl font-heading font-semibold text-sm bg-white/5 text-muted-foreground hover:bg-white/10 transition-all"
        >
          No, it's later in the day
        </button>
      </div>
    </div>
  );
}