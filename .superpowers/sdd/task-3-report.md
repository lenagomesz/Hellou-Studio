# Task 3 Report: Type-aware notifications in Mercado Pago webhook

## Status: DONE

## Summary

Modified `app/api/webhooks/mercadopago/route.ts` to create personalized notifications based on order type (digital-only, physical, hybrid) instead of a generic "PIX confirmado!" message.

## Changes Made

1. Added import for `hasDigitalItems`, `hasPhysicalItems`, and `OrderItemWithProduct` from `@/lib/order-helpers`
2. Replaced hardcoded notification block with logic that:
   - Queries order items with product type via Supabase
   - Uses helper functions to determine order composition
   - Sets notification title/body based on three cases:
     - Digital-only: "Seu arquivo STL esta pronto!"
     - Physical-only: "Pedido aprovado!"
     - Hybrid: "Arquivo pronto + Pedido em producao!"
3. Changed event name from `pix_approved` to `order_approved`

## Commits

7f867e4..07cd17e

## Tests

- Next.js build passes successfully (no TypeScript or compilation errors)
- The only pre-existing TS error is in an unrelated test file (`tests/api/notifications.test.ts:64`)
- No webhook-specific test files found to run

## Files Modified

- `app/api/webhooks/mercadopago/route.ts`
