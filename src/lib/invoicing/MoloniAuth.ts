// 📄 src/lib/invoicing/MoloniAuth.ts
/**
 * Chi Sublime — Autenticação Moloni (OAuth2)
 * ============================================================
 *
 * Gere os tokens de acesso à API do Moloni (api.moloni.pt/v1).
 *
 * Fluxo (API clássica v1):
 *   - Credenciais de developer + utilizador vêm de ENV VARS
 *     (nunca da BD): MOLONI_CLIENT_ID, MOLONI_CLIENT_SECRET,
 *     MOLONI_USERNAME, MOLONI_PASSWORD.
 *   - Os tokens (access 1h + refresh) são guardados no
 *     FiscalSettings.moloni e reutilizados. Quando o access expira,
 *     tenta-se refresh_token; se esse também falhar, faz-se um novo
 *     grant por password.
 *
 * Env opcionais:
 *   MOLONI_BASE_URL   default https://api.moloni.pt/v1/  (sandbox: https://api.moloni.pt/sandbox/)
 *   MOLONI_COMPANY_ID fallback para o companyId (senão vem do FiscalSettings.moloni.companyId)
 */

import { connectDB } from '@/lib/db/connect';
import { FiscalSettings, getFiscalSettingsWithTokens } from '@/lib/models';
import { InvoiceProviderError } from './InvoiceProvider';

export const MOLONI_BASE_URL = process.env.MOLONI_BASE_URL || 'https://api.moloni.pt/v1/';
const GRANT_URL = `${MOLONI_BASE_URL}grant/`;

/** Margem de segurança para renovar antes de expirar (60s). */
const EXPIRY_BUFFER_MS = 60_000;

interface GrantResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export interface MoloniToken {
  accessToken: string;
  companyId: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new InvoiceProviderError(
      'moloni_not_configured',
      `Variável de ambiente ${name} em falta. Configura as credenciais Moloni no .env.local.`,
      false,
    );
  }
  return value;
}

async function requestGrant(params: Record<string, string>): Promise<GrantResponse> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${GRANT_URL}?${query}`, { method: 'GET' });
  return (await res.json()) as GrantResponse;
}

async function persistTokens(token: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}): Promise<void> {
  await connectDB();
  const expiresAt = new Date(Date.now() + (token.expires_in ?? 3600) * 1000);
  await FiscalSettings.updateOne(
    { key: 'default' },
    {
      $set: {
        'moloni.accessToken': token.access_token,
        'moloni.refreshToken': token.refresh_token,
        'moloni.tokenExpiresAt': expiresAt,
      },
    },
    { upsert: false },
  );
}

/**
 * Devolve um access_token válido (renovando se necessário) e o companyId.
 * Lança InvoiceProviderError se não for possível autenticar.
 */
export async function getMoloniAccessToken(): Promise<MoloniToken> {
  await connectDB();
  const settings = await getFiscalSettingsWithTokens();
  const moloni = settings?.moloni;

  const companyId = moloni?.companyId ?? (Number(process.env.MOLONI_COMPANY_ID) || 0);
  if (!companyId) {
    throw new InvoiceProviderError(
      'moloni_no_company',
      'companyId do Moloni em falta (FiscalSettings.moloni.companyId ou MOLONI_COMPANY_ID).',
      false,
    );
  }

  // 1) Token em cache ainda válido?
  if (
    moloni?.accessToken &&
    moloni.tokenExpiresAt &&
    new Date(moloni.tokenExpiresAt).getTime() - EXPIRY_BUFFER_MS > Date.now()
  ) {
    return { accessToken: moloni.accessToken, companyId };
  }

  const clientId = requireEnv('MOLONI_CLIENT_ID');
  const clientSecret = requireEnv('MOLONI_CLIENT_SECRET');

  // 2) Tentar refresh
  if (moloni?.refreshToken) {
    const refreshed = await requestGrant({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: moloni.refreshToken,
    });
    if (refreshed.access_token && refreshed.refresh_token) {
      await persistTokens({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_in: refreshed.expires_in,
      });
      return { accessToken: refreshed.access_token, companyId };
    }
  }

  // 3) Grant por password (refresh falhou ou inexistente)
  const granted = await requestGrant({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username: requireEnv('MOLONI_USERNAME'),
    password: requireEnv('MOLONI_PASSWORD'),
  });

  if (!granted.access_token || !granted.refresh_token) {
    throw new InvoiceProviderError(
      'moloni_auth_failed',
      `Falha na autenticação Moloni: ${granted.error_description || granted.error || 'resposta inválida'}`,
      true,
    );
  }

  await persistTokens({
    access_token: granted.access_token,
    refresh_token: granted.refresh_token,
    expires_in: granted.expires_in,
  });
  return { accessToken: granted.access_token, companyId };
}
