// 📄 src/lib/email/templates/email-verification.tsx
/**
 * Chi Sublime — Template: Verificação de email
 * Componente puro. A rota /verificar-email fica para a Fase 5; o
 * template já a suporta via prop `verifyUrl`.
 */

import * as React from 'react';
import { Section } from '@react-email/components';
import { EmailShell, Greeting, Paragraph, Muted, ActionButton } from './_layout';

export interface EmailVerificationEmailProps {
  name: string;
  verifyUrl: string;
}

export function EmailVerificationEmail({ name, verifyUrl }: EmailVerificationEmailProps) {
  return (
    <EmailShell preview="Confirma o teu email — Chi Sublime">
      <Greeting name={name} />
      <Paragraph>Falta só um passo: confirma o teu endereço de email.</Paragraph>
      <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
        <ActionButton href={verifyUrl}>Confirmar email</ActionButton>
      </Section>
      <Muted>Se não criaste conta no Chi Sublime, podes ignorar este email.</Muted>
    </EmailShell>
  );
}

export default EmailVerificationEmail;
