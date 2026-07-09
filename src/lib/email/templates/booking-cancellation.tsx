// 📄 src/lib/email/templates/booking-cancellation.tsx
/**
 * Chi Sublime — Template: Cancelamento de reserva
 * Componente puro. `reason` e `rebookUrl` são opcionais.
 */

import * as React from 'react';
import { Section } from '@react-email/components';
import { EmailShell, Greeting, Paragraph, Muted, ActionButton, InfoTable } from './_layout';

export interface BookingCancellationEmailProps {
  name: string;
  bookingNumber: string;
  date: string;
  time: string;
  reason?: string;
  rebookUrl?: string;
}

export function BookingCancellationEmail({
  name,
  bookingNumber,
  date,
  time,
  reason,
  rebookUrl,
}: BookingCancellationEmailProps) {
  const rows = [
    { label: 'Número', value: bookingNumber },
    { label: 'Data', value: date },
    { label: 'Hora', value: time },
  ];
  if (reason) rows.push({ label: 'Motivo', value: reason });

  return (
    <EmailShell preview={`Reserva cancelada · ${bookingNumber}`}>
      <Greeting name={name} />
      <Paragraph>A reserva abaixo foi cancelada.</Paragraph>
      <InfoTable rows={rows} />
      {rebookUrl ? (
        <>
          <Paragraph>Queres remarcar? Estamos cá para ti.</Paragraph>
          <Section style={{ textAlign: 'center' as const, margin: '24px 0 4px' }}>
            <ActionButton href={rebookUrl}>Marcar nova reserva</ActionButton>
          </Section>
        </>
      ) : (
        <Muted>Sempre que quiseres remarcar, é só entrares na tua conta ou contactares-nos.</Muted>
      )}
    </EmailShell>
  );
}

export default BookingCancellationEmail;
