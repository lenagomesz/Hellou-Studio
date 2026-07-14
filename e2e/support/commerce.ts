import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { e2eValue } from './env';

export async function clearCart(request: APIRequestContext) {
  const response = await request.get('/api/cart');
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as { items?: Array<{ id: string }> };
  for (const item of payload.items ?? []) {
    const removed = await request.delete(`/api/cart/${item.id}`);
    expect(removed.ok()).toBeTruthy();
  }
}

export async function addProduct(page: Page, path: string, customization?: string) {
  await page.goto(path);
  if (customization) await page.getByLabel(/Como você quer personalizar/i).fill(customization);
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await expect(page.getByText('Item adicionado ao carrinho')).toBeVisible();
}

export async function fillShipping(page: Page) {
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.getByLabel(/^CEP/).fill(e2eValue('E2E_CEP'));
  await page.getByRole('button', { name: /Calcular|Buscar/ }).click();
  await expect(page.getByLabel(/Número/)).toBeVisible();
  if (!await page.getByLabel(/Rua \/ Avenida/).inputValue()) await page.getByLabel(/Rua \/ Avenida/).fill('Rua E2E');
  if (!await page.getByLabel(/Bairro/).inputValue()) await page.getByLabel(/Bairro/).fill('Centro');
  await page.getByLabel(/Número/).fill('100');
  await expect(page.getByRole('button', { name: /Revisar pedido/ })).toBeEnabled();
  await page.getByRole('button', { name: /Revisar pedido/ }).click();
}

export async function fillApprovedCard(page: Page) {
  await page.getByRole('button', { name: /Crédito/ }).click();
  await page.getByPlaceholder('0000 0000 0000 0000').first().fill(e2eValue('E2E_CARD_NUMBER'));
  await page.getByPlaceholder('Como aparece no cartão').first().fill(e2eValue('E2E_CARD_NAME'));
  await page.getByPlaceholder('MM/AA').first().fill(e2eValue('E2E_CARD_EXPIRY'));
  await page.getByPlaceholder('000').first().fill(e2eValue('E2E_CARD_CVV'));
}
