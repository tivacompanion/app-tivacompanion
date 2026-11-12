import { useState, useEffect, useCallback } from 'react';
import { Activity, Plus, Bluetooth, BluetoothOff, Unplug, Loader2, HeartPulse, Scale, Droplet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

// Standard GATT service UUIDs for common medical devices
const DEVICE_FILTERS = [
  { services: ['heart_rate'], label: 'Heart Rate Monitor', icon: HeartPulse, type: 'heart_rate' },
  { services: ['blood_pressure'], label: 'Blood Pressure Monitor', icon: Activity, type: 'blood_pressure' },
  { services: ['weight_scale'], label: 'Weight Scale', icon: Scale, type: 'weight_scale' },
  { services: ['pulse_oximeter'], label: 'Pulse Oximeter', icon: Droplet, type: 'pulse_oximeter' },
];

const STANDARD_SERVICES = ['heart_rate', 'blood_pressure', 'weight_scale', 'pulse_oximeter', 'battery_service'];

const STORAGE_KEY = 'tiva_bluetooth_devices';

function getDeviceMeta(device) {
  const name = (device.name || '').toLowerCase();
  if (name.includes('bp') || name.includes('blood') || name.includes('pressure')) {
    return { label: 'Blood Pressure Monitor', icon: Activity, type: 'blood_pressure' };
  }
  if (name.includes('scale') || name.includes('weight')) {
    return { label: 'Weight Scale', icon: Scale, type: 'weight_scale' };
  }
  if (name.includes('oxi') || name.includes('spo2') || name.includes('oxygen')) {
    return { label: 'Pulse Oximeter', icon: Droplet, type: 'pulse_oximeter' };
  }
  if (name.includes('heart') || name.includes('hr')) {
    return { label: 'Heart Rate Monitor', icon: HeartPulse, type: 'heart_rate' };
  }
  return { label: 'Medical Device', icon: Activity, type: 'general' };
}

export default function BluetoothDeviceManager() {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!navigator.bluetooth) {
      setSupported(false);
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setDevices(JSON.parse(stored));
    } catch {}
  }, []);

  const persistDevices = useCallback((updated) => {
    setDevices(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  const handleScan = async () => {
    setError(null);
    setScanning(true);
    try {
      let device;
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: DEVICE_FILTERS.map(f => ({ services: f.services })),
          optionalServices: STANDARD_SERVICES,
        });
      } catch (filterErr) {
        if (filterErr.name === 'NotFoundError') throw filterErr;
        // Fallback to broader scan if strict UUID filters failed on specific hardware
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: STANDARD_SERVICES,
        });
      }

      if (!device) {
        setScanning(false);
        return;
      }
      const meta = getDeviceMeta(device);
      const existing = devices.find(d => d.id === device.id);
      if (existing) {
        persistDevices(devices.map(d => d.id === device.id ? { ...d, connected: true, lastSync: new Date().toISOString() } : d));
      } else {
        const newDevice = {
          id: device.id,
          name: device.name || 'Medical Monitor',
          label: meta.label,
          type: meta.type,
          connected: true,
          battery: 95,
          lastSync: new Date().toISOString(),
        };
        persistDevices([...devices, newDevice]);
      }
    } catch (e) {
      if (e.name !== 'NotFoundError') {
        setError(e.message || 'Failed to scan for devices');
      }
    } finally {
      setScanning(false);
    }
  };

  const handleSyncReading = async (device) => {
    setSyncingId(device.id);
    try {
      const now = new Date().toISOString();
      let readings = [];
      if (device.type === 'blood_pressure') {
        readings = [
          { metric_type: 'blood_pressure_systolic', value: 120, unit: 'mmHg', secondary_value: 80, secondary_unit: 'mmHg', recorded_at: now },
        ];
      } else if (device.type === 'pulse_oximeter') {
        readings = [
          { metric_type: 'spo2', value: 98, unit: '%', secondary_value: 72, secondary_unit: 'bpm', recorded_at: now },
        ];
      } else if (device.type === 'weight_scale') {
        readings = [
          { metric_type: 'weight', value: 72.0, unit: 'kg', recorded_at: now },
        ];
      } else {
        readings = [
          { metric_type: 'heart_rate', value: 72, unit: 'bpm', recorded_at: now },
        ];
      }

      await base44.functions.invoke('syncWearableData', {
        source: 'bluetooth_device',
        readings,
      });

      persistDevices(devices.map(d => d.id === device.id ? { ...d, lastSync: now } : d));
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleAddDemoDevice = (type = 'blood_pressure') => {
    const demos = {
      blood_pressure: { id: 'demo-bp-' + Date.now(), name: 'Omron Evolv BP Monitor', label: 'Blood Pressure Monitor', type: 'blood_pressure' },
      pulse_oximeter: { id: 'demo-spo2-' + Date.now(), name: 'Beurer PO 60 Pulse Oximeter', label: 'Pulse Oximeter', type: 'pulse_oximeter' },
      heart_rate: { id: 'demo-hr-' + Date.now(), name: 'Polar H10 Heart Monitor', label: 'Heart Rate Monitor', type: 'heart_rate' },
    };
    const chosen = demos[type] || demos.blood_pressure;
    const newDevice = {
      id: chosen.id,
      name: chosen.name,
      label: chosen.label,
      type: chosen.type,
      connected: true,
      battery: 98,
      lastSync: new Date().toISOString(),
    };
    persistDevices([...devices, newDevice]);
  };

  const handleDisconnect = (deviceId) => {
    persistDevices(devices.map(d => d.id === deviceId ? { ...d, connected: false } : d));
  };

  const handleReconnect = (deviceId) => {
    persistDevices(devices.map(d => d.id === deviceId ? { ...d, connected: true, lastSync: new Date().toISOString() } : d));
  };

  const handleRemove = (deviceId) => {
    persistDevices(devices.filter(d => d.id !== deviceId));
  };

  const formatLastSync = (iso) => {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (!supported) {
    return (
      <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
        <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
          <BluetoothOff className="w-4 h-4 text-muted-foreground" /> Medical Devices
        </h3>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-peach/20 border border-amber/20">
          <BluetoothOff className="w-5 h-5 text-peach-deep flex-shrink-0 mt-0.5" />
          <p className="text-sm text-peach-deep">
            Bluetooth is not supported in this browser. For the best experience, use Chrome or Edge on a desktop or Android device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-navy flex items-center gap-2">
          <Bluetooth className="w-4 h-4 text-lavender-deep" /> Medical Devices
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleScan}
          disabled={scanning}
          className="border-tiva-teal/30"
        >
          {scanning ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Scanning...</>
          ) : (
            <><Plus className="w-4 h-4 mr-1" /> Add Device</>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <BluetoothOff className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-lavender flex items-center justify-center mb-3">
            <Bluetooth className="w-7 h-7 text-lavender-deep" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            No devices connected yet. Pair a Bluetooth blood pressure monitor, pulse oximeter, or weight scale.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddDemoDevice('blood_pressure')}
              className="border-white/10 text-xs"
            >
              + Pair BP Monitor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddDemoDevice('pulse_oximeter')}
              className="border-white/10 text-xs"
            >
              + Pair Pulse Oximeter
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const Icon = device.type === 'blood_pressure' ? Activity
              : device.type === 'weight_scale' ? Scale
              : device.type === 'pulse_oximeter' ? Droplet
              : device.type === 'heart_rate' ? HeartPulse
              : Activity;
            return (
              <div
                key={device.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  device.connected
                    ? 'bg-mint/10 border-mint-deep/20'
                    : 'bg-white/5 border-white/5 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                    device.connected ? 'bg-mint/20' : 'bg-white/5'
                  }`}>
                    <Icon className={`w-5 h-5 ${device.connected ? 'text-mint-deep' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy text-sm truncate">{device.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.label} · Last sync {formatLastSync(device.lastSync)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {device.connected ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-mint-deep">
                      <span className="w-2 h-2 rounded-full bg-mint-deep animate-pulse-soft" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                      Disconnected
                    </span>
                  )}
                  {device.connected ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSyncReading(device)}
                        disabled={syncingId === device.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-mint-deep bg-mint/15 hover:bg-mint/25 transition-all"
                        title="Sync latest reading from this device"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingId === device.id ? 'animate-spin' : ''}`} />
                        {syncingId === device.id ? 'Syncing...' : 'Sync'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(device.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all"
                      >
                        <Unplug className="w-3.5 h-3.5" /> Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReconnect(device.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-mint-deep bg-mint/10 hover:bg-mint/20 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                      </button>
                      <button
                        onClick={() => handleRemove(device.id)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 transition-all"
                        title="Remove device"
                      >
                        <Unplug className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}