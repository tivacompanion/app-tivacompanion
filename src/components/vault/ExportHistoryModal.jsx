import { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ExportHistoryModal({ onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const presets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 3 months', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'Last year', days: 365 },
  ];

  const applyPreset = (days) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both dates');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setExporting(true);
    setError('');
    try {
      const { jsPDF } = await import('jspdf');
      const [readings, profiles] = await Promise.all([
        base44.entities.HealthReading.list('-recorded_at', 50).catch(() => []),
        base44.entities.HealthProfile.list().catch(() => []),
      ]);
      const profile = profiles[0];

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(64, 201, 162);
      doc.text('Tiva Health Companion', 20, 22);

      doc.setFontSize(14);
      doc.setTextColor(23, 23, 23);
      doc.text('Medical History & Biometrics Report', 20, 32);

      // Metadata
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Patient: ${profile?.full_name || 'Patient'}`, 20, 42);
      doc.text(`Date of Birth: ${profile?.date_of_birth || 'N/A'} · Blood Type: ${profile?.blood_type || 'Unknown'}`, 20, 48);
      doc.text(`Report Period: ${startDate} to ${endDate}`, 20, 54);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 60);

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 66, 190, 66);

      // Readings Table
      doc.setFontSize(12);
      doc.setTextColor(23, 23, 23);
      doc.text('Recent Biometric Readings', 20, 76);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Date', 20, 84);
      doc.text('Metric', 65, 84);
      doc.text('Value', 120, 84);
      doc.text('Risk', 160, 84);
      doc.line(20, 86, 190, 86);

      let y = 94;
      const filtered = readings.filter(r => {
        const d = (r.recorded_at || r.created_date || '').slice(0, 10);
        return (!startDate || d >= startDate) && (!endDate || d <= endDate);
      });

      const list = filtered.length > 0 ? filtered : readings.slice(0, 12);

      if (list.length === 0) {
        doc.text('No biometric readings logged during this period.', 20, y);
      } else {
        list.slice(0, 20).forEach(r => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          const dateStr = (r.recorded_at || r.created_date || '').slice(0, 10);
          const metricStr = (r.metric_type || '').replace(/_/g, ' ');
          const valStr = `${r.value} ${r.unit || ''}`.trim();
          const riskStr = (r.risk_level || 'normal').toUpperCase();

          doc.setTextColor(71, 85, 105);
          doc.text(dateStr, 20, y);
          doc.text(metricStr, 65, y);
          doc.text(valStr, 120, y);
          doc.text(riskStr, 160, y);
          y += 8;
        });
      }

      doc.save(`Tiva_History_${startDate}_to_${endDate}.pdf`);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-card rounded-3xl border border-white/10 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-tiva-teal/15 flex items-center justify-center">
              <Download className="w-4 h-4 text-tiva-teal" />
            </div>
            <h2 className="font-heading font-bold text-lg text-navy">Export Medical History</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Generate a detailed PDF report of your health data for a selected time frame.
        </p>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-5">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:bg-tiva-teal/15 hover:text-tiva-teal transition-all border border-white/5"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date inputs */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tiva-teal/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-tiva-teal/40"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-muted-foreground font-medium text-sm hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-tiva-teal text-[#0A0F0D] font-heading font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50"
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Download className="w-4 h-4" /> Export PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}