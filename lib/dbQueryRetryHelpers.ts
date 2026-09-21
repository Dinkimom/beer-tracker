export async function retryPreparedStatementQuery<T>(
  execute: () => Promise<T>,
  fallback: () => Promise<T>,
  maxRetries: number
): Promise<T> {
  for (let attempt = 1; attempt < maxRetries; attempt += 1) {
    const result = await tryExecutePreparedStatement(execute);
    if (result.ok) {
      return result.value;
    }
    if (!result.missingPreparedStatement) {
      throw result.error;
    }
  }
  return attemptPreparedStatementQuery(execute, fallback);
}

async function tryExecutePreparedStatement<T>(
  execute: () => Promise<T>
): Promise<
  { error: unknown; missingPreparedStatement: false; ok: false } | { error: unknown; missingPreparedStatement: true; ok: false } | { ok: true; value: T }
> {
  try {
    return { ok: true, value: await execute() };
  } catch (error) {
    return {
      ok: false,
      missingPreparedStatement: isPreparedStatementMissingError(error),
      error,
    };
  }
}

function isPreparedStatementMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('prepared statement') && message.includes('does not exist');
}

async function attemptPreparedStatementQuery<T>(
  execute: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await execute();
  } catch (error) {
    if (!isPreparedStatementMissingError(error)) {
      throw error;
    }
    return fallback();
  }
}
