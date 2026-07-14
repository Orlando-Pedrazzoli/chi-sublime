// 📄 src/app/privacidade/page.tsx
/**
 * Chi Sublime — Política de Privacidade
 * ============================================================
 *
 * Redigida com base nos dados que o sistema REALMENTE recolhe
 * (conta, reservas, faturação Moloni, emails Resend, Cloudinary).
 *
 * ⚠️ TODO antes do deploy: confirmar com o Jean Pierre a
 * denominação legal e o NIF do responsável pelo tratamento
 * (marcados com [A CONFIRMAR]). Recomenda-se revisão jurídica.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalList, P } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Como o Chi Sublime recolhe, utiliza e protege os seus dados pessoais, em conformidade com o RGPD.',
  alternates: { canonical: '/privacidade' },
};

export default function PrivacidadePage() {
  return (
    <LegalPage eyebrow="Legal" title="Política de Privacidade" updated="julho de 2026">
      <LegalSection title="Quem somos">
        <P>
          O site chisublime.pt é operado por Chi Sublime — Hair Style &amp; Beauty
          <strong> [A CONFIRMAR: denominação legal e NIF]</strong>, com estabelecimento na Quinta da
          Bicuda, Cascais, Portugal (&quot;Chi Sublime&quot;, &quot;nós&quot;). Somos o responsável
          pelo tratamento dos dados pessoais recolhidos através deste site.
        </P>
        <P>Contacto para questões de privacidade: reservas@chisublime.pt · +351 932 932 691.</P>
      </LegalSection>

      <LegalSection title="Que dados recolhemos">
        <LegalList
          items={[
            <>
              <strong>Dados de conta:</strong> nome, email e password (guardada de forma cifrada —
              nunca em texto legível).
            </>,
            <>
              <strong>Dados de reserva:</strong> serviços escolhidos, data, hora, profissional,
              telefone de contacto e notas que decida partilhar (ex.: alergias).
            </>,
            <>
              <strong>Dados de faturação (opcionais):</strong> NIF, nome ou razão social e morada,
              apenas quando solicita fatura.
            </>,
            <>
              <strong>Dados técnicos:</strong> cookies estritamente necessários ao funcionamento
              (sessão e segurança). Ver a{' '}
              <Link href="/cookies" className="text-chi-gold-deep underline">
                Política de Cookies
              </Link>
              .
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Para que usamos os dados">
        <LegalList
          items={[
            'Gerir as suas reservas: confirmação, lembretes, alterações e cancelamentos (execução de contrato).',
            'Emitir faturas quando solicitadas (obrigação legal — comunicação à Autoridade Tributária através de software certificado).',
            'Manter o seu histórico de cliente para um serviço mais personalizado (interesse legítimo).',
            'Enviar comunicações promocionais apenas se tiver dado consentimento expresso — que pode retirar a qualquer momento.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Com quem partilhamos">
        <P>
          Não vendemos os seus dados. Partilhamo-los apenas com subcontratantes necessários ao
          funcionamento do serviço, vinculados por contrato:
        </P>
        <LegalList
          items={[
            'Alojamento e infraestrutura do site (Vercel) e base de dados (MongoDB Atlas).',
            'Envio de emails transacionais — confirmações e lembretes de reserva (Resend).',
            'Software de faturação certificado (Moloni), quando é emitida fatura.',
            'Alojamento de imagens do site (Cloudinary).',
          ]}
        />
        <P>
          Alguns destes fornecedores podem tratar dados fora do Espaço Económico Europeu, ao abrigo
          de cláusulas contratuais-tipo aprovadas pela Comissão Europeia.
        </P>
      </LegalSection>

      <LegalSection title="Por quanto tempo guardamos">
        <LegalList
          items={[
            'Dados de conta e histórico de reservas: enquanto a conta estiver ativa, ou até pedir a sua eliminação.',
            'Documentos de faturação: 10 anos (obrigação fiscal em Portugal).',
            'Consentimento de marketing: até ser retirado.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Os seus direitos">
        <P>
          Nos termos do RGPD, tem direito de acesso, retificação, apagamento, limitação, oposição e
          portabilidade dos seus dados, bem como de retirar consentimentos dados. Para exercer
          qualquer direito, contacte reservas@chisublime.pt — respondemos no prazo máximo de 30
          dias. Detalhes em{' '}
          <Link href="/rgpd" className="text-chi-gold-deep underline">
            RGPD — Os seus direitos
          </Link>
          .
        </P>
        <P>
          Tem ainda o direito de apresentar reclamação à autoridade de controlo portuguesa: CNPD —
          Comissão Nacional de Proteção de Dados (cnpd.pt).
        </P>
      </LegalSection>

      <LegalSection title="Segurança">
        <P>
          Aplicamos medidas técnicas e organizativas adequadas: ligações cifradas (HTTPS), passwords
          com hash criptográfico, controlo de acessos por perfil e registo de operações
          administrativas.
        </P>
      </LegalSection>

      <LegalSection title="Alterações a esta política">
        <P>
          Podemos atualizar esta política para refletir mudanças legais ou do serviço. A data no
          topo indica sempre a versão em vigor.
        </P>
      </LegalSection>
    </LegalPage>
  );
}
