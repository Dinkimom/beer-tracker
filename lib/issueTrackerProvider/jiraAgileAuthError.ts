export function axiosErrorStatusAndDetails(error: unknown): {
  details: unknown;
  status: number | undefined;
} {
  if (!error || typeof error !== 'object') {
    return { details: undefined, status: undefined };
  }
  const response = (error as { response?: { data?: unknown; status?: number } }).response;
  return {
    details: response?.data,
    status: typeof response?.status === 'number' ? response.status : undefined,
  };
}

export function throwIfJiraAgileAuthError(input: {
  boardId: number;
  details: unknown;
  status: number | undefined;
  url: string;
}): void {
  const { boardId, details, status, url } = input;
  console.error('[jira] board sprints fetch failed', { boardId, details, status, url });
  if (status !== 401 && status !== 403) {
    return;
  }
  const detailMessage =
    details &&
    typeof details === 'object' &&
    typeof (details as { message?: unknown }).message === 'string'
      ? (details as { message: string }).message
      : '';
  const scopeHint = detailMessage.toLowerCase().includes('scope')
    ? ' Добавьте Jira Software scopes в Atlassian Developer Console и выполните Connect with Atlassian снова.'
    : '';
  throw new Error(
    `Jira Agile: нет доступа к спринтам доски ${boardId} (${status}${
      detailMessage ? `: ${detailMessage}` : ''
    }).${scopeHint}`
  );
}
