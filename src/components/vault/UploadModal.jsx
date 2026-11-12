import { useState, useEffect, useRef } from 'react';
import { Upload, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const colorMap = {
  lavender: 'bg-lavender text-lavender-deep',
  mint: 'bg-mint text-mint-deep',
  peach: 'bg-peach text-peach-deep',
};

export default function UploadModal({ docTypes, analyzing, initialFile, onClose, onUpload }) {
  const [selectedType, setSelectedType] = useState('prescription');
  const [file, setFile] = useState(initialFile || null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (initialFile) setFile(initialFile);
  }, [initialFile]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        {analyzing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full animate-spin mb-4" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
            <p className="font-heading font-semibold text-navy">Tiva is reading your document...</p>
            <p className="text-sm text-muted-foreground mt-1">Extracting and analyzing with AI</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Document Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {docTypes.slice(0, 6).map(d => (
                    <button
                      key={d.key}
                      onClick={() => setSelectedType(d.key)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        selectedType === d.key
                          ? `${colorMap[d.color]} border border-white/20`
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-white/15 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-white/5"
              >
                <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
                {file && file.type?.startsWith('image/') ? (
                  <>
                    <img src={URL.createObjectURL(file)} alt="Preview" className="max-h-48 mx-auto mb-3 rounded-xl object-contain" />
                    <p className="font-semibold text-sm text-navy">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tap to replace</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    {file ? (
                      <p className="font-semibold text-sm text-navy">{file.name}</p>
                    ) : (
                      <>
                        <p className="font-semibold text-sm text-navy">Tap to select a file</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG</p>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => file && onUpload(file, selectedType)} disabled={!file} className="bg-tiva-teal text-[#0A0F0D]">
                <Sparkles className="w-4 h-4 mr-1" /> Analyze & Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}