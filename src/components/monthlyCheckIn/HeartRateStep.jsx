import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Camera, Loader2, AlertCircle, Hand } from 'lucide-react';
import HeartRatePreFlight from './HeartRatePreFlight';

const MEASUREMENT_DURATION = 30; // seconds
const MIN_HR = 30;
const MAX_HR = 200;

export default function HeartRateStep({ value, captureMethod, onChange, onCaptureMethodChange }) {
  const [preFlightCleared, setPreFlightCleared] = useState(false);
  const [compatState, setCompatState] = useState('checking'); // checking | outcome_a | outcome_b | outcome_c
  const [measuring, setMeasuring] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [signalQuality, setSignalQuality] = useState('good');
  const [error, setError] = useState('');
  const [manualValue, setManualValue] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const redValuesRef = useRef([]);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const restartUsedRef = useRef(false);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Device compatibility check — runs after pre-flight is cleared
  useEffect(() => {
    if (!preFlightCleared) return;
    runCompatCheck();
  }, [preFlightCleared]);

  const runCompatCheck = async () => {
    setCompatState('checking');
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(d => d.kind === 'videoinput');
      if (!hasVideoInput) { setCompatState('outcome_c'); return; }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};

      const width = settings.width || 0;
      const height = settings.height || 0;
      const megapixels = (width * height) / 1000000;
      const hasFlash = capabilities.torch !== undefined;
      const frameRate = settings.frameRate || 0;

      stream.getTracks().forEach(t => t.stop());

      if (megapixels < 8 || frameRate < 30) {
        setCompatState('outcome_c');
      } else if (!hasFlash) {
        setCompatState('outcome_b');
      } else {
        setCompatState('outcome_a');
      }
    } catch (e) {
      setCompatState('outcome_c');
    }
  };

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setMeasuring(false);
  }, []);

  const startMeasurement = async () => {
    setError('');
    setMeasuring(true);
    setElapsed(0);
    redValuesRef.current = [];
    restartUsedRef.current = false;
    startTimeRef.current = Date.now();

    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          frameRate: { ideal: 60 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Enable torch if available (outcome A)
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (compatState === 'outcome_a' && capabilities.torch) {
        try { await track.applyConstraints({ advanced: [{ torch: true }] }); } catch {}
      }

      captureFrame();
    } catch (e) {
      setError('Camera access failed. You can enter your pulse manually.');
      setCompatState('outcome_c');
      setMeasuring(false);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !measuring) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
    setElapsed(Math.min(elapsedSec, MEASUREMENT_DURATION));

    if (elapsedSec >= MEASUREMENT_DURATION) {
      finishMeasurement();
      return;
    }

    const cw = 100, ch = 100;
    canvas.width = cw;
    canvas.height = ch;

    try {
      const sx = (video.videoWidth - cw) / 2;
      const sy = (video.videoHeight - ch) / 2;
      ctx.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
      const imageData = ctx.getImageData(0, 0, cw, ch);
      const data = imageData.data;

      let redSum = 0;
      const pixelCount = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        redSum += data[i];
      }
      const avgRed = redSum / pixelCount;
      redValuesRef.current.push(avgRed);

      // Check signal quality for sudden jumps
      const vals = redValuesRef.current;
      if (vals.length > 5) {
        const recent = vals.slice(-5);
        const maxJump = Math.max(...recent) - Math.min(...recent);
        if (maxJump > 30) {
          setSignalQuality('poor');
          // After 15 seconds of poor signal, restart once
          if (elapsedSec > 15 && !restartUsedRef.current) {
            restartUsedRef.current = true;
            redValuesRef.current = [];
            startTimeRef.current = Date.now();
            setElapsed(0);
          }
        } else {
          setSignalQuality('good');
        }
      }
    } catch {}

    animFrameRef.current = requestAnimationFrame(captureFrame);
  };

  const finishMeasurement = () => {
    stopCamera();

    const redValues = redValuesRef.current;
    if (redValues.length < 30) {
      setError('Measurement too short. Please try again or enter manually.');
      setCompatState('outcome_c');
      return;
    }

    // Peak detection
    const bpm = detectHeartRate(redValues);
    if (!bpm || bpm < MIN_HR || bpm > MAX_HR) {
      setError(`Reading out of range (${bpm || 'unknown'} bpm). Please try again or enter manually.`);
      setCompatState('outcome_c');
      return;
    }

    onChange(bpm);
    onCaptureMethodChange(compatState === 'outcome_a' ? 'camera-high' : 'camera-medium');
  };

  const detectHeartRate = (values) => {
    // Smooth the signal with a moving average
    const smoothed = [];
    const window = 3;
    for (let i = 0; i < values.length; i++) {
      let sum = 0, count = 0;
      for (let j = Math.max(0, i - window); j <= Math.min(values.length - 1, i + window); j++) {
        sum += values[j];
        count++;
      }
      smoothed.push(sum / count);
    }

    // Find peaks
    const peaks = [];
    const threshold = (Math.max(...smoothed) + Math.min(...smoothed)) / 2;
    for (let i = 1; i < smoothed.length - 1; i++) {
      if (smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1] && smoothed[i] > threshold) {
        peaks.push(i);
      }
    }

    if (peaks.length < 2) return null;

    // Calculate average interval and convert to BPM
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Estimate FPS from elapsed time and sample count
    const fps = values.length / MEASUREMENT_DURATION;
    const bpm = Math.round((60 * fps) / avgInterval);

    return bpm;
  };

  const handleManualChange = (val) => {
    setManualValue(val);
    const num = parseInt(val, 10);
    if (val === '') { setError(''); onChange(null); return; }
    if (isNaN(num) || num < MIN_HR || num > MAX_HR) {
      setError(`Heart rate must be between ${MIN_HR} and ${MAX_HR} bpm.`);
      return;
    }
    setError('');
    onChange(num);
    onCaptureMethodChange('manual');
  };

  // PRE-FLIGHT — voice-guided rest check before measurement
  if (!preFlightCleared) {
    return <HeartRatePreFlight onCleared={() => setPreFlightCleared(true)} />;
  }

  // CHECKING state
  if (compatState === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-10 h-10 text-tiva-teal animate-spin" />
        <p className="font-heading font-semibold text-navy">Checking your device…</p>
      </div>
    );
  }

  // OUTCOME C — manual entry
  if (compatState === 'outcome_c') {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-peach/15 flex items-center justify-center mx-auto mb-4">
            <Hand className="w-8 h-8 text-peach-deep" />
          </div>
          <h2 className="font-heading font-bold text-lg text-navy mb-1">Resting Heart Rate</h2>
          <p className="text-sm text-muted-foreground">Your device camera is not supported for heart rate reading. You can enter your pulse manually instead.</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-navy font-medium mb-1">Count your heartbeats for 60 seconds and enter the number below.</p>
          <p className="text-xs text-muted-foreground">Find your pulse on your wrist or neck, count the beats for one minute.</p>
        </div>

        <div>
          <input
            type="number"
            inputMode="numeric"
            className="tiva-input text-center text-3xl font-bold"
            value={manualValue}
            onChange={e => handleManualChange(e.target.value)}
            placeholder="72"
            autoFocus
          />
          <p className="text-center text-xs text-muted-foreground mt-2">Beats per minute</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {value && !error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-mint/15 text-mint-deep text-sm">
            <Heart className="w-4 h-4" /> {value} bpm — recorded
          </div>
        )}

        <button
          onClick={() => { onChange(null); onCaptureMethodChange('skipped'); }}
          className="w-full py-3 rounded-2xl font-heading font-semibold text-sm bg-white/5 text-muted-foreground hover:bg-white/10 transition-all"
        >
          Skip heart rate test
        </button>
      </div>
    );
  }

  // OUTCOME A or B — camera measurement
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-tiva-teal/15 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-tiva-teal" />
        </div>
        <h2 className="font-heading font-bold text-lg text-navy mb-1">Resting Heart Rate</h2>
        <p className="text-sm text-muted-foreground">Place your fingertip over the rear camera for 30 seconds.</p>
      </div>

      {compatState === 'outcome_b' && (
        <div className="p-3 rounded-xl bg-peach/10 border border-peach/20 text-peach-deep text-sm">
          Your device torch is not available. Find a well-lit area and keep your finger very still for the best result.
        </div>
      )}

      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {measuring ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-20 h-20 rounded-full bg-tiva-teal/15 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-4 border-tiva-teal/30" />
              <div
                className="absolute inset-0 rounded-full border-4 border-tiva-teal border-t-transparent animate-spin"
                style={{ animationDuration: '2s' }}
              />
              <Heart className="w-8 h-8 text-tiva-teal animate-pulse" />
            </div>
            <p className="font-heading font-bold text-2xl text-navy">{elapsed.toFixed(0)}s</p>
            <p className="text-sm text-muted-foreground">Keep your finger still on the camera…</p>
            {signalQuality === 'poor' && (
              <p className="text-xs text-peach-deep animate-pulse">⚠ Please keep still for a better reading.</p>
            )}
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-tiva-teal transition-all duration-100"
              style={{ width: `${(elapsed / MEASUREMENT_DURATION) * 100}%` }}
            />
          </div>
          <button
            onClick={() => { stopCamera(); setMeasuring(false); }}
            className="w-full py-3 rounded-2xl font-heading font-semibold text-sm bg-white/5 text-muted-foreground hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
        </div>
      ) : value ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-20 h-20 rounded-full bg-mint flex items-center justify-center">
              <Heart className="w-10 h-10 text-mint-deep" />
            </div>
            <p className="font-heading font-bold text-3xl text-navy">{value} <span className="text-lg text-muted-foreground">bpm</span></p>
            <p className="text-xs text-muted-foreground">
              Capture method: {captureMethod === 'camera-high' ? 'Camera (high confidence)' : 'Camera (medium confidence)'}
            </p>
          </div>
          <button
            onClick={startMeasurement}
            className="w-full py-3 rounded-2xl font-heading font-semibold text-sm bg-white/5 text-muted-foreground hover:bg-white/10 transition-all"
          >
            Measure again
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={startMeasurement}
            className="w-full py-4 rounded-2xl font-heading font-semibold text-sm bg-tiva-teal text-[#0A0F0D] hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" /> Start camera measurement
          </button>
          <button
            onClick={() => setCompatState('outcome_c')}
            className="w-full py-3 rounded-2xl font-heading font-semibold text-sm bg-white/5 text-muted-foreground hover:bg-white/10 transition-all"
          >
            Enter manually instead
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}