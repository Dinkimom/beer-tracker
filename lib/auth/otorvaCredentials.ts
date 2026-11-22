/**
 * Встроенный трекер otorva: email и пароль → JWT пользователя otorva. Дальше JWT идёт по общим
 * путям планера как токен трекера (регистрация организации, сессия, X-Tracker-Token).
 *
 * Онбординг (`register`, только пока планер не настроен): пустой otorva получает первого админа по
 * серверному секрету `OTORVA_BOOTSTRAP_TOKEN` (в браузер не уходит), иначе — обычный вход.
 * Попытки входа ограничивает сам otorva (`AUTH_RATE_LIMIT_PER_MINUTE`, по адресу сервера планера).
 */
import axios from 'axios';

import { otorvaApiUrlFromEnv } from '@/lib/issueTrackerProvider/otorvaApi';
import { readOrganizationIssueTrackerConfig } from '@/lib/issueTrackerProvider/settings';
import { readOnPremSetupState } from '@/lib/onPrem/setupState';
import { fetchFirstOrganizationId, findOrganizationById } from '@/lib/organizations/organizationRepository';

const OTORVA_AUTH_TIMEOUT_MS = 15_000;

type OtorvaCredentialsMode = 'login' | 'register';

interface OtorvaCredentialsInput {
  email: string;
  firstName?: string;
  lastName?: string;
  mode: OtorvaCredentialsMode;
  password: string;
}

/** Код ошибки входа: текст для человека — в словаре интерфейса (`auth.otorva.errors.<code>`). */
export type OtorvaSessionErrorCode =
  | 'already_initialized'
  | 'bootstrap_missing'
  | 'email_taken'
  | 'invalid_credentials'
  | 'invalid_input'
  | 'rate_limited'
  | 'unavailable';

type OtorvaCredentialsResult =
  | { code: OtorvaSessionErrorCode; ok: false; status: number }
  | { ok: true; token: string };

/** Адрес otorva подключённой организации; до настройки — адрес этого сервера. */
async function resolveOtorvaApiUrl(): Promise<string> {
  const organizationId = await fetchFirstOrganizationId();
  const org = organizationId ? await findOrganizationById(organizationId) : null;
  const config = org ? readOrganizationIssueTrackerConfig(org.settings) : null;
  return config?.kind === 'otorva' ? config.apiUrl : otorvaApiUrlFromEnv();
}

const OTORVA_STATUS_ERRORS: Readonly<Record<number, OtorvaSessionErrorCode>> = {
  400: 'invalid_input',
  401: 'invalid_credentials',
  409: 'email_taken',
  429: 'rate_limited',
};

function otorvaError(error: unknown): OtorvaCredentialsResult {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const code = status != null ? OTORVA_STATUS_ERRORS[status] : undefined;
  return code ? { code, ok: false, status: status! } : { code: 'unavailable', ok: false, status: 503 };
}

/** Имя для первого админа: из формы, иначе — локальная часть email. */
function adminNames(input: OtorvaCredentialsInput): { first_name: string; last_name: string } {
  const first = input.firstName?.trim() || input.email.split('@')[0] || input.email;
  return { first_name: first, last_name: input.lastName?.trim() ?? '' };
}

export async function exchangeOtorvaCredentials(input: OtorvaCredentialsInput): Promise<OtorvaCredentialsResult> {
  const email = input.email.trim().toLowerCase();
  const api = axios.create({ baseURL: await resolveOtorvaApiUrl(), timeout: OTORVA_AUTH_TIMEOUT_MS });
  try {
    if (input.mode === 'register') {
      if ((await readOnPremSetupState()).initialized) {
        return { code: 'already_initialized', ok: false, status: 403 };
      }
      const { data: setup } = await api.get<{ initialized: boolean }>('/auth/setup-state');
      if (!setup.initialized) {
        const bootstrapToken = process.env.OTORVA_BOOTSTRAP_TOKEN?.trim();
        if (!bootstrapToken) {
          return { code: 'bootstrap_missing', ok: false, status: 503 };
        }
        const { data } = await api.post<{ token: string }>('/auth/bootstrap', {
          bootstrap_token: bootstrapToken,
          email,
          password: input.password,
          ...adminNames(input),
        });
        return { ok: true, token: data.token };
      }
    }
    const { data } = await api.post<{ token: string }>('/auth/login', { email, password: input.password });
    return { ok: true, token: data.token };
  } catch (error) {
    return otorvaError(error);
  }
}
