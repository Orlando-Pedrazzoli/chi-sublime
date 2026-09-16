// 📄 src/lib/email/templates/booking-request-received.tsx
/**
 * Chi Sublime — Template: Pedido de marcação recebido
 * ============================================================
 *
 * Só usado com BOOKING_POLICY.approvalMode = 'manual'. Deixa claro
 * que o horário está reservado mas ainda falta a confirmação do
 * salão — a confirmação real chega noutro email.
 */

import * as React from 'react';
import { Section } from '@react-email/components';
import { EmailShell, Greeting, Paragraph, Muted, ActionButton, InfoTable } from './_layout';

export interface BookingRequestReceivedEmailProps {
  name: string;
  bookingNumber: string;
  date: string;
  time: string;
  services: string;
  staffName: string;
  total: string;
  detailUrl: string;
}

export function BookingRequestReceivedEmail({
  name,
  bookingNumber,
  date,
  time,
  services,
  staffName,
  total,
  detailUrl,
}: BookingRequestReceivedEmailProps) {
  return (
    <EmailShell preview={`Recebemos o teu pedido · ${date} às ${time}`}>
      <Greeting name={name} />
      <Paragraph>
        Recebemos o teu pedido de marcação e guardámos este horário para ti.{' '}
        <strong>Ainda falta a confirmação do salão</strong> — vais receber outro email assim que
        estiver confirmada.
      </Paragraph>
      <InfoTable
        rows={[
          { label: 'Data', value: date },
          { label: 'Hora', value: time },
          { label: 'Serviços', value: services },
          { label: 'Profissional', value: staffName },
          { label: 'Total', value: total },
          { label: 'Número', value: bookingNumber },
        ]}
      />
      <Section style={{ textAlign: 'center' as const, margin: '24px 0 4px' }}>
        <ActionButton href={detailUrl}>Ver o meu pedido</ActionButton>
      </Section>
      <Muted>Normalmente respondemos no próprio dia útil.</Muted>
    </EmailShell>
  );
}

export default BookingRequestReceivedEmail;
