import { useEffect, useRef } from 'react';
import { createHealthReading } from '@/utils/healthSync';

const STORAGE_KEY = 'tiva_bluetooth_devices';
const SYNC_INTERVAL = 60000; // re-attempt connections every 60s

// GATT service + characteristic UUIDs and parsers for each device type
const GATT_PROFILES = {
  heart_rate: {
    service: 'heart_rate',
    characteristic: 'heart_rate_measurement',
    parse: (dv) => {
      const flags = dv.getUint8(0);
      const is16Bit = flags & 0x1;
      const hr = is16Bit ? dv.getUint16(1, true) : dv.getUint8(1);
      return { metric_type: 'heart_rate', value: hr };
    },
  },
  blood_pressure: {
    service: 'blood_pressure',
    characteristic: 'blood_pressure_measurement',
    parse: (dv) => {
      const sys = dv.getUint16(1, true); // Systolic in kPa*1000 — convert to mmHg
      const dia = dv.getUint16(3, true);
      // GATT BP values are in kPa; convert to mmHg (1 kPa ≈ 7.5006 mmHg)
      const sysMmHg = Math.round(sys / 100 * 7.5006);
      const diaMmHg = Math.round(dia / 100 * 7.5006);
      return { metric_type: 'blood_pressure_systolic', value: sysMmHg, secondary_value: diaMmHg };
    },
  },
  weight_scale: {
    service: 'weight_scale',
    characteristic: 'weight_measurement',
    parse: (dv) => {
      const flags = dv.getUint8(0);
      const isImperial = flags & 0x1;
      const raw = dv.getUint16(1, true);
      const weight = isImperial ? raw / 100 : raw / 200; // kg (0.005) or lb (0.01)
      return { metric_type: 'weight', value: parseFloat(weight.toFixed(1)) };
    },
  },
  pulse_oximeter: {
    service: 'pulse_oximeter_service',
    characteristic: 'plx_spot_check_measurement',
    parse: (dv) => {
      const spo2 = dv.getUint8(1);
      return { metric_type: 'spo2', value: spo2 };
    },
  },
};

export default function BluetoothSyncWorker() {
  const activeConnections = useRef(new Set());

  useEffect(() => {
    if (!navigator.bluetooth) return;

    const attemptSync = async () => {
      let btDevices = [];
      try {
        btDevices = await navigator.bluetooth.getDevices();
      } catch {
        // getDevices not supported — can't auto-reconnect without a device reference
        return;
      }

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const connectedStored = stored.filter(d => d.connected && d.type && GATT_PROFILES[d.type]);

      for (const storedDevice of connectedStored) {
        const btDevice = btDevices.find(d => d.id === storedDevice.id || d.name === storedDevice.name);
        if (!btDevice) continue;

        // Skip if already connected & listening
        if (activeConnections.current.has(storedDevice.id)) continue;

        const profile = GATT_PROFILES[storedDevice.type];
        try {
          const server = await btDevice.gatt.connect();
          const service = await server.getPrimaryService(profile.service);
          const characteristic = await service.getCharacteristic(profile.characteristic);

          await characteristic.startNotifications();
          characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const parsed = profile.parse(event.target.value);
            if (parsed && parsed.value != null) {
              createHealthReading({ ...parsed, source: 'wearable' }).catch(() => {});
            }
          });

          activeConnections.current.add(storedDevice.id);

          btDevice.addEventListener('gattserverdisconnected', () => {
            activeConnections.current.delete(storedDevice.id);
          });
        } catch {
          // Device may be off, out of range, or GATT profile unsupported
        }
      }
    };

    attemptSync();
    const interval = setInterval(attemptSync, SYNC_INTERVAL);

    return () => {
      clearInterval(interval);
      activeConnections.current.clear();
    };
  }, []);

  return null;
}