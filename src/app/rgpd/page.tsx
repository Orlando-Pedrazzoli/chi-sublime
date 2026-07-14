// 📄 src/app/rgpd/page.tsx
/**
 * Chi Sublime — RGPD: Os seus direitos
 * ============================================================
 * Página prática de exercício de direitos (complementa a
 * Política de Privacidade, que descreve o tratamento).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalList, P } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'RGPD — Os seus direitos',
  description:
    'Como exercer os seus direitos de proteção de dados (acesso, retificação, apagamento e outros) junto do Chi Sublime.',
  alternates: { canonical: '/rgpd' },
};

export default function RgpdPage() {
  return (
    <LegalPage eyebrow="Legal" title="RGPD — Os seus direitos" updated="julho de 2026">
      <LegalSection title="Os direitos que pode exercer">
        <LegalList
          items={[
            <>
              <strong>Acesso</strong> — saber que dados seus tratamos e receber uma cópia.
            </>,
            <>
              <strong>Retificação</strong> — corrigir dados inexatos ou desatualizados (também pode
              fazê-lo diretamente na sua conta).
            </>,
            <>
              <strong>Apagamento</strong> — pedir a eliminação da conta e dos dados, salvo os que
              temos obrigação legal de conservar (ex.: faturas, 10 anos).
            </>,
            <>
              <strong>Limitação e oposição</strong> — restringir ou opor-se a determinados
              tratamentos, incluindo marketing.
            </>,
            <>
              <strong>Portabilidade</strong> — receber os dados que nos forneceu em formato
              estruturado e de leitura automática.
            </>,
            <>
              <strong>Retirar consentimento</strong> — a qualquer momento, sem afetar tratamentos
              anteriores (ex.: comunicações promocionais).
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Como exercer">
        <P>
          Envie o seu pedido para <strong>reservas@chisublime.pt</strong> a partir do email
          associado à sua conta (para verificarmos a identidade), indicando o direito que pretende
          exercer. Respondemos no prazo máximo de <strong>30 dias</strong>.
        </P>
      </LegalSection>

      <LegalSection title="Reclamações">
        <P>
          Se considerar que os seus direitos não foram respeitados, pode apresentar reclamação à
          autoridade de controlo portuguesa:{' '}
          <strong>CNPD — Comissão Nacional de Proteção de Dados</strong> (cnpd.pt).
        </P>
      </LegalSection>

      <LegalSection title="Mais informação">
        <P>
          A descrição completa de que dados tratamos, com que finalidades e por quanto tempo está na{' '}
          <Link href="/privacidade" className="text-chi-gold-deep underline">
            Política de Privacidade
          </Link>
          .
        </P>
      </LegalSection>
    </LegalPage>
  );
}
