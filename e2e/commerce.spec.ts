import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { addProduct, clearCart, fillApprovedCard, fillShipping } from './support/commerce';
import { e2eValue, requireE2EEnvironment } from './support/env';
import { readRuntime, updateRuntime } from './support/runtime';

test.describe.configure({ mode: 'serial' });
test.beforeAll(() => requireE2EEnvironment());

test('produto comum, personalizado, carrinho, cupom, frete e PIX', async ({ page, request }) => {
  await clearCart(request);
  await addProduct(page, `/products/${e2eValue('E2E_PHYSICAL_PRODUCT_ID')}`);

  await page.goto(`/products/${e2eValue('E2E_CUSTOM_PRODUCT_ID')}`);
  await expect(page.getByRole('button', { name: /Preencha a personalização/ })).toBeDisabled();
  await page.getByLabel(/Como você quer personalizar/i).fill('HELENA E2E');
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await expect(page.getByText('Item adicionado ao carrinho')).toBeVisible();

  await page.goto('/cart');
  await expect(page.getByText('Personalização:')).toBeVisible();
  await page.getByPlaceholder(/Código do cupom/i).first().fill(e2eValue('E2E_COUPON_CODE'));
  await page.getByRole('button', { name: 'Aplicar' }).first().click();
  await expect(page.getByText(e2eValue('E2E_COUPON_CODE'), { exact: false })).toBeVisible();
  await fillShipping(page);

  const paymentResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/payments/mercadopago/create') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Gerar código PIX/ }).click();
  const paymentResponse = await paymentResponsePromise;
  expect(paymentResponse.ok()).toBeTruthy();
  const payment = await paymentResponse.json() as { order_id: string; status: string; pix_qr_code?: string };
  expect(payment.status).toBe('pending');
  expect(payment.pix_qr_code).toBeTruthy();
  await expect(page.getByText('PIX gerado')).toBeVisible();
  await updateRuntime({ pixOrderId: payment.order_id });
});

test('cartão aprovado cria pedido e valida assinaturas do webhook', async ({ page, request }) => {
  await clearCart(request);
  await addProduct(page, `/products/${e2eValue('E2E_PHYSICAL_PRODUCT_ID')}`);
  await page.goto('/cart');
  await fillShipping(page);
  await fillApprovedCard(page);

  const paymentResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/payments/mercadopago/create') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Pagar com Crédito/ }).click();
  const paymentResponse = await paymentResponsePromise;
  expect(paymentResponse.ok()).toBeTruthy();
  const payment = await paymentResponse.json() as { order_id: string; payment_id: string; status: string };
  expect(payment.status).toBe('approved');
  await expect(page).toHaveURL(/\/checkout\/success/);
  await updateRuntime({ cardOrderId: payment.order_id });

  const requestId = `e2e-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const manifest = `id:${payment.payment_id};request-id:${requestId};ts:${timestamp};`;
  const signature = createHmac('sha256', e2eValue('MERCADO_PAGO_WEBHOOK_SECRET'))
    .update(manifest)
    .digest('hex');
  const acceptedWebhook = await request.post('/api/webhooks/mercadopago', {
    headers: { 'x-signature': `ts=${timestamp},v1=${signature}`, 'x-request-id': requestId },
    data: { type: 'payment', action: 'payment.updated', data: { id: payment.payment_id } },
  });
  expect(acceptedWebhook.ok()).toBeTruthy();
  await expect(acceptedWebhook.json()).resolves.toMatchObject({ received: true });

  const rejectedWebhook = await request.post('/api/webhooks/mercadopago', {
    headers: { 'x-signature': 'ts=1,v1=invalid', 'x-request-id': 'e2e-invalid-signature' },
    data: { type: 'payment', action: 'payment.updated', data: { id: 'e2e-invalid' } },
  });
  expect(rejectedWebhook.status()).toBe(401);
});

test('pedido aparece no painel e pode ser entregue', async ({ browser }) => {
  const { cardOrderId } = await readRuntime();
  expect(cardOrderId).toBeTruthy();
  const context = await browser.newContext({ storageState: 'test-results/.auth/admin.json' });
  const page = await context.newPage();

  await page.goto(`/dashboard/orders/${cardOrderId}`);
  await expect(page.getByRole('heading', { name: /Pedido/ })).toBeVisible();
  await expect(page.getByText('E-mails do pedido')).toBeVisible();

  const delivered = await context.request.patch(`/api/orders/${cardOrderId}`, { data: { status: 'delivered' } });
  expect(delivered.ok()).toBeTruthy();
  await context.close();
});

test('cliente avalia o produto depois da entrega', async ({ page }) => {
  const { cardOrderId } = await readRuntime();
  await page.goto(`/account/orders/${cardOrderId}`);
  await page.getByRole('button', { name: 'Avaliar' }).first().click();
  await page.locator('button').filter({ hasText: '★' }).nth(4).click();
  await page.getByPlaceholder('Compartilhe seus pensamentos...').fill('Fluxo E2E concluído com sucesso.');
  await page.getByRole('button', { name: 'Enviar avaliação' }).click();
  await expect(page.getByText('Avaliação enviada')).toBeVisible();
});

test('compra e download de STL', async ({ page, request }) => {
  await clearCart(request);
  await addProduct(page, `/stl/${e2eValue('E2E_STL_PRODUCT_ID')}`);
  await page.goto('/cart');
  await page.getByRole('button', { name: /Continuar/ }).click();
  await fillApprovedCard(page);

  const paymentResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/payments/mercadopago/create') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Pagar com Crédito/ }).click();
  const paymentResponse = await paymentResponsePromise;
  expect(paymentResponse.ok()).toBeTruthy();
  const payment = await paymentResponse.json() as { order_id: string; status: string };
  expect(payment.status).toBe('approved');
  await updateRuntime({ stlOrderId: payment.order_id });

  await page.goto(`/account/orders/${payment.order_id}`);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Baixar arquivo/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.stl$/i);
});
