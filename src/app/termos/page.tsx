// 📄 src/app/termos/page.tsx
/**
 * Chi Sublime — Termos e Condições
 * ============================================================
 * ⚠️ TODO: confirmar denominação legal/NIF [A CONFIRMAR] e
 * recomendar revisão jurídica antes do deploy.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalList, P } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Termos e Condições',
  description: 'Termos e condições de utilização do site e do serviço de reservas do Chi Sublime.',
  alternates: { canonical: '/termos' },
};

export default function TermosPage() {
  return (
    <LegalPage eyebrow="Legal" title="Termos e Condições" updated="julho de 2026">
      <LegalSection title="1. Objeto">
        <P>
          Estes termos regulam a utilização do site chisublime.pt e do respetivo serviço de reservas
          online, operados por Chi Sublime — Hair Style &amp; Beauty{' '}
          <strong>[A CONFIRMAR: denominação legal e NIF]</strong>, Quinta da Bicuda, Cascais. Ao
          criar conta ou efetuar uma reserva, aceita estes termos.
        </P>
      </LegalSection>

      <LegalSection title="2. Conta de utilizador">
        <LegalList
          items={[
            'A conta é pessoal e intransmissível; os dados fornecidos devem ser verdadeiros e atuais.',
            'É responsável pela confidencialidade da sua password e pelas ações realizadas na sua conta.',
            'Reservamo-nos o direito de suspender contas usadas de forma abusiva ou fraudulenta.',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Reservas">
        <LegalList
          items={[
            'A reserva online é confirmada no momento da submissão, salvo indicação em contrário, e fica associada à sua conta.',
            'Os horários mostrados refletem a disponibilidade real do salão e dos profissionais no momento da consulta.',
            <>
              Cancelamentos e reagendamentos regem-se pela{' '}
              <Link href="/cancelamento" className="text-chi-gold-deep underline">
                Política de Cancelamento
              </Link>{' '}
              (aceite obrigatoriamente em cada reserva).
            </>,
            'O salão pode recusar ou cancelar reservas em casos de força maior, abuso do sistema ou incumprimento reiterado.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Preços e pagamento">
        <LegalList
          items={[
            'Os preços apresentados no site incluem IVA à taxa legal em vigor e podem ser atualizados a qualquer momento (sem efeito em reservas já efetuadas).',
            'O pagamento é efetuado no salão, após a prestação do serviço, pelos meios aí disponíveis.',
            'Pode solicitar fatura com NIF no momento da reserva ou do pagamento.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Conduta no estabelecimento">
        <P>
          Reservamo-nos o direito de recusar o serviço em situações de comportamento abusivo para
          com a equipa ou outras clientes.
        </P>
      </LegalSection>

      <LegalSection title="6. Propriedade intelectual">
        <P>
          Os conteúdos do site (textos, fotografias, marca e identidade visual) pertencem ao Chi
          Sublime ou aos respetivos autores e não podem ser reproduzidos sem autorização.
        </P>
      </LegalSection>

      <LegalSection title="7. Responsabilidade">
        <P>
          Empenhamo-nos em manter o site disponível e a informação correta, mas não garantimos
          funcionamento ininterrupto. Não somos responsáveis por danos resultantes de
          indisponibilidades técnicas alheias ao nosso controlo.
        </P>
      </LegalSection>

      <LegalSection title="8. Dados pessoais">
        <P>
          O tratamento de dados pessoais é descrito na{' '}
          <Link href="/privacidade" className="text-chi-gold-deep underline">
            Política de Privacidade
          </Link>
          .
        </P>
      </LegalSection>

      <LegalSection title="9. Lei aplicável e litígios">
        <P>
          Aplica-se a lei portuguesa. Em caso de litígio de consumo, o consumidor pode recorrer a
          uma entidade de resolução alternativa de litígios — ex.: Centro de Arbitragem de Conflitos
          de Consumo de Lisboa (centroarbitragemlisboa.pt) — ou à plataforma europeia ODR
          (ec.europa.eu/consumers/odr).
        </P>
      </LegalSection>
    </LegalPage>
  );
}
