import { useState, useEffect } from 'react';
import { FileText, Plus, QrCode, AlertTriangle, Camera, ScanLine, FileCheck, HelpCircle, Download, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { EmptyState, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import CameraScanner from '@/components/CameraScanner';
import UploadModal from '@/components/vault/UploadModal';
import RecordDetailModal from '@/components/vault/RecordDetailModal';
import QRCardModal from '@/components/vault/QRCardModal';
import VaultGuideModal from '@/components/vault/VaultGuideModal';
import ExportHistoryModal from '@/components/vault/ExportHistoryModal';

export const docTypes = [
  { key: 'prescription', label: 'Prescription', icon: FileText, color: 'lavender' },
  { key: 'lab_result', label: 'Lab Result', icon: FileCheck, color: 'mint' },
  { key: 'hospital_report', label: 'Hospital Report', icon: FileText, color: 'peach' },
  { key: 'vaccination', label: 'Vaccination', icon: FileCheck, color: 'mint' },
  { key: 'imaging', label: 'Imaging', icon: ScanLine, color: 'lavender' },
  { key: 'discharge_summary', label: 'Discharge Summary', icon: FileText, color: 'peach' },
  { key: 'doctor_note', label: 'Doctor Note', icon: FileText, color: 'lavender' },
  { key: 'other', label: 'Other', icon: FileText, color: 'peach' },
];

const colorMap = {
  lavender: 'bg-lavender text-lavender-deep',
  mint: 'bg-mint text-mint-deep',
  peach: 'bg-peach text-peach-deep',
};

export default function MedicalVault() {
  const [records, setRecords] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showGuide, setShowGuide] = useState(() => !sessionStorage.getItem('tiva_vault_guide_seen'));
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [r, p] = await Promise.all([
      base44.entities.MedicalDocument.list('-created_date', 50).catch(() => []),
      base44.entities.HealthProfile.list().then(res => res[0]).catch(() => null),
    ]);
    setRecords(r || []);
    setProfile(p || null);
    setLoading(false);
  };

  const handleUpload = async (file, docType) => {
    setAnalyzing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const fileType = file.type.includes('pdf') ? 'pdf' : 'image';

      let aiSummary = '';
      let warnings = [];
      let explanation = '';

      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `You are Tiva's medical document intelligence engine. Analyze this medical document and provide:
1. A brief summary of what the document contains
2. A simple, plain-language explanation for someone with limited medical knowledge
3. Any contraindication warnings or red flags

Document type: ${docType}
Respond in a warm, clear, reassuring tone. Never diagnose — only explain and flag concerns.

Return JSON: { "summary": string, "explanation": string, "warnings": string[] }`,
          response_json_schema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              explanation: { type: 'string' },
              warnings: { type: 'array', items: { type: 'string' } },
            },
          },
          file_urls: [file_url],
        });
        aiSummary = response.summary || '';
        explanation = response.explanation || '';
        warnings = response.warnings || [];
      } catch (e) {
        aiSummary = 'Document uploaded successfully. AI analysis will be available shortly.';
      }

      await base44.entities.MedicalDocument.create({
        title: file.name.replace(/\.[^/.]+$/, ''),
        document_type: docType,
        file_url,
        file_type: fileType,
        ai_summary: aiSummary,
        contraindication_warnings: warnings,
        extracted_data: explanation ? { explanation } : {},
        document_date: new Date().toISOString().split('T')[0],
        is_offline_cached: true,
      });

      setShowAdd(false);
      setPendingFile(null);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteRecord = async (id) => {
    await base44.entities.MedicalDocument.delete(id).catch(() => {});
    setSelectedRecord(null);
    loadData();
  };

  if (loading) return <AppLayout><LoadingState label="Loading medical vault..." /></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-6">
        <h2 className="font-heading font-bold text-xl text-navy">Medical Records Vault</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Secure storage with AI-powered document intelligence</p>
        <div className="flex flex-wrap gap-3 mt-3 max-w-full">
          <div className="flex flex-col items-center gap-1">
            <Button variant="outline" onClick={() => setShowExport(true)} className="border-tiva-teal/30 w-full">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <span className="text-[10px] text-muted-foreground text-center max-w-[90px]">Download full history</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button variant="outline" onClick={() => setShowGuide(true)} className="border-tiva-teal/30 w-full">
              <HelpCircle className="w-4 h-4 mr-1" /> Help
            </Button>
            <span className="text-[10px] text-muted-foreground text-center max-w-[90px]">How the vault works</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button variant="outline" onClick={() => setShowQR(true)} className="border-tiva-teal/30 w-full">
              <QrCode className="w-4 h-4 mr-1" /> QR Card
            </Button>
            <span className="text-[10px] text-muted-foreground text-center max-w-[90px]">Emergency QR profile</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button variant="outline" onClick={() => setShowScanner(true)} className="border-tiva-teal/30 w-full">
              <Camera className="w-4 h-4 mr-1" /> Scan
            </Button>
            <span className="text-[10px] text-muted-foreground text-center max-w-[90px]">Capture with camera</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button onClick={() => { setPendingFile(null); setShowAdd(true); }} className="bg-tiva-teal text-[#0A0F0D] w-full">
              <Plus className="w-4 h-4 mr-1" /> Upload
            </Button>
            <span className="text-[10px] text-muted-foreground text-center max-w-[90px]">Add a document</span>
          </div>
        </div>
      </div>

      {/* How it works banner */}
      <div className="bg-tiva-teal/5 border border-tiva-teal/15 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-tiva-teal flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-heading font-semibold text-sm text-navy mb-1">What is the Medical Vault?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your Vault is a secure, encrypted space to store all your medical documents — prescriptions, lab results,
              hospital reports, and more. Tiva's AI reads each document, explains it in plain language, and flags any
              safety warnings. Tap <span className="font-semibold text-navy">Upload</span> to add a file from your device,
              or <span className="font-semibold text-navy">Scan</span> to capture a physical document with your camera.
              Tap any document to view its AI summary, original file, and warnings. Use <span className="font-semibold text-navy">QR Card</span> to generate an emergency health card, and <span className="font-semibold text-navy">Export</span> to download your full history.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Health Profile Summary */}
      {profile && (
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-tiva-teal/20 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-tiva-teal" />
            <h3 className="font-heading font-semibold text-navy">Emergency Health Profile</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Name</p>
              <p className="font-heading font-semibold text-sm text-navy">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Blood Type</p>
              <p className="font-heading font-semibold text-sm text-navy">{profile.blood_type || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Allergies</p>
              <p className="font-heading font-semibold text-sm text-navy">{profile.allergies?.join(', ') || 'None'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Conditions</p>
              <p className="font-heading font-semibold text-sm text-navy">{profile.chronic_conditions?.join(', ') || 'None'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Records */}
      {records.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload prescriptions, lab results, or medical reports. Tiva's AI will read and explain them in simple language."
          action={<Button onClick={() => setShowAdd(true)} className="bg-tiva-teal text-[#0A0F0D]"><Plus className="w-4 h-4 mr-1" /> Upload Document</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {records.map(record => {
            const docType = docTypes.find(d => d.key === record.document_type) || docTypes[docTypes.length - 1];
            const Icon = docType.icon;
            return (
              <div
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:border-tiva-teal/20"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${colorMap[docType.color] || colorMap.lavender} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-navy truncate">{record.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {docType.label} · {new Date(record.created_date).toLocaleDateString()}
                    </p>
                    {record.ai_summary && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{record.ai_summary}</p>
                    )}
                    {record.contraindication_warnings?.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                        <span className="text-xs font-semibold text-destructive">{record.contraindication_warnings.length} warning(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Camera Scanner */}
      {showScanner && (
        <CameraScanner
          onClose={() => setShowScanner(false)}
          onCapture={(file) => {
            setPendingFile(file);
            setShowScanner(false);
            setShowAdd(true);
          }}
        />
      )}

      {/* Upload Modal */}
      {showAdd && (
        <UploadModal
          docTypes={docTypes}
          analyzing={analyzing}
          initialFile={pendingFile}
          onClose={() => { setShowAdd(false); setPendingFile(null); }}
          onUpload={handleUpload}
        />
      )}

      {/* Record Detail */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          docTypes={docTypes}
          onClose={() => setSelectedRecord(null)}
          onDelete={deleteRecord}
        />
      )}

      {/* QR Card Modal */}
      {showQR && <QRCardModal profile={profile} onClose={() => setShowQR(false)} />}

      {/* Export History Modal */}
      {showExport && <ExportHistoryModal onClose={() => setShowExport(false)} />}

      {/* Vault Guide Popup */}
      {showGuide && (
        <VaultGuideModal
          onClose={() => {
            sessionStorage.setItem('tiva_vault_guide_seen', '1');
            setShowGuide(false);
          }}
        />
      )}
    </AppLayout>
  );
}