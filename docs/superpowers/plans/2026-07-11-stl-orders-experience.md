# STL Orders Experience & Personalized Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver differentiated post-purchase experience for STL-only, physical product, and hybrid orders — with auto-emails, status automation, and personalized notifications.

**Architecture:**
- Conditional rendering in checkout success page based on order type detection
- Webhook improvements to fire correct emails and create type-aware notifications
- DownloadButton integration with order status updates
- Email template enhancements for richer product context
- Admin order status change endpoint with customer email notifications

**Tech Stack:** Next.js, React, Supabase, Resend (emails), TypeScript

## Global Constraints

- Maintain existing color palette (pink/orange gradient, status colors)
- Keep font stack (sans-serif, monospace for codes)
- Mobile-first responsive design (max-width 480px for emails)
- All files checked into git with clear commit messages
- No database migrations required (use existing fields)
- Reutilize existing email functions in `lib/email.ts`

---

## File Structure Overview

```
app/(shop)/checkout/success/page.tsx          [MODIFY] — conditional cards by order type
app/api/webhooks/mercadopago/route.ts         [MODIFY] — improve notifications + trigger emails
app/(shop)/account/orders/[id]/DownloadButton.tsx [MODIFY] — status automation on download
app/api/admin/orders/route.ts                 [MODIFY/CREATE] — add PATCH handler for status changes
emails/pedido-confirmado.tsx                  [MODIFY] — enrich with items, timeline, details
lib/email.ts                                  [MODIFY] — add admin notification on status change (optional)
```

---

## Task 1: Detect Order Type Helper Function

**Files:**
- Create: `lib/order-helpers.ts`

**Interfaces:**
- Consumes: Order type from database (items with product.type)
- Produces: `isDigitalOnly(items): boolean`, `hasDigitalItems(items): boolean`, `hasPhysicalItems(items): boolean`

- [ ] **Step 1: Create helper file with type detection functions**

```typescript
// lib/order-helpers.ts

export interface OrderItemWithProduct {
  product?: { type?: string | null } | null;
  [key: string]: unknown;
}

export function isDigitalOnly(items: OrderItemWithProduct[]): boolean {
  return items.length > 0 && items.every((item) => item.product?.type === 'digital');
}

export function hasDigitalItems(items: OrderItemWithProduct[]): boolean {
  return items.some((item) => item.product?.type === 'digital');
}

export function hasPhysicalItems(items: OrderItemWithProduct[]): boolean {
  return items.some((item) => item.product?.type !== 'digital');
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/order-helpers.ts
git commit -m "feat: add order type detection helpers"
```

---

## Task 2: Update CheckoutSuccessPage with Conditional Cards

**Files:**
- Modify: `app/(shop)/checkout/success/page.tsx`

**Interfaces:**
- Consumes: `order_id` from searchParams; Order data with items and product.type
- Produces: 3 conditional card layouts (STL-only, physical, hybrid)

- [ ] **Step 1: Add server-side order fetching**

In the component, before the return statement, add:

```typescript
import { getSupabaseAdmin } from '@/lib/supabase';
import { isDigitalOnly, hasDigitalItems, hasPhysicalItems } from '@/lib/order-helpers';

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === 'string' ? params.session_id : null;
  const orderId = typeof params.order_id === 'string' ? params.order_id : null;
  const isPending = params.pending === '1';

  // NEW: Fetch order to detect type
  let orderType: 'digital' | 'physical' | 'hybrid' = 'physical';
  if (orderId) {
    const admin = getSupabaseAdmin();
    const { data: order } = await admin
      .from('orders')
      .select('*, items:order_items(*, product:products(type))')
      .eq('id', orderId)
      .single();

    if (order?.items) {
      const items = order.items as OrderItemWithProduct[];
      if (isDigitalOnly(items)) {
        orderType = 'digital';
      } else if (hasDigitalItems(items) && hasPhysicalItems(items)) {
        orderType = 'hybrid';
      } else {
        orderType = 'physical';
      }
    }
  }

  // Rest of component...
```

- [ ] **Step 2: Replace static h1 title with conditional text**

Replace line 34-41 in current file:

```typescript
const titlesByType = {
  digital: 'Seu arquivo está pronto!',
  physical: 'Pedido confirmado!',
  hybrid: 'Arquivo pronto + Pedido em produção!',
};

const descriptionByType = {
  digital: 'Acesse sua conta para fazer download do seu arquivo STL.',
  physical: 'Já estamos preparando sua peça com muito carinho.',
  hybrid: 'Seu arquivo STL está disponível. A peça será impressa em até 3 dias úteis.',
};

<h1 className="mt-8 text-3xl font-bold text-gray-900 dark:text-white animate-fade-in-up">
  {titlesByType[orderType]}
</h1>
<p className="mt-3 text-gray-600 dark:text-gray-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
  {descriptionByType[orderType]}
</p>
```

- [ ] **Step 3: Replace static progress cards with conditional rendering**

Replace the static 3-card array (lines 50-67):

```typescript
const cardsByType = {
  digital: [
    { step: '✓', title: 'Pagamento recebido', desc: 'Seu pagamento foi processado com sucesso.', done: true },
    { step: '📥', title: 'Arquivo disponível', desc: 'Faça o download quantas vezes precisar.', done: true },
  ],
  physical: [
    { step: '✓', title: 'Pagamento recebido', desc: 'Seu pagamento foi processado com sucesso.', done: true },
    { step: '🖨️', title: 'Produção iniciada', desc: 'Sua peça será impressa em até 3 dias úteis.', done: false },
    { step: '📦', title: 'Envio', desc: 'Você receberá o código de rastreamento por email.', done: false },
  ],
  hybrid: [
    { step: '✓', title: 'Pagamento recebido', desc: 'Seu pagamento foi processado com sucesso.', done: true },
    { step: '🖨️', title: 'Produção iniciada', desc: 'Sua peça será impressa em até 3 dias úteis.', done: false },
    { step: '📦', title: 'Envio', desc: 'Você receberá o código de rastreamento por email.', done: false },
  ],
};

<div className={`mt-10 grid gap-4 ${orderType === 'digital' ? 'grid-cols-2 sm:grid-cols-2' : 'grid-cols-3 sm:grid-cols-3'} animate-fade-in-up`} style={{ animationDelay: '300ms' }}>
  {cardsByType[orderType].map(({ step, title, desc, done }) => (
    <div
      key={title}
      className={`rounded-2xl border p-5 shadow-sm transition ${done ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'}`}
    >
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-green-100 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
        {step}
      </span>
      <p className={`mt-3 text-sm font-semibold ${done ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>{title}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Add imports at top of file**

```typescript
import { OrderItemWithProduct, isDigitalOnly, hasDigitalItems, hasPhysicalItems } from '@/lib/order-helpers';
```

- [ ] **Step 5: Test in browser**

```bash
npm run dev
# Navigate to /checkout/success?order_id=<some_order_id>
# Verify cards match order type (2 cards for digital, 3 for physical/hybrid)
```

- [ ] **Step 6: Commit**

```bash
git add app/\(shop\)/checkout/success/page.tsx lib/order-helpers.ts
git commit -m "feat: add conditional checkout success cards by order type"
```

---

## Task 3: Improve Mercado Pago Webhook Notifications

**Files:**
- Modify: `app/api/webhooks/mercadopago/route.ts`

**Interfaces:**
- Consumes: `createNotification`, `hasDigitalItems`, `hasPhysicalItems` from helpers
- Produces: Differentiated notification titles/bodies based on order type

- [ ] **Step 1: Add imports**

At the top of file, add:

```typescript
import { hasDigitalItems, hasPhysicalItems, type OrderItemWithProduct } from '@/lib/order-helpers';
```

- [ ] **Step 2: Find notification creation block (around line 145)**

Locate this block:
```typescript
try {
  await createNotification(
    order.user_id,
    'order_status',
    'PIX confirmado!',
    `O pagamento do pedido #${order.id.slice(0, 8).toUpperCase()} foi aprovado. Já estamos preparando!`,
    { order_id: order.id, event: 'pix_approved' },
  );
} catch (e) {
  console.error('[mp-webhook] notification error:', e);
}
```

- [ ] **Step 3: Replace with type-aware notification**

```typescript
try {
  const items = (await admin
    .from('order_items')
    .select('*, product:products(type)')
    .eq('order_id', order.id)) as { data: OrderItemWithProduct[] | null };

  const itemsData = items.data ?? [];
  const hasDigital = hasDigitalItems(itemsData);
  const hasPhysical = hasPhysicalItems(itemsData);

  let notifTitle = '';
  let notifBody = '';

  if (hasDigital && !hasPhysical) {
    notifTitle = '✨ Seu arquivo STL está pronto!';
    notifBody = 'Acesse sua conta para fazer download do arquivo';
  } else if (!hasDigital && hasPhysical) {
    notifTitle = '🎉 Pedido aprovado!';
    notifBody = 'Sua peça será impressa em até 3 dias úteis';
  } else {
    notifTitle = '📦 Arquivo pronto + Pedido em produção!';
    notifBody = 'Seu arquivo está disponível. A peça será impressa em até 3 dias úteis.';
  }

  await createNotification(
    order.user_id,
    'order_status',
    notifTitle,
    notifBody,
    { order_id: order.id, event: 'order_approved' },
  );
} catch (e) {
  console.error('[mp-webhook] notification error:', e);
}
```

- [ ] **Step 4: Test webhook locally**

Use postman or test file to send sample payload:
```bash
# Verify notification is created with correct title based on order type
# Check database: select * from notifications where user_id = '<test_user>'
```

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/mercadopago/route.ts
git commit -m "feat: add type-aware notifications for orders"
```

---

## Task 4: Enhance Email Templates for Products

**Files:**
- Modify: `emails/pedido-confirmado.tsx`

**Interfaces:**
- Consumes: Order data (items with product info, prices, quantities)
- Produces: Rich HTML email with item details, timeline, shipping info

- [ ] **Step 1: Rewrite template with richer structure**

Replace entire content of `emails/pedido-confirmado.tsx`:

```typescript
export const PedidoConfirmadoEmail = ({
  nome,
  pedidoId,
  total,
  itens,
  baseUrl,
}: {
  nome: string | null;
  pedidoId: string;
  total: number;
  itens: Array<{ nome: string; quantidade: number; precoUnitario: number }>;
  baseUrl: string;
}) => {
  const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
  const formattedDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto', padding: '32px 24px', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ color: '#111', margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>
          Pedido Confirmado! 🎉
        </h1>
        <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>
          Pedido #{pedidoId.slice(0, 8).toUpperCase()} • {formattedDate}
        </p>
      </div>

      {/* Personal greeting */}
      <p style={{ color: '#555', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        Olá{nome ? `, ${nome}` : ''}! Seu pedido foi confirmado e está sendo preparado com muito carinho. ✨
      </p>

      {/* Items */}
      <div style={{ margin: '24px 0', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Itens do pedido
        </p>
        {itens.map((item, idx) => (
          <div key={idx} style={{ marginBottom: idx < itens.length - 1 ? '16px' : '0', paddingBottom: idx < itens.length - 1 ? '16px' : '0', borderBottom: idx < itens.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <p style={{ color: '#1f2937', fontWeight: '600', margin: '0', flex: '1' }}>{item.nome}</p>
              <p style={{ color: '#1f2937', fontWeight: '600', margin: '0 0 0 12px', whiteSpace: 'nowrap' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario * item.quantidade)}
              </p>
            </div>
            <p style={{ color: '#888', margin: '0', fontSize: '13px' }}>
              Quantidade: {item.quantidade} × {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario)}
            </p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{ margin: '24px 0', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
        <p style={{ margin: '0', fontSize: '12px', color: '#666', marginBottom: '8px' }}>TOTAL DO PEDIDO</p>
        <p style={{ margin: '0', fontSize: '20px', fontWeight: '700', color: '#15803d' }}>
          {formattedTotal}
        </p>
      </div>

      {/* Timeline */}
      <div style={{ margin: '24px 0' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Próximas etapas
        </p>
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          {[
            { icon: '✓', title: 'Pagamento confirmado', desc: 'Seu pagamento foi processado com sucesso.' },
            { icon: '🖨️', title: 'Produção', desc: 'Sua peça será impressa em até 3 dias úteis.' },
            { icon: '📦', title: 'Envio', desc: 'Você receberá o código de rastreamento por email.' },
            { icon: '✅', title: 'Entrega', desc: 'Sua peça chegará com segurança.' },
          ].map((step, idx) => (
            <div key={idx} style={{ marginBottom: idx < 3 ? '24px' : '0', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-32px', top: '0px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: idx === 0 ? '#15803d' : '#e5e7eb', color: idx === 0 ? '#fff' : '#666', fontWeight: '600', fontSize: '12px' }}>
                {step.icon}
              </div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{step.title}</p>
              <p style={{ margin: '0', fontSize: '13px', color: '#888' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <a
        href={`${baseUrl}/account/orders/${pedidoId}`}
        style={{
          display: 'inline-block',
          margin: '32px 0 24px 0',
          padding: '12px 24px',
          background: 'linear-gradient(to right, #ec4899, #f97316)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
        }}
      >
        Acompanhe seu pedido
      </a>

      {/* Support links */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
        <p style={{ margin: '0 0 12px 0', color: '#555', fontSize: '13px' }}>
          Dúvidas? Acesse sua conta em <a href={`${baseUrl}/account/orders`} style={{ color: '#ec4899', textDecoration: 'none' }}>helloustudio</a> para mais detalhes.
        </p>
        <p style={{ margin: '0', color: '#999', fontSize: '12px' }}>
          © helloustudio • Feito com ❤️ em 3D
        </p>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Test email rendering**

In the email preview (if available) or by sending to yourself:
```bash
# Ensure items are displayed correctly
# Check timeline rendering
# Verify mobile layout (narrow viewport)
```

- [ ] **Step 3: Commit**

```bash
git add emails/pedido-confirmado.tsx
git commit -m "feat: enhance product order confirmation email with timeline and details"
```

---

## Task 5: Create Download Button Status Update Integration

**Files:**
- Modify: `app/(shop)/account/orders/[id]/DownloadButton.tsx`

**Interfaces:**
- Consumes: `order.id`, `order.status`, `isDigitalOnly` boolean
- Produces: PATCH request to `/api/orders/{id}` with new status 'delivered'

- [ ] **Step 1: Check current DownloadButton structure**

Read the file to understand current implementation. If it exists and has onClick handler, we'll extend it.

- [ ] **Step 2: Add status update logic**

Modify the onClick handler to:

```typescript
'use client';

import { useState } from 'react';
import type { Order } from '@/types/database';

interface DownloadButtonProps {
  order: Order;
  isDigitalOnly: boolean;
}

export default function DownloadButton({ order, isDigitalOnly }: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // If digital-only and in 'approved' status, update to 'delivered'
      if (isDigitalOnly && order.status === 'approved') {
        const response = await fetch(`/api/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'delivered' }),
        });

        if (!response.ok) {
          throw new Error('Falha ao atualizar pedido');
        }

        const result = await response.json();
        console.log('[DownloadButton] Status updated:', result);
      }

      // Proceed with download
      const downloadUrl = `/api/orders/${order.id}/download`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.click();
    } catch (err) {
      console.error('[DownloadButton] error:', err);
      setError('Erro ao fazer download. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className="inline-flex items-center rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200/30 transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-50"
    >
      {isLoading ? 'Processando...' : '📥 Baixar arquivo'}
    </button>
  );
}
```

- [ ] **Step 3: Update parent component to pass props**

In `app/(shop)/account/orders/[id]/page.tsx`, find where `DownloadButton` is rendered and ensure it receives:
```typescript
<DownloadButton order={order} isDigitalOnly={isDigitalOnly} />
```

- [ ] **Step 4: Test in browser**

```bash
npm run dev
# Navigate to a digital-only order with status='approved'
# Click download button
# Verify PATCH request is sent
# Check network tab for success response
```

- [ ] **Step 5: Commit**

```bash
git add app/\(shop\)/account/orders/\[id\]/DownloadButton.tsx
git commit -m "feat: update order status to delivered on STL download"
```

---

## Task 6: Create PATCH Endpoint for Order Status Updates (with Email)

**Files:**
- Modify or Create: `app/api/orders/[id]/route.ts`

**Interfaces:**
- Consumes: `order_id` (URL param), `status` (body), user context
- Produces: 200 JSON response { success, status, message }

- [ ] **Step 1: Check if PATCH handler exists**

Open `app/api/orders/[id]/route.ts` and check for PATCH export. If it doesn't exist, we'll add it.

- [ ] **Step 2: Add PATCH handler for status updates**

If file exists, add this handler. If not, create with both GET and PATCH:

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, serverError } from '@/lib/api';
import { sendSTLDeliveryEmail } from '@/lib/email';

// Existing GET handler...

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Fetch order to verify ownership and current state
  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('id, user_id, status, items:order_items(*, product:products(type))')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Check if this is a digital-only order already delivered
  const items = order.items as Array<{ product?: { type?: string } }>;
  const isDigitalOnly = items?.length > 0 && items.every((i) => i.product?.type === 'digital');
  if (isDigitalOnly && order.status === 'delivered') {
    return NextResponse.json({ received: true, status: order.status });
  }

  // Update status
  const { error: updateError } = await admin
    .from('orders')
    .update({ status })
    .eq('id', id);

  if (updateError) {
    return serverError('Erro ao atualizar pedido');
  }

  // Send email to customer if status changed
  try {
    const { data: userData } = await admin
      .from('users')
      .select('email, name')
      .eq('id', order.user_id)
      .single();

    if (userData?.email && status === 'delivered' && isDigitalOnly) {
      // Get file name for email
      const fileName = (order.items?.[0] as any)?.product_snapshot?.name || 'Arquivo STL';
      await sendSTLDeliveryEmail({
        email: userData.email,
        nome: userData.name || null,
        orderId: id,
        fileName,
      });
    }
  } catch (err) {
    console.error('[order-patch] email error:', err);
    // Don't fail the request if email fails
  }

  return NextResponse.json({ success: true, status, message: 'Status atualizado' });
}
```

- [ ] **Step 3: Add import for STL email function**

At top of file:
```typescript
import { sendSTLDeliveryEmail } from '@/lib/email';
```

- [ ] **Step 4: Test endpoint**

```bash
# Using curl or Postman:
curl -X PATCH http://localhost:3000/api/orders/{order_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "delivered"}'

# Expected response:
# { "success": true, "status": "delivered", "message": "Status atualizado" }
```

- [ ] **Step 5: Commit**

```bash
git add app/api/orders/\[id\]/route.ts
git commit -m "feat: add PATCH endpoint for order status updates with email"
```

---

## Task 7: Create Admin Status Change Endpoint

**Files:**
- Modify or Create: `app/api/admin/orders/route.ts`

**Interfaces:**
- Consumes: Admin user context, `order_id` (query), `status` (body), optional `trackingCode`
- Produces: 200 JSON response { success, status, message }

- [ ] **Step 1: Check current admin orders endpoint**

Open file and see what's there. We'll add or update a PATCH handler.

- [ ] **Step 2: Add PATCH handler for admin status changes**

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser, serverError } from '@/lib/api';
import { sendOrderStatusEmail } from '@/lib/email';

// ... existing code ...

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  // Check if user is admin
  const admin = getSupabaseAdmin();
  const { data: user } = await admin
    .from('users')
    .select('is_admin')
    .eq('id', auth.user.id)
    .single();

  if (!user?.is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { orderId, status, trackingCode } = body;

  if (!orderId || !status) {
    return NextResponse.json({ error: 'orderId and status are required' }, { status: 400 });
  }

  // Fetch order
  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('id, user_id, status')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === status) {
    return NextResponse.json({ received: true, status });
  }

  // Update status
  const updatePayload: Record<string, unknown> = { status };
  if (status === 'shipped' && trackingCode) {
    updatePayload.tracking_code = trackingCode;
  }

  const { error: updateError } = await admin
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId);

  if (updateError) {
    return serverError('Erro ao atualizar pedido');
  }

  // Send email to customer
  try {
    const { data: userData } = await admin
      .from('users')
      .select('email, name')
      .eq('id', order.user_id)
      .single();

    if (userData?.email) {
      await sendOrderStatusEmail({
        email: userData.email,
        nome: userData.name || null,
        orderId,
        newStatus: status,
        trackingCode: trackingCode || null,
      });
    }
  } catch (err) {
    console.error('[admin-orders-patch] email error:', err);
    // Don't fail the request if email fails
  }

  return NextResponse.json({ success: true, status, message: `Pedido atualizado para ${status}` });
}
```

- [ ] **Step 3: Add import**

```typescript
import { sendOrderStatusEmail } from '@/lib/email';
```

- [ ] **Step 4: Test endpoint from admin dashboard**

```bash
curl -X PATCH http://localhost:3000/api/admin/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"orderId": "order_id", "status": "shipped", "trackingCode": "AA123456789BR"}'
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/orders/route.ts
git commit -m "feat: add admin endpoint to change order status with customer email"
```

---

## Task 8: Verify All Integrations and Test Flows

**Files:**
- Test files (no new files, verify existing flows)

**Interfaces:**
- Consumes: All previous changes
- Produces: Confidence that flows work end-to-end

- [ ] **Step 1: Test Digital-Only Order Flow**

```bash
# 1. Create test order with only digital items
# 2. Simulate webhook with approved payment
# → Verify: email sent, notification created, status = 'approved'
# 3. Navigate to order page
# 4. Click download button
# → Verify: PATCH sent, status = 'delivered', email sent
# 5. Check notifications in bell icon
# → Verify: "✨ Seu arquivo STL está pronto!"
```

- [ ] **Step 2: Test Physical Product Order Flow**

```bash
# 1. Create test order with only physical items
# 2. Simulate webhook with approved payment
# → Verify: email sent, notification created, status = 'processing'
# 3. Checkout success page shows 3 cards
# 4. Admin changes status to 'shipped' with tracking
# → Verify: email sent to customer with tracking link
# 5. Admin changes status to 'delivered'
# → Verify: email sent to customer
```

- [ ] **Step 3: Test Hybrid Order Flow**

```bash
# 1. Create test order with both digital and physical items
# 2. Simulate webhook with approved payment
# → Verify: email sent, notification created, status = 'processing'
# 3. Checkout success page shows 3 cards
# 4. Customer downloads file
# → Verify: status remains 'processing' (physical items are priority)
```

- [ ] **Step 4: Verify Responsive Design**

```bash
# Open each page on mobile (iPhone 12 Pro: 390px width)
# Verify no horizontal scroll
# Verify buttons have 44px+ tap area
# Verify emails render properly in mobile email clients
```

- [ ] **Step 5: Check Console Logs**

```bash
# Run dev server: npm run dev
# Trigger each flow and check browser console
# Verify no errors or warnings
```

- [ ] **Step 6: Commit final verification**

```bash
git log --oneline -10
# Should see ~7 commits from Tasks 1-7
```

---

## Summary of Changes

| Task | File | Change | Impact |
|------|------|--------|--------|
| 1 | `lib/order-helpers.ts` | NEW | Type detection helpers |
| 2 | `app/(shop)/checkout/success/page.tsx` | MODIFY | Conditional cards |
| 3 | `app/api/webhooks/mercadopago/route.ts` | MODIFY | Type-aware notifications |
| 4 | `emails/pedido-confirmado.tsx` | MODIFY | Rich email template |
| 5 | `app/(shop)/account/orders/[id]/DownloadButton.tsx` | MODIFY | Status automation |
| 6 | `app/api/orders/[id]/route.ts` | MODIFY | PATCH handler |
| 7 | `app/api/admin/orders/route.ts` | MODIFY | Admin status changes |
| 8 | (All) | TEST | Verify all flows |

**Total new lines:** ~300  
**Total modified lines:** ~150  
**Estimated commits:** 8

---

## Rollback Plan

If issues arise:
1. All changes are git commits — `git revert <commit_hash>`
2. Database has no schema changes — no migrations to roll back
3. Email functions are additive — reverting just stops new emails
4. Status changes are backward compatible

---

Plan saved to `docs/superpowers/plans/2026-07-11-stl-orders-experience.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you like?