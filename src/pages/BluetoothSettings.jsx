import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import BluetoothDeviceManager from '@/components/BluetoothDeviceManager';

export default function BluetoothSettings() {
  return (
    <AppLayout>
      <div className="mb-4">
        <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-navy transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>
      </div>
      <div className="max-w-2xl">
        <BluetoothDeviceManager />
      </div>
    </AppLayout>
  );
}