# STL Marketplace Feature Design

**Date:** 2026-07-04  
**Feature:** Sell digital STL files through existing product/order system  
**Scope:** Schema migration, admin upload UI, checkout integration, email notifications, unit tests

---

## Overview

Add the ability to sell downloadable STL (3D print files) alongside physical products. Customers purchase, pay via Mercado Pago/Stripe, receive email with download link, and access the file unlimited times from their order page.

---

## Data Model

### Products Table (Supabase)

Add two columns to `products`:

```sql
ALTER TABLE products ADD COLUMN type TEXT CHECK (type IN ('physical', 'digital')) DEFAULT 'physical';
ALTER TABLE products ADD COLUMN file_path TEXT;
CREATE INDEX idx_products_type ON products(type);
```

**Field semantics:**
- `type`: Enum. Controls which UI fields appear (colors/sizes for physical; ignored for digital)
- `file_path`: String. Supabase Storage path like `stl-files/product-id/filename.stl`. NULL for physical products

### Product Behavior by Type

| Field | Physical | Digital |
|-------|----------|---------|
| colors | ✅ Required | ❌ Hidden |
| sizes | ✅ Required | ❌ Hidden |
| file_path | ❌ Null | ✅ Required |
| Checkout | Cart + shipping | Cart, no shipping |
| Order status after payment | `processing` (manual fulfillment) | `completed` (auto-fulfill) |
| Email subject | Status updates | Download link in confirmation |

---

## Admin UI

### New Route: `/dashboard/products/stl`

Single-page upload form with:

1. **Educational banner**
   - "O que é arquivo STL?"
   - Brief explanation: "Arquivo 3D em formato aberto. Use em impressoras 3D ou programas de modelagem."
   - Link suggestion: "Veja exemplos em makerworld.com.br"

2. **Form fields**
   - Name (text, required)
   - Description (textarea, required)
   - Price in BRL (number, required, min 0.01)
   - Images (upload multiple, required, JPG/PNG only)
   - STL file (upload, required, `.stl` only, max 50MB)
   - Optional: short code/SKU for internal reference

3. **Validation**
   - File must be `.stl` (check MIME type + extension)
   - Images must be JPG/PNG
   - Price > 0
   - At least one image required

4. **Upload flow**
   - POST `/api/upload/stl` with FormData (rota administrativa atual)
   - Multipart upload to Supabase Storage under `stl-files/{productId}/{filename.stl}`
   - Save product with type='digital', file_path set
   - Redirect to `/dashboard/products` with success toast

### Update `/dashboard/products` page

Add filter/view toggle: "Show all" | "Physical only" | "Digital only"  
Indicate product type with badge in product list

---

## Checkout & Order Flow

### Cart Display

When customer adds digital product to cart:
- ✅ Show in cart item list (name, price, image)
- ❌ Hide color/size selectors
- ❌ Hide shipping selector (calculated as $0)

### Order Creation

After successful Mercado Pago/Stripe payment:

```typescript
// Pseudo-code
if (order.items.some(item => item.product.type === 'digital')) {
  // Digital order: auto-complete
  order.status = 'completed';
  order.shipped_at = NOW;
  // Physical items stay pending if mixed
} else if (order.items.every(item => item.product.type === 'physical')) {
  // All physical: normal flow
  order.status = 'processing';
}
```

**Mixed carts** (digital + physical in same order):
- ❌ Not supported initially (could be added later)
- During checkout: show warning if customer tries to mix
- Suggest: "Finalize your digital purchase first, then order physical items separately"

---

## Email Notifications

### For Customer (New Digital Order)

**Template:** `emails/stl-order-confirmation.tsx`

Subject: `Seu arquivo STL está pronto! #${orderIdShort}`

Body includes:
- Order ID / Date
- File name and price
- **CTA button:** "Baixar meu arquivo" → `${baseUrl}/account/orders/${orderId}?file=${fileId}`
- Text: "Acesse sua conta a qualquer momento para re-baixar o arquivo"

### For Admin (New Digital Order)

**Template:** Update existing `sendAdminNewOrderEmail()` to note if order contains digital products

Subject: `Novo pedido digital! #${orderIdShort} — ${price}`

Body includes:
- Customer name/email
- File name
- Indicate it's auto-fulfilled (no action needed)

---

## Download Link & Security

### Download Endpoint

```
GET /api/orders/{orderId}/download/{fileId}
```

**Checks:**
1. User is authenticated
2. User owns the order (order.user_id === auth.user.id)
3. Order.status is 'completed' or 'paid'
4. File exists in order.items[].file_path

**Response:**
- Stream file from Supabase Storage with `Content-Disposition: attachment`
- Log download (optional: for analytics)

**Error handling:**
- 401 → Not authenticated
- 403 → Not your order
- 404 → File not found or order not complete

### Display on Order Page

In `app/account/orders/[id]` detail view:

For each order item where `product.type === 'digital'`:
```
[File icon] Arquivo: example-model.stl
[Button: Baixar] — Clique para download
```

For physical items: show status as usual

---

## Testing Strategy

### Unit Tests (Vitest + jsdom)

**File:** `lib/__tests__/stl-orders.test.ts`

#### Email Tests
1. ✅ `sendSTLOrderConfirmationEmail()` sends to customer with download link
2. ✅ `sendAdminNewSTLOrderEmail()` sends to admin with file name
3. ✅ Both emails are sent when order is created
4. ✅ Email fails gracefully if Resend is misconfigured

#### Payment/Order Tests
1. ✅ Digital product order auto-completes (status='completed') after payment
2. ✅ Physical product order stays pending after payment
3. ✅ Mixed cart rejects (shows error to user)
4. ✅ Order total is correct (digital: no shipping added)
5. ✅ Webhook payment confirmation triggers both emails

#### Download Endpoint Tests
1. ✅ Authenticated user can download their order's file
2. ✅ Unauthenticated request returns 401
3. ✅ User cannot download other users' orders (403)
4. ✅ Download with invalid orderId returns 404
5. ✅ File streams with correct Content-Disposition header

---

## Database Migrations

1. Add `type` column with CHECK constraint
2. Add `file_path` column
3. Create index on `type` for filtering
4. Set `type='physical'` for all existing products (backfill)

---

## Implementation Order

1. Schema: migrate Supabase (add columns)
2. Admin UI: upload form + validation
3. Checkout: cart display, order auto-complete logic
4. Emails: new templates, update existing flows
5. Download: API endpoint + order page UI
6. Tests: comprehensive coverage
7. Deploy & verify

---

## Constraints & Assumptions

- **No mixed carts initially.** Simplifies logic. Can relax later if needed.
- **Unlimited downloads.** No expiry or single-use links.
- **File stored in Supabase.** No external CDN initially.
- **Admin uploads only.** No customer-generated content.
- **English/Portuguese in UI.** Consistent with existing site.

---

## Success Criteria

- ✅ Admin can upload STL with metadata + image
- ✅ Customer can purchase digital product like any other
- ✅ Receives confirmation email with download link
- ✅ Can download file unlimited times from order page
- ✅ All email flows tested (customer + admin)
- ✅ Payment flow tested (order auto-complete + webhooks)
- ✅ Download endpoint secured (auth + ownership checks)
- ✅ No regressions in physical product flow
