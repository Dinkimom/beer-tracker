import fs from 'node:fs';

import { expect, test } from '@playwright/test';

import { buildDemoDevelopers } from '@/lib/demo/demoFixtureSeedTasks';

import { seedStandOtorva } from './seedOtorva';
import { STAND_ADMIN, STAND_ADMIN_STATE, STAND_SEED_FILE, STAND_TEAM, ui } from './stand';

test.describe.configure({ mode: 'serial' });

test('TC-134: онбординг на встроенном трекере и вход по email и паролю', async ({ browser, page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: ui.productAuth.register.onboardingTitle })).toBeVisible();

  await page.getByLabel(ui.productAuth.register.orgName).fill(STAND_ADMIN.organization);
  await page.getByRole('button', { name: ui.common.issueTracker.providerOption.tracker }).click();
  await page.getByRole('button', { name: ui.common.issueTracker.providerOption.otorva }).click();
  // Адреса API и токена нет: трекер — сервис этого сервера, вход — email и пароль.
  await expect(page.getByLabel(ui.common.issueTracker.apiUrlLabel)).toHaveCount(0);
  await page.getByLabel(ui.auth.otorva.firstNameLabel).fill(STAND_ADMIN.firstName);
  await page.getByLabel(ui.auth.otorva.lastNameLabel).fill(STAND_ADMIN.lastName);
  await page.getByLabel(ui.auth.otorva.emailLabel).fill(STAND_ADMIN.email);
  await page.getByLabel(ui.auth.otorva.passwordLabel, { exact: true }).fill(STAND_ADMIN.secret);
  await page.getByRole('button', { name: ui.productAuth.register.onboardingSubmit }).click();
  await page.waitForURL(/\/admin/);
  await expect(page.getByText(STAND_ADMIN.organization).first()).toBeVisible();

  // Новый браузер без сессии: вход по тем же email и паролю, сначала с неверным паролем.
  const context = await browser.newContext();
  const signIn = await context.newPage();
  await signIn.goto('/auth-setup');
  await signIn.getByLabel(ui.auth.otorva.emailLabel).fill(STAND_ADMIN.email);
  await signIn.getByLabel(ui.auth.otorva.passwordLabel, { exact: true }).fill('wrong-password');
  await signIn.keyboard.press('Enter');
  // Текст ошибки — на языке интерфейса (из словаря по коду ответа), не русский текст сервера.
  await expect(signIn.getByRole('alert').filter({ hasText: ui.auth.otorva.errors.invalid_credentials })).toBeVisible();
  await expect(signIn).toHaveURL(/\/auth-setup/);

  await signIn.getByLabel(ui.auth.otorva.passwordLabel, { exact: true }).fill(STAND_ADMIN.secret);
  await signIn.keyboard.press('Enter');
  await signIn.waitForURL(/\/select-board/);
  // Сессия этого входа (cookie + токен в localStorage) — для сценариев после онбординга.
  await context.storageState({ path: STAND_ADMIN_STATE });
  await context.close();
});

test('сид встроенного трекера из фикстур демо', async () => {
  const seed = await seedStandOtorva();
  fs.writeFileSync(STAND_SEED_FILE, JSON.stringify(seed, null, 2));
  expect(Object.keys(seed.keys).length).toBeGreaterThan(10);
});

/** Роль планера для человека фикстуры (`roleTitle`) — системные роли из базовой миграции. */
const ROLE_BY_TITLE: Record<string, string> = { Backend: 'Бэкенд', Frontend: 'Фронтенд', Mobile: 'Фронтенд', QA: 'QA' };

test('TC-135: команда на доске встроенного трекера с составом из трекера', async ({ browser }) => {
  const context = await browser.newContext({ storageState: STAND_ADMIN_STATE });
  const page = await context.newPage();
  await page.goto('/admin/teams');
  await page.getByRole('button', { name: ui.admin.newTeamForm.openButton }).click();
  const create = page.getByRole('dialog');
  await create.getByLabel(ui.admin.newTeamForm.nameLabel).fill(STAND_TEAM);
  await create.getByRole('button', { name: ui.admin.teamsPage.selectQueue }).click();
  await page.getByRole('button', { name: /DEMO/ }).first().click();
  await create.getByRole('button', { name: ui.admin.teamsPage.selectBoard }).click();
  await page.getByRole('button', { name: /Демо/ }).last().click();
  await create.getByRole('button', { name: ui.admin.newTeamForm.submit }).click();
  await expect(page.getByText(ui.admin.teamsPage.createSuccess)).toBeVisible();

  await page.getByRole('link', { name: `Редактировать команду «${STAND_TEAM}»` }).click();
  for (const dev of buildDemoDevelopers()) {
    await page.getByRole('button', { name: ui.admin.teamMembers.addOpenButton }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: /Новый из/ }).click();
    await dialog.getByRole('button', { name: /^Сотрудник в/ }).click();
    await dialog.getByRole('textbox', { name: /^Сотрудник в/ }).fill(dev.name.split(' ')[0] ?? dev.name);
    await page.getByRole('button', { name: new RegExp(`${dev.name}$`) }).click();
    await dialog.getByRole('button', { name: ui.admin.teamDetail.noRole }).click();
    await page.getByRole('button', { name: ROLE_BY_TITLE[dev.roleTitle ?? ''] ?? 'Бэкенд', exact: true }).click();
    await dialog.getByRole('button', { name: ui.admin.teamMembers.addSubmit }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(dev.name).first()).toBeVisible();
  }

  // Команда видна при выборе доски и открывает планер текущего спринта.
  await page.goto('/select-board');
  await page.getByRole('button', { name: new RegExp(STAND_TEAM) }).first().click();
  await page.waitForURL(/\/planner\//);
  await context.close();
});
