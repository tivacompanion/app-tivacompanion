import { FileText, AlertTriangle, Sparkles, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const colorMap = {
  lavender: 'bg-lavender text-lavender-deep',
  mint: 'bg-mint text-mint-deep',
  peach: 'bg-peach text-peach-deep',
};

export default function RecordDetailModal({ record, docTypes, onClose, onDelete }) {
  const docType = docTypes.find(d => d.key === record.document_type) || docTypes[docTypes.length - 1];
  const Icon = docType.icon;
  const explanation = record.extracted_data?.explanation;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${colorMap[docType.color] || colorMap.lavender} flex items-center justify-center`}>
                <Icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <DialogTitle>{record.title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {docType.label} · {new Date(record.created_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {record.file_url && (
            <div className="rounded-2xl overflow-hidden bg-white/5">
              {record.file_type === 'pdf' ? (
                <a href={record.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 hover:bg-white/5 transition-all">
                  <FileText className="w-6 h-6 text-tiva-teal" />
                  <span className="font-semibold text-sm text-navy">View PDF document</span>
                </a>
              ) : (
                <img src={record.file_url} alt={record.title} className="w-full max-h-64 object-contain" />
              )}
            </div>
          )}

          {record.ai_summary && (
            <div>
              <h4 className="font-heading font-semibold text-sm text-navy mb-2">AI Summary</h4>
              <p className="text-sm text-muted-foreground">{record.ai_summary}</p>
            </div>
          )}

          {explanation && (
            <div className="p-4 rounded-2xl bg-lavender/10 border border-lavender/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-lavender-deep" />
                <h4 className="font-heading font-semibold text-sm text-navy">Tiva's Explanation</h4>
              </div>
              <p className="text-sm leading-relaxed text-navy">{explanation}</p>
            </div>
          )}

          {record.contraindication_warnings?.length > 0 && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <h4 className="font-heading font-semibold text-sm text-destructive">Warnings</h4>
              </div>
              <ul className="space-y-1">
                {record.contraindication_warnings.map((w, i) => (
                  <li key={i} className="text-sm text-navy">• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onDelete(record.id)} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 mr-1" /> Delete Record
          </Button>
          <Button onClick={onClose} className="bg-tiva-teal text-[#0A0F0D]">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}