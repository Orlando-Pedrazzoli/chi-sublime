// 📄 src/lib/email/templates/booking-confirmation.tsx
/**
 * Chi Sublime — Template: Confirmação de marcação
 * ============================================================
 *
 * Enviado quando a marcação fica CONFIRMADA: logo ao marcar (modo
 * automático, o padrão) ou quando o salão aprova um pedido (modo
 * manual). O convite .ics segue em anexo; `calendarUrl` abre o
 * Google Calendar já preenchido.
 *
 * Componente puro. Dados e URLs vêm por props.
 */

import * as React from 'react';
import { Link, Section } from '@react-email/components';
import { EmailShell, Greeting, Paragraph, Muted, ActionButton, InfoTable } from './_layout';

export interface BookingConfirmationEmailProps {
  name: string;
  bookingNumber: string;
  date: string;
  time: string;
  services: string;
  staffName: string;
  total: string;
  location: string;
  detailUrl: string;
  calendarUrl?: string;
  cancellationWindowHours: number;
  /** true quando vem de um pedido aprovado pelo salão (modo manual) */
  approvedBySalon?: boolean;
}

export function BookingConfirmationEmail({
  name,
  bookingNumber,
  date,
  time,
  services,
  staffName,
  total,
  location,
  detailUrl,
  calendarUrl,
  cancellationWindowHours,
  approvedBySalon,
}: BookingConfirmationEmailProps) {
  return (
    <EmailShell preview={`Marcação confirmada · ${date} às ${time}`}>
      <Greeting name={name} />
      <Paragraph>
        {approvedBySalon
          ? 'Boas notícias: o salão confirmou o teu pedido. A tua marcação está confirmada.'
          : 'A tua marcação está confirmada. Estamos à tua espera!'}
      </Paragraph>
      <InfoTable
        rows={[
          { label: 'Data', value: date },
          { label: 'Hora', value: time },
          { label: 'Serviços', value: services },
          { label: 'Profissional', value: staffName },
          { label: 'Total', value: total },
          { label: 'Local', value: location },
          { label: 'Número', value: bookingNumber },
        ]}
      />
      <Section style={{ textAlign: 'center' as const, margin: '24px 0 8px' }}>
        <ActionButton href={detailUrl}>Ver a minha marcação</ActionButton>
      </Section>
      {calendarUrl && (
        <Section style={{ textAlign: 'center' as const, margin: '0 0 16px' }}>
          <Link href={calendarUrl} style={{ color: '#1f3d2e', fontSize: '14px' }}>
            Adicionar ao Google Calendar
          </Link>
        </Section>
      )}
      <Muted>
        Anexámos um convite de calendário (.ics) que abre no Apple Calendar, Outlook e Gmail.
      </Muted>
      <Muted>
        Precisas de alterar ou cancelar? Podes fazê-lo na tua conta até {cancellationWindowHours}h
        antes. Depois disso, contacta-nos diretamente.
      </Muted>
    </EmailShell>
  );
}

export default BookingConfirmationEmail;
