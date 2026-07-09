// 📄 src/lib/email/templates/password-reset.tsx
/**
 * Chi Sublime — Template: Recuperação de password
 * Componente puro. URL construído pelo caller (send.ts → resend.ts).
 */

import * as React from 'react';
import { Section } from '@react-email/components';
import { EmailShell, Greeting, Paragraph, Muted, ActionButton } from './_layout';

export interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
}

export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailShell preview="Recupera a tua password no Chi Sublime">
      <Greeting name={name} />
      <Paragraph>Recebemos um pedido para redefinir a tua password.</Paragraph>
      <Paragraph>Clica no botão abaixo para criares uma nova:</Paragraph>
      <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
        <ActionButton href={resetUrl}>Redefinir password</ActionButton>
      </Section>
      <Muted>Se não pediste esta recuperação, ignora este email. O link expira em 1 hora.</Muted>
    </EmailShell>
  );
}

export default PasswordResetEmail;
