// 📄 src/lib/email/templates/new-booking-admin.tsx
/**
 * Chi Sublime — Template: Nova marcação (notificação ao SALÃO)
 * ============================================================
 *
 * Substitui o push do Noona HQ: cada marcação nova dispara este
 * email para o endereço do salão. Componente puro; dados vêm
 * por props.
 */

import * as React from 'react';
import { Section } from '@react-email/components';
import { EmailShell, Paragraph, Muted, ActionButton, InfoTable } from './_layout';

export interface NewBookingAdminEmailProps {
  bookingNumber: string;
  clientName: string;
  clientPhone?: string;
  date: string;
  time: string;
  services: string;
  staffName: string;
  total: string;
  source: string;
  agendaUrl: string;
  /** Modo manual: a reserva está 'pending' e precisa de ser confirmada */
  pendingApproval?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  website: 'Site (online)',
  phone: 'Telefone',
  'walk-in': 'Walk-in',
  instagram: 'Instagram',
  admin: 'Admin',
};

export function NewBookingAdminEmail({
  bookingNumber,
  clientName,
  clientPhone,
  date,
  time,
  services,
  staffName,
  total,
  source,
  agendaUrl,
  pendingApproval,
}: NewBookingAdminEmailProps) {
  return (
    <EmailShell
      preview={`${pendingApproval ? 'Por confirmar' : 'Nova marcação'} · ${time} ${date} · ${clientName}`}
    >
      <Paragraph>
        <strong>
          {pendingApproval ? 'Novo pedido por confirmar' : 'Nova marcação no Chi Sublime'}
        </strong>{' '}
        — {SOURCE_LABELS[source] ?? source}.
      </Paragraph>
      {pendingApproval && (
        <Paragraph>
          O horário está guardado. A cliente só recebe a confirmação depois de confirmares na
          agenda.
        </Paragraph>
      )}
      <InfoTable
        rows={[
          { label: 'Cliente', value: clientName },
          ...(clientPhone ? [{ label: 'Telefone', value: clientPhone }] : []),
          { label: 'Data', value: date },
          { label: 'Hora', value: time },
          { label: 'Serviços', value: services },
          { label: 'Profissional', value: staffName },
          { label: 'Total', value: total },
          { label: 'Nº', value: bookingNumber },
        ]}
      />
      <Section style={{ textAlign: 'center' as const, margin: '24px 0 4px' }}>
        <ActionButton href={agendaUrl}>
          {pendingApproval ? 'Confirmar na agenda' : 'Abrir agenda'}
        </ActionButton>
      </Section>
      <Muted>Email automático do sistema de marcações — não responder.</Muted>
    </EmailShell>
  );
}

export default NewBookingAdminEmail;
