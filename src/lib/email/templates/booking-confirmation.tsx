// 📄 src/lib/email/templates/booking-confirmation.tsx
/**
 * Chi Sublime — Template: Confirmação de reserva
 * Componente puro. Dados e detailUrl vêm por props.
 */

import * as React from 'react';
import { Section } from '@react-email/components';
import { EmailShell, Greeting, Paragraph, Muted, ActionButton, InfoTable } from './_layout';

export interface BookingConfirmationEmailProps {
  name: string;
  bookingNumber: string;
  date: string;
  time: string;
  services: string;
  staffName: string;
  total: string;
  detailUrl: string;
}

export function BookingConfirmationEmail({
  name,
  bookingNumber,
  date,
  time,
  services,
  staffName,
  total,
  detailUrl,
}: BookingConfirmationEmailProps) {
  return (
    <EmailShell preview={`Reserva confirmada · ${bookingNumber}`}>
      <Greeting name={name} />
      <Paragraph>A tua reserva está confirmada. Aqui ficam os detalhes:</Paragraph>
      <InfoTable
        rows={[
          { label: 'Número', value: bookingNumber },
          { label: 'Data', value: date },
          { label: 'Hora', value: time },
          { label: 'Serviços', value: services },
          { label: 'Profissional', value: staffName },
          { label: 'Total', value: total },
        ]}
      />
      <Section style={{ textAlign: 'center' as const, margin: '24px 0 4px' }}>
        <ActionButton href={detailUrl}>Ver detalhes da reserva</ActionButton>
      </Section>
      <Muted>
        Precisas de reagendar ou cancelar? Fá-lo na tua conta ou contacta-nos com antecedência.
      </Muted>
    </EmailShell>
  );
}

export default BookingConfirmationEmail;
