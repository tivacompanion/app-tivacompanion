import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, X } from 'lucide-react';
import { RiskBadge } from '@/components/ui/primitives';

export default function PatientSearchBar({ patients }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getRisk = (p) => {
    if (p.active_alerts?.some(a => a.severity === 'red')) return 'red';
    if (p.active_alerts?.length > 0) return 'amber';
    return 'green';
  };

  const results = query.trim()
    ? patients.filter(p => {
        const q = query.toLowerCase();
        return (
          p.profile?.full_name?.toLowerCase().includes(q) ||
          p.profile?.blood_type?.toLowerCase().includes(q) ||
          p.profile?.care_mode?.toLowerCase().includes(q) ||
          p.assigned_caregivers?.some(ac => ac.caregiver_name?.toLowerCase().includes(q))
        );
      }).slice(0, 8)
    : [];

  const handleSelect = (patientId) => {
    setQuery('');
    setFocused(false);
    navigate(`/institution/patient/${patientId}`);
  };

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search patients by name, blood type, caregiver..."
          className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-9 py-2.5 text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:border-tiva-teal/50 focus:bg-white/8 transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setFocused(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl border border-white/10 shadow-xl z-50 overflow-hidden animate-fade-in">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No patients found</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.map(p => (
                <button
                  key={p.profile.id}
                  onClick={() => handleSelect(p.patient_user_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  <div className="w-9 h-9 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold text-sm flex-shrink-0">
                    {p.profile.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{p.profile.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.profile.blood_type || 'N/A'} blood · {p.med_count} meds · {p.reading_count} readings
                    </p>
                  </div>
                  <RiskBadge level={getRisk(p)} size="sm" />
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}