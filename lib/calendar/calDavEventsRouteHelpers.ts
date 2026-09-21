import { z } from 'zod';

import { normalizeDeveloperCalDavCredentials } from './developerCalDavCredentialsParseHelpers';

const calDavEventsRequestSchema = z.object({
  appPassword: z.string().min(1),
  caldavUrl: z.string().url(),
  email: z.string().email(),
  timeMax: z.string().datetime(),
  timeMin: z.string().datetime(),
});

type CalDavEventsRequest = z.infer<typeof calDavEventsRequestSchema>;

export function parseCalDavEventsRequestBody(body: unknown): CalDavEventsRequest | null {
  const parsed = calDavEventsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return null;
  }
  const normalized = normalizeDeveloperCalDavCredentials({
    appPassword: parsed.data.appPassword,
    caldavUrl: parsed.data.caldavUrl,
    email: parsed.data.email,
  });
  if (!normalized) {
    return null;
  }
  return {
    ...parsed.data,
    appPassword: normalized.appPassword,
    caldavUrl: normalized.caldavUrl,
    email: normalized.email,
  };
}
