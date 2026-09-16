// 📄 src/lib/email/templates/booking-cancelled-admin.tsx
/**
 * Chi Sublime — Template: Cancelamento pelo cliente (alerta ao SALÃO)
 * ============================================================
 *
 * Par do new-booking-admin: quando um cliente cancela, o salão fica a
 * saber na hora que o horário ficou livre (pode oferecê-lo a outra
 * cliente ou reorganizar o dia).
 */

import * as React from 'react';
import { Section } from '@react-email/components';
import { EmailShell, Paragraph, Muted, ActionButton, InfoTable } from './_layout';

export interface BookingCancelledAdminEmailProps {
  bookingNumber: string;
  clientName: string;
  clientPhone?: string;
  date: string;
  time: string;
  services?: string;
  staffName?: string;
  reason?: string;
  agendaUrl: string;
}

export function BookingCancelledAdminEmail({
  bookingNumber,
  clientName,
  clientPhone,
  date,
  time,
  services,
  staffName,
  reason,
  agendaUrl,
}: BookingCancelledAdminEmailProps) {
  return (
    <EmailShell preview={`Cancelamento · ${time} ${date} · ${clientName}`}>
      <Paragraph>
        <strong>Uma cliente cancelou a marcação</strong> — o horário ficou livre na agenda.
      </Paragraph>
      <InfoTable
        rows={[
          { label: 'Cliente', value: clientName },
          ...(clientPhone ? [{ label: 'Telefone', value: clientPhone }] : []),
          { label: 'Data', value: date },
          { label: 'Hora', value: time },
          ...(services ? [{ label: 'Serviços', value: services }] : []),
          ...(staffName ? [{ label: 'Profissional', value: staffName }] : []),
          ...(reason ? [{ label: 'Motivo', value: reason }] : []),
          { label: 'Nº', value: bookingNumber },
        ]}
      />
      <Section style={{ textAlign: 'center' as const, margin: '24px 0 4px' }}>
        <ActionButton href={agendaUrl}>Abrir agenda</ActionButton>
      </Section>
      <Muted>Email automático do sistema de marcações — não responder.</Muted>
    </EmailShell>
  );
}

export default BookingCancelledAdminEmail;
