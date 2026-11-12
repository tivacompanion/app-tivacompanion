import { useSearchParams } from 'react-router-dom';
import MonthlyCheckIn from '@/components/MonthlyCheckIn';
import AppLayout from '@/components/AppLayout';

export default function MonthlyCheckInPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') === 'scheduled' ? 'scheduled' : 'patient_initiated';

  return (
    <AppLayout>
      <MonthlyCheckIn checkInType={type} />
    </AppLayout>
  );
}