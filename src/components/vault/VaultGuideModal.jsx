import { Info, X, Upload, Camera, QrCode, FileText, ShieldCheck } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'Upload Documents',
    text: 'Tap Upload to add prescriptions, lab results, hospital reports, or any medical file from your device.',
  },
  {
    icon: Camera,
    title: 'Scan Physical Documents',
    text: 'Use Scan to capture a physical document with your camera and add it to the vault instantly.',
  },
  {
    icon: FileText,
    title: 'AI Summaries & Warnings',
    text: "Tiva's AI reads each uploaded document, provides a plain-language summary, and flags any contraindication warnings.",
  },
  {
    icon: QrCode,
    title: 'Emergency QR Card',
    text: 'Generate a QR health card with your key medical info to share with doctors in emergencies.',
  },
  {
    icon: ShieldCheck,
    title: 'Tap to View Details',
    text: 'Tap any document to see the full AI explanation, original file, and any flagged warnings.',
  },
];

export default function VaultGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-card rounded-3xl border border-tiva-teal/20 shadow-2xl p-6 animate-settle max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-navy" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-tiva-teal/15 flex items-center justify-center">
            <Info className="w-5.5 h-5.5 text-tiva-teal" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-navy">How to use your Vault</h2>
            <p className="text-sm text-muted-foreground">Everything you need to know in a few steps</p>
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-lavender flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-lavender-deep" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm text-navy">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 tiva-mint-btn py-3 text-sm"
        >
          Got it, let's start
        </button>
      </div>
    </div>
  );
}