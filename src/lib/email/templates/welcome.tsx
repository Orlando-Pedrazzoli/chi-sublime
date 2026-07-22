// 📄 src/lib/email/templates/welcome.tsx
/**
 * Chi Sublime — Template: Boas-vindas (conta criada)
 * Componente puro. URL construído pelo caller.
 */

import * as React from 'react';
import { Section } from '@react-email/components';
import { EmailShell, Greeting, Paragraph, Muted, ActionButton } from './_layout';

export interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

export function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  return (
    <EmailShell preview="Bem-vindo(a) ao Chi Sublime">
      <Greeting name={name} />
      <Paragraph>
        A tua conta foi criada com sucesso. A partir de agora podes marcar serviços, gerir as tuas
        marcações e ver o histórico, tudo num só sítio.
      </Paragraph>
      <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
        <ActionButton href={loginUrl}>Entrar na minha conta</ActionButton>
      </Section>
      <Muted>Estamos ansiosos por te receber na Quinta da Bicuda, em Cascais.</Muted>
    </EmailShell>
  );
}

export default WelcomeEmail;
