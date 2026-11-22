/**
 * Общие данные стенда регресса (`pnpm e2e:stand`, scripts/e2e/stand.sh): учётка первого админа,
 * команда, адрес otorva, файлы состояния между спеками. Интерфейс стенда — на русском (основной язык
 * продукта); тексты в спеках — по ключам словаря `ui`, а не литералами.
 */
import { ruMessages } from '@/lib/i18n/messages/ru';

export const ui = ruMessages;

export const STAND_ADMIN = {
  email: 'ada@stand.local',
  firstName: 'Ада',
  lastName: 'Лавлейс',
  organization: 'Стенд регресса',
  // Учётка одноразового стенда, не секрет.
  secret: 'stand-password-123',
} as const;

/** Команда планера на доске otorva из сида. */
export const STAND_TEAM = 'Демо';

export const STAND_OTORVA_URL = process.env.E2E_STAND_OTORVA_URL ?? 'http://127.0.0.1:58090/api/v1';

/** Результат сида (`seedOtorva.ts`): ключи задач, доска, спринты, люди — для спек после онбординга. */
export const STAND_SEED_FILE = 'e2e/.results/stand/seed.json';

/** Сессия первого админа после входа по email и паролю (`storageState` Playwright). */
export const STAND_ADMIN_STATE = 'e2e/.results/stand/admin-state.json';
