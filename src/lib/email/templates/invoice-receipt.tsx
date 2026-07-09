// 📄 src/lib/email/templates/invoice-receipt.tsx
/**
 * Chi Sublime — Template: Fatura / Recibo
 * Componente puro. `pdfUrl` liga ao documento emitido (Fase 3).
 */

import * as React from 'react';
import { Section } from '@react-email/components';
import { EmailShell, Greeting, Paragraph, Muted, ActionButton, InfoTable } from './_layout';

export interface InvoiceReceiptEmailProps {
  name: string;
  documentNumber: string;
  date: string;
  total: string;
  pdfUrl: string;
}

export function InvoiceReceiptEmail({
  name,
  documentNumber,
  date,
  total,
  pdfUrl,
}: InvoiceReceiptEmailProps) {
  return (
    <EmailShell preview={`O teu documento ${documentNumber}`}>
      <Greeting name={name} />
      <Paragraph>Segue o teu documento fiscal do Chi Sublime.</Paragraph>
      <InfoTable
        rows={[
          { label: 'Documento', value: documentNumber },
          { label: 'Data', value: date },
          { label: 'Total', value: total },
        ]}
      />
      <Section style={{ textAlign: 'center' as const, margin: '24px 0 4px' }}>
        <ActionButton href={pdfUrl}>Descarregar PDF</ActionButton>
      </Section>
      <Muted>Guarda este documento para os teus registos. Obrigado pela tua preferência.</Muted>
    </EmailShell>
  );
}

export default InvoiceReceiptEmail;
