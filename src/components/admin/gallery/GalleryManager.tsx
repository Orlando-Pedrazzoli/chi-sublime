// 📄 src/components/admin/gallery/GalleryManager.tsx
/**
 * Chi Sublime — Admin » Galeria da homepage
 * ============================================================
 *
 * Edita a lista de imagens da secção "O nosso espaço":
 * carregar/substituir (Cloudinary via ImageUploadField), descrição
 * PT/EN (alt), reordenar, remover e repor as fotos originais.
 *
 * As alterações ficam locais até "Guardar". A pré-visualização usa
 * o MESMO cálculo de layout do site (getGalleryLayout), com spans
 * inline, para o Jean ver como fica no telemóvel e no computador
 * antes de publicar.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ImageUploadField } from '@/components/admin/shared/ImageUploadField';
import { useToast } from '@/hooks/useToast';
import { saveHomeGalleryAction } from '@/lib/server-actions/site-content';
import { getGalleryLayout } from '@/lib/utils/gallery-layout';
import { GALLERY_MAX_IMAGES } from '@/lib/validation/site-content';
import type { GalleryImage } from '@/lib/content/gallery';

type Item = { key: string; url: string; altPt: string; altEn: string };
type PreviewMode = 'mobile' | 'desktop';

let keySeq = 0;
const nextKey = () => `img-${Date.now()}-${keySeq++}`;

function toItems(images: GalleryImage[]): Item[] {
  return images.map((img) => ({
    key: nextKey(),
    url: img.url,
    altPt: img.alt.pt,
    altEn: img.alt.en,
  }));
}

function serialize(items: Item[]) {
  return JSON.stringify(items.map(({ url, altPt, altEn }) => [url, altPt, altEn]));
}

const C = {
  border: '#e8e4da',
  cream: '#faf7f2',
  sand: '#efe9dd',
  green: '#1f3d2e',
  soft: '#5a5a5a',
  light: '#8a8a8a',
  danger: '#b23c3c',
  gold: '#b8924a',
} as const;

export type GalleryManagerProps = {
  initialImages: GalleryImage[];
  defaultImages: GalleryImage[];
  isDefault: boolean;
};

export function GalleryManager({ initialImages, defaultImages, isDefault }: GalleryManagerProps) {
  const toast = useToast();
  const [items, setItems] = useState<Item[]>(() => toItems(initialImages));
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialize(toItems(initialImages)));
  const [saving, setSaving] = useState(false);
  const [usingDefaults, setUsingDefaults] = useState(isDefault);
  const [preview, setPreview] = useState<PreviewMode>('mobile');
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const dirty = serialize(items) !== savedSnapshot;
  const layout = useMemo(() => getGalleryLayout(items.length), [items.length]);

  // Aviso ao sair da página com alterações por guardar
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function update(key: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
    if (patch.url) {
      setMissing((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function add() {
    if (items.length >= GALLERY_MAX_IMAGES) {
      toast.warning(`Máximo de ${GALLERY_MAX_IMAGES} imagens.`);
      return;
    }
    const item: Item = { key: nextKey(), url: '', altPt: '', altEn: '' };
    setItems((prev) => [...prev, item]);
    requestAnimationFrame(() => {
      document.getElementById(item.key)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function resetToDefaults() {
    if (!window.confirm('Repor as fotos originais do site? As alterações por guardar perdem-se.'))
      return;
    setItems(toItems(defaultImages));
    setMissing(new Set());
  }

  async function save() {
    const empty = items.filter((it) => !it.url.trim());
    if (empty.length > 0) {
      setMissing(new Set(empty.map((it) => it.key)));
      document
        .getElementById(empty[0].key)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Há posições sem imagem. Carrega uma foto ou remove-as.');
      return;
    }

    if (
      items.length === 0 &&
      !window.confirm('Guardar sem imagens esconde a galeria do site. Continuar?')
    )
      return;

    setSaving(true);
    const res = await saveHomeGalleryAction({
      images: items.map((it) => ({
        url: it.url.trim(),
        alt: { pt: it.altPt.trim(), en: it.altEn.trim() },
      })),
    });
    setSaving(false);

    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    setSavedSnapshot(serialize(items));
    setUsingDefaults(false);
    toast.success(`Galeria publicada (${res.data.count} imagens).`);
  }

  const spans = preview === 'mobile' ? layout.mobile : layout.desktop;
  const cols = preview === 'mobile' ? 2 : 4;

  return (
    <div className="space-y-6">
      {/* Barra de ações */}
      <div
        className="flex flex-col gap-4 rounded-lg border bg-white sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: C.border, padding: '16px 20px' }}
      >
        <div className="text-sm" style={{ color: C.soft }}>
          <strong style={{ color: C.green }}>
            {items.length} / {GALLERY_MAX_IMAGES}
          </strong>{' '}
          imagens
          {usingDefaults && !dirty && (
            <span className="block text-xs" style={{ color: C.light, marginTop: '2px' }}>
              A mostrar as fotos originais — ainda nada foi guardado.
            </span>
          )}
          {dirty && (
            <span className="block text-xs" style={{ color: C.gold, marginTop: '2px' }}>
              Alterações por guardar
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={resetToDefaults}>
            <RotateCcw size={14} />
            Repor originais
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <ImagePlus size={14} />
            Adicionar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            loading={saving}
            disabled={!dirty || saving}
          >
            <Save size={14} />
            Guardar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Lista de imagens */}
        <ol className="space-y-4">
          {items.length === 0 && (
            <li
              className="rounded-lg border border-dashed bg-white text-center text-sm"
              style={{ borderColor: C.border, color: C.soft, padding: '40px 20px' }}
            >
              Sem imagens. A secção &quot;O nosso espaço&quot; fica escondida no site.
            </li>
          )}

          {items.map((item, i) => (
            <li
              key={item.key}
              id={item.key}
              className="rounded-lg border bg-white"
              style={{
                borderColor: missing.has(item.key) ? C.danger : C.border,
                padding: '16px',
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className="text-xs font-semibold tracking-wide uppercase"
                  style={{ color: C.gold }}
                >
                  Posição {i + 1}
                </span>
                <div className="flex items-center gap-1">
                  <IconButton
                    label="Mover para cima"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton
                    label="Mover para baixo"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown size={15} />
                  </IconButton>
                  <IconButton label="Remover" danger onClick={() => remove(item.key)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>

              <ImageUploadField
                value={item.url}
                onChange={(url) => update(item.key, { url })}
                folder="gallery"
                hint="JPG, PNG ou WebP até 8 MB. Fotos horizontais e verticais funcionam — o corte é automático."
              />
              {missing.has(item.key) && (
                <p className="text-xs" style={{ color: C.danger, marginTop: '6px' }}>
                  Falta a imagem nesta posição.
                </p>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ marginTop: '12px' }}>
                <div>
                  <Label>Descrição (PT)</Label>
                  <Input
                    value={item.altPt}
                    maxLength={150}
                    onChange={(e) => update(item.key, { altPt: e.target.value })}
                    placeholder="Ex.: Interior do salão"
                  />
                </div>
                <div>
                  <Label>Descrição (EN)</Label>
                  <Input
                    value={item.altEn}
                    maxLength={150}
                    onChange={(e) => update(item.key, { altEn: e.target.value })}
                    placeholder="E.g.: Salon interior"
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Pré-visualização */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div
            className="rounded-lg border bg-white"
            style={{ borderColor: C.border, padding: '16px' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: C.green }}>
                Pré-visualização
              </span>
              <div
                className="inline-flex overflow-hidden rounded-md border text-xs"
                style={{ borderColor: C.border }}
              >
                {(['mobile', 'desktop'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreview(mode)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: preview === mode ? C.green : 'transparent',
                      color: preview === mode ? C.cream : C.soft,
                    }}
                  >
                    {mode === 'mobile' ? 'Telemóvel' : 'Computador'}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridAutoRows: preview === 'mobile' ? '64px' : '40px',
                gap: '4px',
                backgroundColor: C.sand,
                padding: '6px',
                borderRadius: '6px',
                maxWidth: preview === 'mobile' ? '200px' : '100%',
                margin: '0 auto',
              }}
            >
              {items.map((item, i) => (
                <div
                  key={item.key}
                  style={{
                    gridColumn: `span ${spans[i]?.col ?? 1}`,
                    gridRow: `span ${spans[i]?.row ?? 1}`,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '2px',
                    backgroundColor: item.url ? C.border : '#f3dede',
                  }}
                >
                  {item.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: '3px',
                      fontSize: '9px',
                      fontWeight: 600,
                      color: '#fff',
                      textShadow: '0 0 3px rgba(0,0,0,0.7)',
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs leading-relaxed" style={{ color: C.light, marginTop: '12px' }}>
              O tamanho de cada foto depende da posição. Usa as setas para escolher quais ficam em
              destaque. O site ajusta sozinho para não deixar espaços vazios.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
      style={{ width: '34px', height: '34px', color: danger ? C.danger : C.soft }}
    >
      {children}
    </button>
  );
}
