// 📄 src/lib/email/templates/_layout.tsx
/**
 * Chi Sublime — Shell partilhado dos emails (react-email)
 * ============================================================
 *
 * Envolve o conteúdo de cada template com o cabeçalho (logo sobre
 * verde), o corpo em creme e o rodapé com contactos. Exporta também
 * os tokens da marca e um botão dourado reutilizável, para os
 * templates não repetirem estilos.
 *
 * Os templates são componentes PUROS: recebem os dados (e URLs) por
 * props. Quem envia (send.ts) constrói os URLs via resend.ts.
 */

import * as React from 'react';
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import { SALON_CONTACT_FALLBACK } from '@/lib/constants/business';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const brand = {
  greenDeep: '#1f3d2e',
  greenSoft: '#2d5440',
  gold: '#d4af6e',
  goldDeep: '#b8924a',
  cream: '#faf7f2',
  sand: '#efe9dd',
  ink: '#2b2b2b',
  muted: '#5a5a5a',
} as const;

const fontStack =
  "'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, sans-serif";

// ============================================================
// Botão de ação (dourado)
// ============================================================

export function ActionButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: brand.gold,
        color: brand.greenDeep,
        fontWeight: 700,
        fontSize: '15px',
        textDecoration: 'none',
        padding: '14px 34px',
        borderRadius: '4px',
        display: 'inline-block',
      }}
    >
      {children}
    </Button>
  );
}

// ============================================================
// Shell
// ============================================================

export function EmailShell({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="pt">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{ backgroundColor: brand.sand, margin: 0, padding: '24px 0', fontFamily: fontStack }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: brand.cream,
            borderRadius: '10px',
            overflow: 'hidden',
            border: `1px solid ${brand.sand}`,
          }}
        >
          {/* Cabeçalho */}
          <Section
            style={{
              backgroundColor: brand.greenDeep,
              padding: '26px 32px',
              textAlign: 'center' as const,
            }}
          >
            <Img
              src={`${APP_URL}/images/logo.png`}
              width="132"
              height="auto"
              alt="Chi Sublime"
              style={{ margin: '0 auto', display: 'block' }}
            />
          </Section>

          {/* Corpo */}
          <Section style={{ padding: '32px' }}>{children}</Section>

          {/* Rodapé */}
          <Hr style={{ borderColor: brand.sand, margin: '0' }} />
          <Section style={{ padding: '24px 32px', backgroundColor: brand.cream }}>
            <Text
              style={{
                margin: '0 0 4px',
                fontSize: '13px',
                color: brand.greenDeep,
                fontWeight: 700,
              }}
            >
              {SALON_CONTACT_FALLBACK.name} — Hair Style &amp; Beauty
            </Text>
            <Text style={{ margin: '0', fontSize: '12px', color: brand.muted, lineHeight: '18px' }}>
              {SALON_CONTACT_FALLBACK.address}, {SALON_CONTACT_FALLBACK.postalCode}{' '}
              {SALON_CONTACT_FALLBACK.city}
              <br />
              {SALON_CONTACT_FALLBACK.phone} · {SALON_CONTACT_FALLBACK.email}
              <br />
              <Link href={SALON_CONTACT_FALLBACK.instagram} style={{ color: brand.goldDeep }}>
                @chiptsublime
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================================
// Blocos reutilizáveis
// ============================================================

export function Greeting({ name }: { name: string }) {
  return (
    <Text style={{ margin: '0 0 16px', fontSize: '20px', color: brand.greenDeep, fontWeight: 700 }}>
      Olá {name},
    </Text>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ margin: '0 0 14px', fontSize: '15px', color: brand.ink, lineHeight: '23px' }}>
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ margin: '18px 0 0', fontSize: '13px', color: brand.muted, lineHeight: '20px' }}>
      {children}
    </Text>
  );
}

/** Tabela de detalhes (label → valor), usada nos emails de reserva/fatura. */
export function InfoTable({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <Section
      style={{
        margin: '20px 0',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: `1px solid ${brand.sand}`,
      }}
    >
      {rows.map((r, i) => (
        <Row
          key={`${r.label}-${i}`}
          style={{ borderBottom: i < rows.length - 1 ? `1px solid ${brand.sand}` : 'none' }}
        >
          <Column
            style={{ padding: '11px 16px', color: brand.muted, fontSize: '13px', width: '42%' }}
          >
            {r.label}
          </Column>
          <Column
            style={{
              padding: '11px 16px',
              color: brand.ink,
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'right' as const,
            }}
          >
            {r.value}
          </Column>
        </Row>
      ))}
    </Section>
  );
}
