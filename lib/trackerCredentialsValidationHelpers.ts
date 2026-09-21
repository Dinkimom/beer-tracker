import type { AxiosError, AxiosInstance } from 'axios';

type ValidateTrackerCredentialsResult =
  { message: string; ok: false; status?: number } | { message?: string; ok: true };

function trackerValidationFailure(
  message: string,
  status: number
): ValidateTrackerCredentialsResult {
  return { message, ok: false, status };
}

function trackerValidationErrorFromAxios(
  error: unknown,
  rejectedMessage: string,
  genericMessage: string
): ValidateTrackerCredentialsResult {
  const ax = error as AxiosError;
  const status = ax.response?.status;
  if (status === 401 || status === 403) {
    return trackerValidationFailure(rejectedMessage, 400);
  }
  return trackerValidationFailure(
    status != null ? `${genericMessage} (${String(status)})` : genericMessage,
    502
  );
}

export async function validateTrackerMyselfEndpoint(
  api: AxiosInstance
): Promise<ValidateTrackerCredentialsResult> {
  try {
    await api.get('/myself');
    return { ok: true };
  } catch (error: unknown) {
    return trackerValidationErrorFromAxios(
      error,
      'Токен отклонён трекером',
      'Ошибка трекера'
    );
  }
}

export async function validateTrackerUsersAdminEndpoint(
  api: AxiosInstance
): Promise<ValidateTrackerCredentialsResult> {
  try {
    await api.get('/users', { params: { page: 1, perPage: 1 } });
    return {
      message: 'Токен валиден, права администратора в Яндекс Трекере подтверждены',
      ok: true,
    };
  } catch (error: unknown) {
    return trackerValidationErrorFromAxios(
      error,
      'Токен не имеет прав администратора',
      'Ошибка трекера при проверке прав'
    );
  }
}
