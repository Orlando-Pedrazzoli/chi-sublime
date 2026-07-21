// 📄 src/components/admin/shared/ImageUploadField.tsx
/**
 * Chi Sublime — Campo de upload de imagem
 * ============================================================
 *
 * Substitui os antigos campos "URL" nos formulários do admin.
 * Fluxo: escolher ficheiro (computador ou galeria/câmara no
 * telemóvel) → POST /api/upload → Cloudinary → guarda o URL no
 * campo do formulário via onChange.
 *
 * Inclui: preview, estado de progresso, remover, e um modo
 * avançado discreto para colar um URL manualmente (mantém a
 * flexibilidade sem a impor ao utilizador comum).
 */

'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Link2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';

type ImageUploadFieldProps = {
  /** URL atual da imagem (string vazia = sem imagem) */
  value: string;
  onChange: (url: string) => void;
  /** Subpasta no Cloudinary */
  folder: 'team' | 'services' | 'general';
  /** Texto de ajuda por baixo do controlo */
  hint?: string;
};

export function ImageUploadField({ value, onChange, folder, hint }: ImageUploadFieldProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Escolhe um ficheiro de imagem (JPG, PNG, WebP…).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagem demasiado grande — máximo 8 MB.');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', folder);

      const res = await fetch('/api/upload', { method: 'POST', body });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Falha no upload. Tenta novamente.');
        return;
      }

      onChange(data.url);
      toast.success('Imagem carregada.');
    } catch {
      toast.error('Falha de ligação durante o upload.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border"
          style={{ borderColor: 'rgba(31,61,46,0.15)', backgroundColor: '#FAF7F2' }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Pré-visualização" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={22} strokeWidth={1.25} style={{ color: '#B8A88A' }} />
          )}
          {uploading && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(250,247,242,0.8)' }}
            >
              <Loader2 size={20} className="animate-spin" style={{ color: '#1F3D2E' }} />
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold tracking-wide uppercase transition-all hover:-translate-y-[1px] disabled:opacity-50"
              style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
            >
              <ImagePlus size={13} />
              {value ? 'Substituir imagem' : 'Carregar imagem'}
            </button>

            {value && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#8A3A2A' }}
              >
                <Trash2 size={13} />
                Remover
              </button>
            )}

            <button
              type="button"
              onClick={() => setManualMode((m) => !m)}
              className="inline-flex items-center gap-1 px-1 py-2 text-[11px] transition-colors"
              style={{ color: manualMode ? '#1F3D2E' : '#8A8A8A' }}
            >
              <Link2 size={11} />
              {manualMode ? 'esconder URL' : 'usar URL'}
            </button>
          </div>

          {manualMode && (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…"
            />
          )}

          <p className="text-xs" style={{ color: '#8A8A8A' }}>
            {hint ?? 'JPG, PNG ou WebP até 8 MB. No telemóvel podes usar a câmara ou a galeria.'}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
