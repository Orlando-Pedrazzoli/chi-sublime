// 📄 src/lib/invoicing/moloni-client.ts
/**
 * Chi Sublime — Cliente HTTP da API Moloni (v1)
 * ============================================================
 *
 * Camada fina e PURA (sem base de dados) partilhada pelo provider,
 * pela sincronização de artigos e pelos scripts de CLI.
 *
 * Convenções da API (https://www.moloni.pt/dev/utilizacao/):
 *   POST {BASE}{endpoint}/?access_token=…&json=true&human_errors=1
 *   Corpo JSON. Erros de validação vêm como array/objeto de erros;
 *   inserts/updates bem-sucedidos devolvem { valid: 1, …_id }.
 */

export const MOLONI_BASE_URL = process.env.MOLONI_BASE_URL || 'https://api.moloni.pt/v1/';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type MoloniObj = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export class MoloniApiError extends Error {
  readonly endpoint: string;
  readonly details: unknown;

  constructor(endpoint: string, message: string, details?: unknown) {
    super(`${endpoint}: ${message}`);
    this.name = 'MoloniApiError';
    this.endpoint = endpoint;
    this.details = details;
  }
}

/** Mensagem legível de uma resposta de erro da Moloni (ou null se não for erro). */
export function moloniErrorMessage(data: unknown): string | null {
  if (data === null || data === undefined) return 'Resposta vazia da Moloni';
  if (Array.isArray(data)) {
    // getAll/getByX devolvem arrays de registos; arrays de erros trazem `code`/`description`
    const looksLikeErrors = data.length > 0 && data.every((e) => e && (e.code || e.description));
    if (!looksLikeErrors) return null;
    return data
      .map((e) => [e.description, e.field ?? e.code].filter(Boolean).join(' — '))
      .join('; ');
  }
  if (typeof data === 'object') {
    const obj = data as MoloniObj;
    if (obj.error || obj.errors) {
      const e = obj.error ?? obj.errors;
      if (typeof e === 'string')
        return obj.error_description ? `${e}: ${obj.error_description}` : e;
      try {
        return JSON.stringify(e);
      } catch {
        return 'Erro da Moloni';
      }
    }
    if (obj.valid === 0) return 'Pedido inválido (valid: 0)';
  }
  return null;
}

/** POST JSON a um endpoint. Lança MoloniApiError em erro HTTP ou de validação. */
export async function moloniCall<T = unknown>(
  endpoint: string,
  accessToken: string,
  body: MoloniObj,
): Promise<T> {
  const url = `${MOLONI_BASE_URL}${endpoint}/?access_token=${encodeURIComponent(accessToken)}&json=true&human_errors=1`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (err) {
    throw new MoloniApiError(endpoint, `sem ligação à Moloni (${(err as Error).message})`);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new MoloniApiError(endpoint, `HTTP ${res.status}`, data);
  }
  const errorMessage = moloniErrorMessage(data);
  if (errorMessage) throw new MoloniApiError(endpoint, errorMessage, data);
  return data as T;
}

export type MoloniGrant = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

/** Pede um token. `params` = grant_type password ou refresh_token. */
export async function moloniGrant(params: Record<string, string>): Promise<MoloniGrant> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${MOLONI_BASE_URL}grant/?${query}`, { cache: 'no-store' });
  const data = (await res.json().catch(() => ({}))) as MoloniObj;
  if (!data.access_token || !data.refresh_token) {
    throw new MoloniApiError(
      'grant',
      data.error_description || data.error || `HTTP ${res.status} — resposta inválida`,
    );
  }
  return data as MoloniGrant;
}

/** Login por password com as variáveis MOLONI_* (usado pelos scripts). */
export async function moloniPasswordGrantFromEnv(): Promise<MoloniGrant> {
  const required = [
    'MOLONI_CLIENT_ID',
    'MOLONI_CLIENT_SECRET',
    'MOLONI_USERNAME',
    'MOLONI_PASSWORD',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new MoloniApiError('grant', `variáveis em falta: ${missing.join(', ')}`);
  }
  return moloniGrant({
    grant_type: 'password',
    client_id: process.env.MOLONI_CLIENT_ID!,
    client_secret: process.env.MOLONI_CLIENT_SECRET!,
    username: process.env.MOLONI_USERNAME!,
    password: process.env.MOLONI_PASSWORD!,
  });
}

// ------------------------------------------------------------
// Formatação
// ------------------------------------------------------------

/** Cêntimos → euros com 2 casas (a Moloni trabalha em euros). */
export function centsToMoloni(cents: number): number {
  return Math.round(cents) / 100;
}

const lisbonParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${String(Number(get('hour')) % 24).padStart(2, '0')}:${get('minute')}:${get('second')}`,
  };
};

/** Data do documento no fuso do salão (evita o dia errado depois das 23h de verão). */
export function moloniDate(date: Date): string {
  return lisbonParts(date).date;
}

/** Datetime (pagamentos) no fuso do salão. */
export function moloniDateTime(date: Date): string {
  const { date: d, time } = lisbonParts(date);
  return `${d} ${time}`;
}
