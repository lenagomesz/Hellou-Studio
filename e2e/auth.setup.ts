import { mkdir } from 'node:fs/promises';
import { test as setup, expect } from '@playwright/test';
import { e2eValue, requireE2EEnvironment } from './support/env';
import { updateRuntime } from './support/runtime';

setup.beforeAll(() => requireE2EEnvironment());

setup('cadastro e login de um usuário real', async ({ page }) => {
  const password = 'E2e!Hellou2026';
  const email = `e2e+${Date.now()}@${e2eValue('E2E_EMAIL_DOMAIN')}`;

  await page.goto('/register');
  await page.getByLabel(/Nome completo/i).fill('Cliente E2E');
  await page.getByLabel(/Telefone/i).fill('(47) 99999-9999');
  await page.getByLabel(/^CPF/).fill(e2eValue('E2E_CPF'));
  await page.getByLabel(/^E-?mail|^Email/i).fill(email);
  await page.getByLabel(/^Senha$/i).fill(password);
  await page.getByLabel(/Confirmar senha/i).fill(password);
  await page.locator('#terms').check();
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page).not.toHaveURL(/\/register/);

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel(/^E-?mail|^Email/i).fill(email);
  await page.getByLabel(/^Senha$/i).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  await mkdir('test-results/.auth', { recursive: true });
  await page.context().storageState({ path: 'test-results/.auth/user.json' });
  await updateRuntime({ userEmail: email, userPassword: password });
});

setup('login administrativo para conferir o pedido', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/^E-?mail|^Email/i).fill(e2eValue('E2E_ADMIN_EMAIL'));
  await page.getByLabel(/^Senha$/i).fill(e2eValue('E2E_ADMIN_PASSWORD'));
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await mkdir('test-results/.auth', { recursive: true });
  await page.context().storageState({ path: 'test-results/.auth/admin.json' });
});
