'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

/**
 * Botão flutuante "Nova reserva" — apenas visível em mobile
 * (em desktop, a acção está no AdminTopbar).
 */
export function QuickActionsFab() {
  return (
    <Link
      href="/admin/reservas?new=1"
      aria-label="Nova reserva"
      className="fixed right-4 bottom-4 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:-translate-y-[2px] hover:shadow-xl lg:hidden"
      style={{ backgroundColor: '#D4AF6E', color: '#1F3D2E' }}
    >
      <Plus size={24} strokeWidth={2} />
    </Link>
  );
}
