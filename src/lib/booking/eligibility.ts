// 📄 src/lib/booking/eligibility.ts
/**
 * Chi Sublime — Elegibilidade serviço ↔ profissional (client-safe)
 * ============================================================
 *
 * Helpers PUROS (sem mongoose, sem 'use server') partilhados pelo
 * Step 1 (ServicePicker) e Step 2 (Step2Client / StaffPicker) para
 * responder, no browser e sem round-trip, a duas perguntas:
 *
 *  1. Que profissionais podem fazer TODOS os serviços do carrinho?
 *     (interseção dos `staffIds` de cada serviço; lista vazia num
 *     serviço = qualquer profissional o faz — mesma regra que
 *     `canStaffPerformAllServices` em availability.ts)
 *
 *  2. Um serviço é compatível com o carrinho atual? Isto é, existe
 *     pelo menos um profissional que faça o carrinho + esse serviço?
 *     Se não existir, o cliente entraria num beco sem saída no
 *     Step 2 (nenhuma data disponível para ninguém).
 *
 * Padrão UX seguido (Nielsen — "Inactive controls: show, disable or
 * hide"): a incompatibilidade é estrutural, por isso as opções
 * incompatíveis ficam DESATIVADAS COM EXPLICAÇÃO em vez de escondidas
 * ou de rebentarem com um erro genérico depois do clique.
 */

export type EligibleService = {
  id: string;
  name: string;
  /** IDs dos profissionais que fazem o serviço. Vazio = todos. */
  staffIds: string[];
};

export type EligibleStaff = {
  id: string;
  name: string;
};

/** Um profissional pode fazer este serviço? (vazio = qualquer um) */
export function staffCanPerform(staffId: string, service: Pick<EligibleService, 'staffIds'>) {
  return service.staffIds.length === 0 || service.staffIds.includes(staffId);
}

/**
 * IDs dos profissionais (de entre `allStaff`) capazes de fazer TODOS os
 * serviços indicados. Com carrinho vazio devolve todos.
 */
export function getQualifiedStaffIds(
  services: Pick<EligibleService, 'staffIds'>[],
  allStaff: Pick<EligibleStaff, 'id'>[],
): string[] {
  return allStaff
    .filter((s) => services.every((svc) => staffCanPerform(s.id, svc)))
    .map((s) => s.id);
}

/**
 * Serviços do carrinho que um profissional específico NÃO faz.
 * Usado para a mensagem "«Ana Rita» não realiza «Corte»".
 */
export function getServicesStaffCannotPerform<T extends Pick<EligibleService, 'staffIds'>>(
  staffId: string,
  services: T[],
): T[] {
  return services.filter((svc) => !staffCanPerform(staffId, svc));
}

/**
 * Existe pelo menos um profissional que faça o carrinho + `candidate`?
 * (Se o carrinho estiver vazio, é sempre compatível desde que o
 * serviço tenha alguém que o faça — ou seja aberto a todos.)
 */
export function isServiceCompatibleWithCart(
  candidate: Pick<EligibleService, 'staffIds'>,
  cart: Pick<EligibleService, 'staffIds'>[],
  allStaff: Pick<EligibleStaff, 'id'>[],
): boolean {
  return getQualifiedStaffIds([...cart, candidate], allStaff).length > 0;
}

/**
 * Nomes dos profissionais que fazem um serviço (para explicar ao
 * cliente "«Manicure» é feito por Ana Rita").
 */
export function getStaffNamesForService(
  service: Pick<EligibleService, 'staffIds'>,
  allStaff: EligibleStaff[],
): string[] {
  const list =
    service.staffIds.length === 0
      ? allStaff
      : allStaff.filter((s) => service.staffIds.includes(s.id));
  return list.map((s) => s.name);
}

/** "A, B e C" / "A, B and C" */
export function joinNames(names: string[], and: string): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}
