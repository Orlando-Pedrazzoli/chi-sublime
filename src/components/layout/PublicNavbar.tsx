// 📄 src/components/layout/PublicNavbar.tsx
import { getLocale } from 'next-intl/server';
import { connectDB } from '@/lib/db/connect';
import { Category } from '@/lib/models';
import { auth } from '@/lib/auth';
import type { Locale } from '@/i18n/config';
import { NavLinks, type NavCategory, type NavSession } from './NavLinks';

async function getCategoriesForNav(locale: Locale): Promise<NavCategory[]> {
  await connectDB();
  const categories = await Category.find({ active: true }).sort({ order: 1 }).lean();
  return categories.map((c) => ({
    slug: c.slug,
    // Conteúdo da DB: usa o idioma ativo com fallback para PT
    title: (locale === 'en' && c.name.en) || c.name.pt,
  }));
}

async function getSession(): Promise<NavSession | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    name: session.user.name,
    role: session.user.role,
  };
}

export async function PublicNavbar() {
  const locale = (await getLocale()) as Locale;
  const [categories, session] = await Promise.all([getCategoriesForNav(locale), getSession()]);
  return <NavLinks categories={categories} session={session} />;
}
