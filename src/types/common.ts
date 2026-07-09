/**
 * Chi Sublime — Tipos partilhados
 * ============================================================
 *
 * Tipos usados transversalmente por server actions, forms e UI.
 * Os tipos de domínio (IBooking, IClient...) vivem nos models.
 */

/**
 * Resultado padrão de uma server action. Discriminated union: ou
 * `success: true` com dados, ou `success: false` com erro tipado.
 *
 * @example
 * const res = await createClientAction(input);
 * if (!res.success) return toast.error(res.error.message);
 * // aqui o TS sabe que res.data existe
 */
export type ActionResult<TData = void, TCode extends string = string> =
  | { success: true; data: TData }
  | { success: false; error: ActionError<TCode> };

export type ActionError<TCode extends string = string> = {
  code: TCode;
  message: string;
  /** Erros por campo, para hidratar react-hook-form */
  fieldErrors?: Record<string, string[]>;
};

/** Helper para construir sucesso */
export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

/** Helper para construir erro */
export function fail<TCode extends string = string>(
  code: TCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): { success: false; error: ActionError<TCode> } {
  return { success: false, error: { code, message, fieldErrors } };
}

// ============================================================
// Paginação
// ============================================================

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ============================================================
// UI helpers
// ============================================================

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export type SortDirection = 'asc' | 'desc';

export type DateRange = {
  from: Date;
  to: Date;
};
