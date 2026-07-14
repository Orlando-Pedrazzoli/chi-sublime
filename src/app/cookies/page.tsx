// 📄 src/app/cookies/page.tsx
/**
 * Chi Sublime — Política de Cookies
 * ============================================================
 * Reflete os cookies REAIS do site: apenas os estritamente
 * necessários (sessão NextAuth + CSRF). Sem analytics nem
 * marketing — se um dia adicionares (ex.: GA4), esta página e
 * um banner de consentimento passam a ser obrigatórios.
 */

import type { Metadata } from 'next';
import { LegalPage, LegalSection, LegalList, P } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Que cookies o site do Chi Sublime utiliza e porquê.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <LegalPage eyebrow="Legal" title="Política de Cookies" updated="julho de 2026">
      <LegalSection title="O que são cookies">
        <P>
          Cookies são pequenos ficheiros guardados no seu dispositivo quando visita um site. Servem
          para o site funcionar, memorizar sessões e preferências.
        </P>
      </LegalSection>

      <LegalSection title="Os cookies que usamos">
        <P>
          O chisublime.pt utiliza <strong>apenas cookies estritamente necessários</strong> ao
          funcionamento — razão pela qual não lhe pedimos consentimento através de banner:
        </P>
        <LegalList
          items={[
            <>
              <strong>Cookies de sessão (autenticação):</strong> mantêm a sua sessão iniciada de
              forma segura enquanto usa a conta e o painel. Expiram ao terminar sessão ou após o
              período de validade.
            </>,
            <>
              <strong>Cookie de proteção CSRF:</strong> protege formulários contra pedidos forjados.
            </>,
          ]}
        />
        <P>
          Usamos ainda <strong>sessionStorage</strong> (armazenamento local do navegador, não é um
          cookie) para guardar temporariamente a sua seleção durante o processo de reserva — é
          apagado ao fechar o navegador e nunca sai do seu dispositivo.
        </P>
      </LegalSection>

      <LegalSection title="O que não usamos">
        <LegalList
          items={[
            'Cookies de análise/estatística de terceiros.',
            'Cookies de publicidade ou rastreamento entre sites.',
            'Redes sociais embebidas com rastreamento.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Gerir cookies no navegador">
        <P>
          Pode bloquear ou apagar cookies nas definições do seu navegador. Note que, sem os cookies
          de sessão, não é possível iniciar sessão nem concluir reservas com conta.
        </P>
      </LegalSection>
    </LegalPage>
  );
}
