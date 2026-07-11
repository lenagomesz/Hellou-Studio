## Task 2 Report: Conditional Checkout Success Cards by Order Type

Status: DONE
Commits: 7f867e4..e384438
Tests: Build passes (`next build` successful). Manual browser testing requires a running dev server with Supabase credentials and existing orders of each type.
Report: /Users/helena.gomes/projects/ecommerce-3d/.superpowers/sdd/task-2-report.md

### Changes Made

**Modified:** `app/(shop)/checkout/success/page.tsx`

1. Added imports for `getSupabaseAdmin`, `isDigitalOnly`, `hasDigitalItems`, `hasPhysicalItems`, and `OrderItemWithProduct` type.
2. Added server-side order fetching logic that queries `orders` joined with `order_items` and `products` to determine order type (digital/physical/hybrid).
3. Replaced static title/description with `titlesByType` and `descriptionByType` maps keyed by order type.
4. Replaced static 3-card progress layout with `cardsByType` map: 2 cards for digital orders, 3 cards for physical/hybrid orders.
5. Grid layout adjusts columns based on order type (`grid-cols-2` for digital, `grid-cols-3` for physical/hybrid).

### Verification

- `next build` completes successfully with no type or compilation errors.
- The page defaults to `physical` order type when no `order_id` is provided or when the order cannot be fetched, maintaining backward compatibility.
