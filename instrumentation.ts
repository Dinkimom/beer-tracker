export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

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

  try {
    const { removeDemoSystemOrganizationForOnPrem } = await import(
      '@/lib/onPrem/removeDemoSystemOrganization'
    );
    await removeDemoSystemOrganizationForOnPrem();
  } catch (error) {
    console.warn('[onprem] Удаление демо-организации пропущено:', error);
  }

  // Keep instrumentation independent from demo files in community export.
  if (!process.env.DEMO_MODE_ENABLED) {
    return;
  }

  try {
    const dynamicImport = new Function('modulePath', 'return import(modulePath)') as (
      modulePath: string
    ) => Promise<{ registerDemoTenantBootstrapOnServerStart: () => Promise<void> }>;
    const { registerDemoTenantBootstrapOnServerStart } = await dynamicImport(
      '@/lib/demo/demoTenantBootstrap'
    );
    await registerDemoTenantBootstrapOnServerStart();
  } catch (error) {
    console.warn('[demo] Optional tenant bootstrap skipped:', error);
  }
}
