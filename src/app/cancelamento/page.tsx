// 📄 src/app/cancelamento/page.tsx
/**
 * Chi Sublime — Política de Cancelamento
 * ============================================================
 *
 * PÁGINA CRÍTICA: é o link que o cliente aceita obrigatoriamente
 * no Step 3 da reserva (checkbox). Os valores refletem
 * BOOKING_RULES (janela de 24h) — se a regra mudar em
 * constants/business.ts, atualizar este texto.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalList, P } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Política de Cancelamento',
  description:
    'Política de cancelamento e reagendamento de reservas do Chi Sublime — Hair Style & Beauty, Cascais.',
  alternates: { canonical: '/cancelamento' },
};

export default function CancelamentoPage() {
  return (
    <LegalPage eyebrow="Reservas" title="Política de Cancelamento" updated="julho de 2026">
      <LegalSection title="Cancelamento gratuito até 24 horas antes">
        <P>
          Pode cancelar ou reagendar a sua reserva sem qualquer custo até{' '}
          <strong>24 horas antes</strong> da hora marcada. Dentro desse prazo, faz tudo sozinho(a)
          na sua conta, sem necessidade de contacto.
        </P>
      </LegalSection>

      <LegalSection title="Como cancelar ou reagendar">
        <LegalList
          items={[
            <>
              <strong>Online:</strong> entre na sua conta em{' '}
              <Link href="/conta/reservas" className="text-chi-gold-deep underline">
                As minhas reservas
              </Link>{' '}
              e escolha cancelar ou reagendar.
            </>,
            <>
              <strong>Por telefone ou WhatsApp:</strong> +351 932 932 691 — indique o número da
              reserva (ex.: CS-2026-0001).
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Cancelamentos com menos de 24 horas">
        <P>
          Cancelamentos dentro das 24 horas anteriores à marcação já não podem ser feitos online.
          Nesses casos, contacte-nos diretamente — analisamos cada situação com bom senso,
          especialmente emergências e imprevistos genuínos.
        </P>
        <P>
          Pedimos esta antecedência porque um horário cancelado à última hora dificilmente volta a
          ser preenchido, e representa tempo reservado em exclusivo para si pela nossa equipa.
        </P>
      </LegalSection>

      <LegalSection title="Não comparência (no-show)">
        <P>
          Se não comparecer sem aviso, a falta fica registada. Faltas repetidas podem levar a que
          futuras reservas exijam confirmação prévia por telefone ou o pagamento de um sinal.
        </P>
      </LegalSection>

      <LegalSection title="Atrasos">
        <P>
          Se estiver atrasado(a), avise-nos. Toleramos até 10–15 minutos consoante a agenda do dia;
          a partir daí poderá ser necessário encurtar o serviço ou reagendar, para não prejudicar as
          clientes seguintes.
        </P>
      </LegalSection>

      <LegalSection title="Cancelamentos pelo salão">
        <P>
          Em caso de imprevisto da nossa parte (doença de um profissional, avaria, encerramento
          forçado), avisamos com a maior antecedência possível e damos-lhe prioridade no
          reagendamento para o horário que lhe for mais conveniente.
        </P>
      </LegalSection>
    </LegalPage>
  );
}
