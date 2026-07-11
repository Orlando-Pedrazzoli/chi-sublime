// 📄 src/components/admin/staff/StaffDetailView.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Mail, Phone, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import type { StaffDetail } from '@/types/staff';
import { StaffForm } from './StaffForm';
import { WorkingHoursEditor } from './WorkingHoursEditor';
import { VacationManager } from './VacationManager';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function StaffDetailView({ staff }: { staff: StaffDetail }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/equipa"
        className="text-chi-charcoal-soft hover:text-chi-green-deep inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Equipa
      </Link>

      {/* Cabeçalho de identidade */}
      <div className="border-chi-border flex flex-col gap-4 rounded-lg border bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {staff.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={staff.photo}
              alt={staff.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="bg-chi-green-deep text-chi-cream flex h-16 w-16 items-center justify-center rounded-full text-lg font-medium">
              {initials(staff.name)}
            </span>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-chi-green-darker font-serif text-2xl">{staff.name}</h1>
              {staff.active ? (
                <Badge tone="success" dot>
                  Ativo
                </Badge>
              ) : (
                <Badge tone="neutral" dot>
                  Inativo
                </Badge>
              )}
            </div>
            <p className="text-chi-charcoal-soft text-sm">{staff.role.pt}</p>
            <div className="text-chi-charcoal-light flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
              {staff.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail size={13} />
                  {staff.email}
                </span>
              )}
              {staff.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={13} />
                  {staff.phone}
                </span>
              )}
              {staff.commissionRate != null && (
                <span className="inline-flex items-center gap-1">
                  <Percent size={13} />
                  {staff.commissionRate}% comissão
                </span>
              )}
            </div>
            {staff.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {staff.specialties.map((s) => (
                  <span
                    key={s}
                    className="bg-chi-sand text-chi-charcoal-soft rounded-full px-2 py-0.5 text-xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button variant="outline" onClick={() => setEditOpen(true)} className="shrink-0">
          <Pencil size={16} />
          Editar perfil
        </Button>
      </div>

      {/* Horário | Férias */}
      <Tabs
        items={[
          {
            id: 'horario',
            label: 'Horário',
            content: (
              <WorkingHoursEditor
                staffId={staff.id}
                initial={staff.workingHours}
                onSaved={refresh}
              />
            ),
          },
          {
            id: 'ferias',
            label: 'Férias',
            content: (
              <VacationManager staffId={staff.id} initial={staff.vacations} onSaved={refresh} />
            ),
          },
        ]}
      />

      <StaffForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        staff={staff}
        onSaved={refresh}
      />
    </div>
  );
}
