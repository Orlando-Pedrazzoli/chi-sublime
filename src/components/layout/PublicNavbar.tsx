import { connectDB } from '@/lib/db/connect';
import { Category } from '@/lib/models';
import { NavLinks, type NavCategory } from './NavLinks';

async function getCategoriesForNav(): Promise<NavCategory[]> {
  await connectDB();
  const categories = await Category.find({ active: true }).sort({ order: 1 }).lean();
  return categories.map((c) => ({
    slug: c.slug,
    title: c.name.pt,
  }));
}

export async function PublicNavbar() {
  const categories = await getCategoriesForNav();
  return <NavLinks categories={categories} />;
}
