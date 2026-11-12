import { ArrowUpDown, ShieldAlert, Calendar, Pill } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'risk', label: 'Risk Level', icon: ShieldAlert },
  { value: 'last_checkin', label: 'Last Check-in', icon: Calendar },
  { value: 'medications', label: 'Medications', icon: Pill },
];

const RISK_FILTERS = [
  { value: 'all', label: 'All Patients' },
  { value: 'red', label: 'Red' },
  { value: 'amber', label: 'Amber' },
  { value: 'green', label: 'Green' },
  { value: 'no_meds', label: 'No Meds' },
];

export default function PatientSortControls({ sortBy, onSortChange, riskFilter, onRiskFilterChange, resultCount }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {/* Sort */}
      <div className="flex items-center gap-1 bg-card/50 backdrop-blur-md rounded-xl border border-white/10 p-1">
        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground ml-2 mr-0.5" />
        <span className="text-xs text-muted-foreground mr-1">Sort:</span>
        {SORT_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const active = sortBy === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active ? 'bg-tiva-teal text-[#0A0F0D]' : 'text-muted-foreground hover:text-navy'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {opt.label}
            </button>
          );
        })}
      </div>

      {/* Risk filter */}
      <div className="flex items-center gap-1 bg-card/50 backdrop-blur-md rounded-xl border border-white/10 p-1">
        <span className="text-xs text-muted-foreground mx-2">Filter:</span>
        {RISK_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => onRiskFilterChange(f.value)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              riskFilter === f.value
                ? f.value === 'red' ? 'bg-destructive/20 text-destructive' :
                  f.value === 'amber' ? 'bg-peach text-peach-deep' :
                  f.value === 'green' ? 'bg-mint text-mint-deep' :
                  f.value === 'no_meds' ? 'bg-white/15 text-white' :
                  'bg-tiva-teal text-[#0A0F0D]'
                : 'text-muted-foreground hover:text-navy'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <span className="text-xs text-muted-foreground ml-auto">{resultCount} patient{resultCount === 1 ? '' : 's'}</span>
    </div>
  );
}