// 📄 src/lib/email/templates/booking-reminder.tsx
/**
 * Chi Sublime — Template: Lembrete de reserva
 * Componente puro. Dados e detailUrl vêm por props.
 */

import * as React from 'react';
import { Section } from '@react-email/components';
import { EmailShell, Greeting, Paragraph, Muted, ActionButton, InfoTable } from './_layout';

export interface BookingReminderEmailProps {
  name: string;
  bookingNumber: string;
  date: string;
  time: string;
  services: string;
  staffName: string;
  detailUrl: string;
}

export function BookingReminderEmail({
  name,
  bookingNumber,
  date,
  time,
  services,
  staffName,
  detailUrl,
}: BookingReminderEmailProps) {
  return (
    <EmailShell preview={`Lembrete: a tua reserva é ${date} às ${time}`}>
      <Greeting name={name} />
      <Paragraph>É já! Este é um lembrete da tua próxima visita ao Chi Sublime.</Paragraph>
      <InfoTable
        rows={[
          { label: 'Número', value: bookingNumber },
          { label: 'Data', value: date },
          { label: 'Hora', value: time },
          { label: 'Serviços', value: services },
          { label: 'Profissional', value: staffName },
        ]}
      />
      <Section style={{ textAlign: 'center' as const, margin: '24px 0 4px' }}>
        <ActionButton href={detailUrl}>Ver a minha reserva</ActionButton>
      </Section>
      <Muted>Se precisares de alterar, avisa-nos o quanto antes. Até já!</Muted>
    </EmailShell>
  );
}

export default BookingReminderEmail;
