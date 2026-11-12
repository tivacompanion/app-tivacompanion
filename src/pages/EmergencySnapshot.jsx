import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Phone, Droplet, Pill, Heart, User, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EmergencySnapshot() {
  const { qrCodeId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSnapshot();
  }, [qrCodeId]);

  const loadSnapshot = async () => {
    try {
      const response = await base44.functions.invoke('emergencySnapshot', { qr_code_id: qrCodeId });
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unable to load emergency data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const diff = Date.now() - birth.getTime();
    const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    return age > 0 && age < 120 ? age : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: '#e0e0e0', borderTopColor: '#dc2626' }} />
          <p className="text-gray-600 text-sm font-medium">Loading emergency data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Data Unavailable</h1>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const age = calculateAge(data?.date_of_birth);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-red-600 px-5 py-4 flex items-center gap-3">
        <AlertTriangle className="w-7 h-7 text-white" strokeWidth={2.5} />
        <div>
          <h1 className="text-white font-bold text-lg leading-tight tracking-wide">EMERGENCY MEDICAL INFO</h1>
          <p className="text-red-100 text-xs">Tiva Health Companion</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {/* Patient Identity */}
        <div className="border-2 border-gray-900 rounded-xl p-5">
          <div className="flex items-center gap-4">
            {data?.avatar_url ? (
              <img src={data.avatar_url} alt="" className="w-16 h-16 rounded-full border-2 border-gray-300 object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-500" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">{data?.full_name || 'Unknown'}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                {age != null && <span>{age} yrs</span>}
                {data?.gender && <span className="capitalize">· {data.gender}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Blood Type */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
            <Droplet className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Blood Type</p>
            <p className="text-3xl font-bold text-red-900">{data?.blood_type || 'Unknown'}</p>
          </div>
        </div>

        {/* Allergies */}
        {data?.allergies?.length > 0 && (
          <div className="bg-red-600 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
              <h3 className="text-white font-bold text-base uppercase tracking-wide">Allergies</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.allergies.map((a, i) => (
                <span key={i} className="bg-white text-red-700 font-bold text-sm px-3 py-1.5 rounded-lg">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Chronic Conditions */}
        {data?.chronic_conditions?.length > 0 && (
          <div className="border-2 border-gray-300 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
              <h3 className="text-gray-900 font-bold text-base uppercase tracking-wide">Chronic Conditions</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.chronic_conditions.map((c, i) => (
                <span key={i} className="bg-gray-100 text-gray-800 font-semibold text-sm px-3 py-1.5 rounded-lg">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Physical Info */}
        {(data?.height_cm || data?.weight_kg) && (
          <div className="border-2 border-gray-300 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
              <h3 className="text-gray-900 font-bold text-base uppercase tracking-wide">Physical</h3>
            </div>
            <div className="flex gap-6">
              {data?.height_cm && (
                <div>
                  <p className="text-xs text-gray-500">Height</p>
                  <p className="text-lg font-bold text-gray-900">{data.height_cm} cm</p>
                </div>
              )}
              {data?.weight_kg && (
                <div>
                  <p className="text-xs text-gray-500">Weight</p>
                  <p className="text-lg font-bold text-gray-900">{data.weight_kg} kg</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medications */}
        {data?.medications?.length > 0 && (
          <div className="border-2 border-gray-300 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Pill className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
              <h3 className="text-gray-900 font-bold text-base uppercase tracking-wide">Current Medications</h3>
            </div>
            <div className="space-y-2">
              {data.medications.map((m, i) => (
                <div key={i} className="flex justify-between items-start py-1.5 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                    <p className="text-xs text-gray-600">{m.frequency}</p>
                  </div>
                  {m.dosage && <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{m.dosage}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        {data?.emergency_contacts?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-red-600" strokeWidth={2.5} />
              <h3 className="text-gray-900 font-bold text-base uppercase tracking-wide">Emergency Contacts</h3>
            </div>
            <div className="space-y-3">
              {[...data.emergency_contacts]
                .sort((a, b) => (a.tier || 1) - (b.tier || 1))
                .map((c, i) => (
                  <a
                    key={i}
                    href={`tel:${c.phone}`}
                    className="block bg-gray-900 rounded-xl p-4 active:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-base">{c.name}</p>
                        <p className="text-gray-300 text-xs">{c.relationship}</p>
                        <p className="text-white text-sm font-semibold mt-0.5">{c.phone}</p>
                      </div>
                      <div className="text-red-400 font-bold text-xs uppercase">Call</div>
                    </div>
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-gray-400">
            This emergency medical information is provided by the Tiva Health Companion app for use by first responders and medical personnel.
          </p>
        </div>
      </div>
    </div>
  );
}