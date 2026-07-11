# Order Feedback & UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add order rating feedback modal (5 emojis), product review suggestions, adjust download button size, hide empty shipping address, and create admin ratings dashboard.

**Architecture:**
- Client-side modal component for feedback (React, Tailwind)
- Database schema for ratings (supabase)
- New API endpoint for admin ratings report
- Conditional rendering based on order status and data availability

**Tech Stack:** Next.js, React, Tailwind CSS, Supabase, TypeScript

## Global Constraints

- 5 emojis only: 😞 😕 😐 😊 😍 (no text input, no comments)
- Modal shows "Obrigada pela avaliação!" then auto-closes after 1-2s
- X button always available to close early
- Download button reduced to `px-4 py-2` from current size
- Shipping address section hidden if empty/null
- Mobile-first responsive design
- Maintain existing color palette and font stack

---

## Database Schema Changes

**New table: `order_ratings`**

```sql
create table order_ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  created_at timestamp default now(),
  unique(order_id)
);

create index order_ratings_user_id on order_ratings(user_id);
create index order_ratings_order_id on order_ratings(order_id);
create index order_ratings_created_at on order_ratings(created_at desc);
```

---

## File Structure

```
app/(shop)/account/orders/[id]/
  ├── page.tsx (MODIFY) — add rating modal + conditional sections
  ├── DownloadButton.tsx (MODIFY) — reduce button size
  ├── RatingModal.tsx (CREATE) — feedback modal component
  └── ProductReviewSuggestion.tsx (CREATE) — product rating suggestion

app/api/orders/
  └── ratings/route.ts (CREATE) — POST endpoint for saving ratings

app/api/admin/
  └── order-ratings/route.ts (CREATE) — GET endpoint for ratings report

app/dashboard/
  └── order-ratings/page.tsx (CREATE) — admin ratings dashboard
```

---

### Task 1: Create RatingModal Component

**Files:**
- Create: `app/(shop)/account/orders/[id]/RatingModal.tsx`
- Modify: `app/(shop)/account/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `order.id`, `order.status`, `order.user_id` (from page)
- Produces: `RatingModal` component (props: `orderId`, `userId`, `onClose`)

- [ ] **Step 1: Create RatingModal component with emoji buttons**

```typescript
// app/(shop)/account/orders/[id]/RatingModal.tsx

'use client';

import { useState } from 'react';

interface RatingModalProps {
  orderId: string;
  userId: string;
  onClose: () => void;
}

const EMOJIS = [
  { rating: 1, emoji: '😞', label: 'Muito insatisfeito' },
  { rating: 2, emoji: '😕', label: 'Insatisfeito' },
  { rating: 3, emoji: '😐', label: 'Neutro' },
  { rating: 4, emoji: '😊', label: 'Satisfeito' },
  { rating: 5, emoji: '😍', label: 'Muito satisfeito' },
];

export default function RatingModal({ orderId, userId, onClose }: RatingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  const handleRating = async (rating: number) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, userId, rating }),
      });

      if (res.ok) {
        setShowThanks(true);
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      console.error('[RatingModal] error:', err);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showThanks) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center max-w-sm">
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Obrigada!</p>
          <p className="text-gray-600 dark:text-gray-400">Agradecemos pela avaliação.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-sm w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Como foi sua experiência?
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex justify-around gap-3">
          {EMOJIS.map(({ rating, emoji, label }) => (
            <button
              key={rating}
              onClick={() => handleRating(rating)}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
              title={label}
            >
              <span className="text-3xl">{emoji}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ratings API endpoint**

```typescript
// app/api/orders/ratings/route.ts

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireUser } from '@/lib/api';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const body = await request.json();
  const { orderId, rating } = body;

  if (!orderId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    const { error } = await admin
      .from('order_ratings')
      .upsert({
        order_id: orderId,
        user_id: auth.user.id,
        rating,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ratings] error:', err);
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update order detail page to show modal**

- [ ] **Step 4: Test modal interaction**

- [ ] **Step 5: Commit**

---

### Task 2: Add Product Review Suggestion

**Files:**
- Create: `app/(shop)/account/orders/[id]/ProductReviewSuggestion.tsx`
- Modify: `app/(shop)/account/orders/[id]/page.tsx`

- [ ] **Step 1: Create ProductReviewSuggestion component**

- [ ] **Step 2: Add to order items**

- [ ] **Step 3: Test**

- [ ] **Step 4: Commit**

---

### Task 3: Reduce Download Button Size

**Files:**
- Modify: `app/(shop)/account/orders/[id]/DownloadButton.tsx`

- [ ] **Step 1: Update button styling**

- [ ] **Step 2: Test button size**

- [ ] **Step 3: Commit**

---

### Task 4: Hide Empty Shipping Address

**Files:**
- Modify: `app/(shop)/account/orders/[id]/page.tsx`

- [ ] **Step 1: Find and update address section**

- [ ] **Step 2: Test**

- [ ] **Step 3: Commit**

---

### Task 5: Create Admin Ratings Report Endpoint

**Files:**
- Create: `app/api/admin/order-ratings/route.ts`

- [ ] **Step 1: Create admin ratings endpoint**

- [ ] **Step 2: Test endpoint**

- [ ] **Step 3: Commit**

---

### Task 6: Create Admin Ratings Dashboard Page

**Files:**
- Create: `app/dashboard/order-ratings/page.tsx`

- [ ] **Step 1: Create admin ratings page**

- [ ] **Step 2: Test dashboard**

- [ ] **Step 3: Commit**

---
