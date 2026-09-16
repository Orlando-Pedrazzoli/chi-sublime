// 📄 src/app/admin/galeria/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';
import { DEFAULT_GALLERY, getHomeGallery } from '@/lib/content/gallery';
import { GalleryManager } from '@/components/admin/gallery/GalleryManager';

export const metadata: Metadata = {
  title: 'Galeria',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireAdmin();
  const gallery = await getHomeGallery();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/admin/dashboard"
          className="text-chi-charcoal-soft hover:text-chi-green-deep inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Dashboard
        </Link>
        <h1 className="text-chi-green-darker mt-2 font-serif text-2xl">Galeria</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Imagens da secção &quot;O nosso espaço&quot; na homepage. As alterações só aparecem no
          site depois de carregar em Guardar.
        </p>
      </div>

      <GalleryManager
        initialImages={gallery.images}
        defaultImages={DEFAULT_GALLERY}
        isDefault={gallery.isDefault}
      />
    </div>
  );
}
