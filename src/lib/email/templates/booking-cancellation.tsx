// 📄 src/lib/email/templates/booking-cancellation.tsx
/**
 * Chi Sublime — Template: Cancelamento de marcação
 * ============================================================
 *
 * variant:
 *  - 'cancelled' (padrão): marcação confirmada que foi cancelada.
 *  - 'declined': pedido pendente que o salão não pôde confirmar
 *    (modo manual) — tom diferente, convida a escolher outro horário.
 *
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
  variant?: 'cancelled' | 'declined';
}

export function BookingCancellationEmail({
  name,
  bookingNumber,
  date,
  time,
  reason,
  rebookUrl,
  variant = 'cancelled',
}: BookingCancellationEmailProps) {
  const declined = variant === 'declined';
  const rows = [
    { label: 'Número', value: bookingNumber },
    { label: 'Data', value: date },
    { label: 'Hora', value: time },
  ];
  if (reason) rows.push({ label: 'Motivo', value: reason });

  return (
    <EmailShell
      preview={
        declined
          ? `Não foi possível confirmar · ${bookingNumber}`
          : `Marcação cancelada · ${bookingNumber}`
      }
    >
      <Greeting name={name} />
      <Paragraph>
        {declined
          ? 'Lamentamos, mas não conseguimos confirmar o teu pedido para este horário.'
          : 'A marcação abaixo foi cancelada.'}
      </Paragraph>
      <InfoTable rows={rows} />
      {rebookUrl ? (
        <>
          <Paragraph>
            {declined
              ? 'Escolhe outro horário — mostramos só as disponibilidades reais.'
              : 'Queres remarcar? Estamos cá para ti.'}
          </Paragraph>
          <Section style={{ textAlign: 'center' as const, margin: '24px 0 4px' }}>
            <ActionButton href={rebookUrl}>
              {declined ? 'Escolher outro horário' : 'Fazer nova marcação'}
            </ActionButton>
          </Section>
        </>
      ) : (
        <Muted>Sempre que quiseres remarcar, é só entrares na tua conta ou contactares-nos.</Muted>
      )}
    </EmailShell>
  );
}

export default BookingCancellationEmail;
