export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { runDbMigrationsOnStartup } = await import('@/lib/dbMigrations/runDbMigrations');
  await runDbMigrationsOnStartup();

  try {
    const { runDbContractPreflightOnStartup } = await import('@/lib/dbContractPreflight');
    await runDbContractPreflightOnStartup();
  } catch (error) {
    const { isDbContractPreflightStrict } = await import('@/lib/env');
    if (isDbContractPreflightStrict()) {
      throw error;
    }
    console.warn('[db-contract] preflight skipped or failed:', error);
  }
}
