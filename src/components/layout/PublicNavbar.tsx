import { connectDB } from '@/lib/db/connect';
import { Category } from '@/lib/models';
import { auth } from '@/lib/auth';
import { NavLinks, type NavCategory, type NavSession } from './NavLinks';

async function getCategoriesForNav(): Promise<NavCategory[]> {
  await connectDB();
  const categories = await Category.find({ active: true }).sort({ order: 1 }).lean();
  return categories.map((c) => ({
    slug: c.slug,
    title: c.name.pt,
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
  const [categories, session] = await Promise.all([getCategoriesForNav(), getSession()]);
  return <NavLinks categories={categories} session={session} />;
}
