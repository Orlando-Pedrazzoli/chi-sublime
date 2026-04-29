/**
 * Chi Sublime — Staff Allocator
 * ============================================================
 *
 * Quando cliente escolhe "qualquer staff disponivel", precisamos
 * de decidir QUAL staff atribuir.
 *
 * Algoritmo: MENOR OCUPACAO no dia.
 *
 * Best practice da industria (Boulevard's Precision Scheduling, Anolla):
 *  - Distribui trabalho de forma justa entre staff
 *  - Evita "queimar" o staff mais popular
 *  - Aumenta receita para staff menos procurado
 *  - Em empate, ordem alfabetica (consistente entre requests)
 */

import { Booking } from '@/lib/models';
import { combineDateAndTime, toISODate } from '@/lib/utils/time-utils';

/**
 * Calcula a ocupacao (minutos totais reservados) de um staff num dia especifico.
 *
 * Conta apenas reservas com status: pending, confirmed, in-progress.
 * (Cancelled e no-show NAO contam.)
 *
 * @returns minutos totais ocupados
 */
export async function getStaffOccupationMinutes(staffId: string, date: Date): Promise<number> {
  const isoDate = toISODate(date);
  const dayStart = combineDateAndTime(date, '00:00');
  const dayEnd = combineDateAndTime(date, '23:59');

  const bookings = await Booking.find({
    staffId,
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    startTime: { $gte: dayStart, $lte: dayEnd },
  })
    .select('totalDuration')
    .lean();

  return bookings.reduce((sum, b) => sum + (b.totalDuration ?? 0), 0);
}

/**
 * Dado um conjunto de staff candidatos, devolve aquele com menor ocupacao
 * no dia. Em empate, escolhe por ordem alfabetica do nome (consistente).
 *
 * @param candidates Array de { id, name } dos staff a considerar
 * @param date Data para calcular ocupacao
 * @returns staff escolhido (ou null se array vazio)
 */
export async function pickLeastOccupiedStaff(
  candidates: { id: string; name: string }[],
  date: Date,
): Promise<{ id: string; name: string; occupationMinutes: number } | null> {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) {
    const occ = await getStaffOccupationMinutes(candidates[0].id, date);
    return { ...candidates[0], occupationMinutes: occ };
  }

  // Calcular ocupacao de cada um em paralelo
  const withOccupation = await Promise.all(
    candidates.map(async (c) => ({
      ...c,
      occupationMinutes: await getStaffOccupationMinutes(c.id, date),
    })),
  );

  // Ordenar por: 1) menor ocupacao, 2) ordem alfabetica do nome
  withOccupation.sort((a, b) => {
    if (a.occupationMinutes !== b.occupationMinutes) {
      return a.occupationMinutes - b.occupationMinutes;
    }
    return a.name.localeCompare(b.name);
  });

  return withOccupation[0];
}
