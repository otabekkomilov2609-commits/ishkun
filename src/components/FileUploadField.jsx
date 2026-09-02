import React, { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function FileUploadField({ label, value, onChange, hint }) {
  const { t } = useLang();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch (e) {
      setError(t('upload.failed'));
    }
    setUploading(false);
  };

  return (
    <div>
      {label && <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>}
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <Image src={value} alt={label || ''} fittingType="fill" className="w-full h-40" />
          <button type="button" onClick={() => onChange('')} className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className={cn('flex flex-col items-center justify-center gap-2 h-40 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors', uploading && 'opacity-60 pointer-events-none')}>
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">{uploading ? t('loading') : t('upload.choose')}</span>
          <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
        </label>
      )}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}