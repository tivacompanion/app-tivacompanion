import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, ScanLine, AlertCircle } from 'lucide-react';

export default function CameraScanner({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  async function startCamera() {
    setError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setStreaming(true);
        };
      }
    } catch (e) {
      setError('Unable to access camera. Please allow camera permissions or use the upload option instead.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setCaptured({ file, url });
      stopCamera();
    }, 'image/jpeg', 0.92);
  }

  function retake() {
    if (captured) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    startCamera();
  }

  function confirm() {
    if (captured) {
      onCapture(captured.file);
      URL.revokeObjectURL(captured.url);
    }
  }

  function handleClose() {
    if (captured) URL.revokeObjectURL(captured.url);
    stopCamera();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="relative w-full max-w-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ScanLine size={22} className="text-tiva-teal" />
            <h3 className="font-heading text-lg font-bold text-white">Scan Document</h3>
          </div>
          <button onClick={handleClose} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
            <X size={18} className="text-white" />
          </button>
        </div>

        {error ? (
          <div className="tiva-card p-8 text-center">
            <AlertCircle size={40} className="mx-auto mb-3 text-amber" />
            <p className="text-sm text-white/80 mb-4">{error}</p>
            <button onClick={startCamera} className="tiva-navy-btn px-6 py-2.5 text-sm">Retry</button>
          </div>
        ) : captured ? (
          <>
            {/* Preview */}
            <div className="rounded-2xl overflow-hidden border border-white/10 mb-4" style={{ background: '#000' }}>
              <img src={captured.url} alt="Captured document" className="w-full max-h-[60vh] object-contain" />
            </div>
            <div className="flex gap-3">
              <button onClick={retake} className="flex-1 py-3.5 rounded-2xl font-heading font-semibold text-white transition-all bg-white/10 hover:bg-white/15 flex items-center justify-center gap-2">
                <RefreshCw size={18} /> Retake
              </button>
              <button onClick={confirm} className="flex-1 py-3.5 rounded-2xl font-heading font-semibold transition-all tiva-mint-btn flex items-center justify-center gap-2">
                <Check size={18} /> Use Photo
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Live Camera */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ background: '#000', aspectRatio: '4/3' }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {/* Scan frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-[85%] h-[80%]">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tiva-teal rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tiva-teal rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tiva-teal rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tiva-teal rounded-br-lg" />
                </div>
              </div>
              {!streaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
                </div>
              )}
            </div>
            <p className="text-center text-sm text-white/50 mt-3 mb-4">Position the document within the frame and tap capture</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                title="Switch camera"
              >
                <RefreshCw size={20} className="text-white" />
              </button>
              <button
                onClick={capturePhoto}
                disabled={!streaming}
                className="w-20 h-20 rounded-full border-4 border-tiva-teal bg-tiva-teal/20 flex items-center justify-center hover:bg-tiva-teal/40 transition-all disabled:opacity-40 active:scale-95"
              >
                <Camera size={32} className="text-white" />
              </button>
              <div className="w-12 h-12" />
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}