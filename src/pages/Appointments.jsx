import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader } from '@/components/ui/primitives';
import AppointmentsTab from '@/components/vault/AppointmentsTab';

export default function Appointments() {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    base44.entities.MedicalDocument.list('-created_date', 50)
      .then(setDocuments)
      .catch(() => {});
  }, []);

  return (
    <AppLayout>
      <SectionHeader
        title="Appointments"
        subtitle="Track doctor visits, follow-ups, and clinical schedules"
      />
      <AppointmentsTab documents={documents} />
    </AppLayout>
  );
}