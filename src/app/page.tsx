import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Hero } from '@/components/home/Hero';
import { Philosophy } from '@/components/home/Philosophy';
import { ServicesPreview } from '@/components/home/ServicesPreview';
import { TeamPreview } from '@/components/home/TeamPreview';
import { GalleryPreview } from '@/components/home/GalleryPreview';
import { ContactPreview } from '@/components/home/ContactPreview';
import { PublicFooter } from '@/components/layout/PublicFooter';

export default function HomePage() {
  return (
    <>
      <PublicNavbar />
      <Hero />
      <Philosophy />
      <ServicesPreview />
      <TeamPreview />
      <GalleryPreview />
      <ContactPreview />
      <PublicFooter />
    </>
  );
}
