# STL Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable selling downloadable STL files alongside physical products with full email notification, automatic order completion, and secure download access.

**Architecture:** Extend existing product/order system with type discriminator (`physical` | `digital`). Digital products skip shipping, auto-complete orders, and trigger immediate email with download link. Supabase Storage holds files; auth-gated API endpoint secures downloads.

**Tech Stack:** Next.js 16, Supabase (Storage + DB), Resend (email), Vitest (testing), TypeScript

## Global Constraints

- No mixed carts (digital + physical in same order) initially
- Digital products ignore colors/sizes
- File max size: 50MB
- Accepted format: `.stl` only
- Supabase Storage path: `stl-files/{productId}/{filename.stl}`
- Email sent immediately after payment confirmation
- Download available unlimited times, no expiry

---

## Task 1: Database Schema Migration

Add `type` and `file_path` columns to products table, create index.

## Task 2: Email Templates for STL Orders

Create STL-specific email templates and send functions in lib/email.ts

## Task 3: Admin Upload API Endpoint

Create POST /api/upload/stl endpoint for file upload to Supabase Storage

## Task 4: Admin Upload UI Form

Create /dashboard/products/stl page with upload form, educational banner, and makerworld link

## Task 5: Update Checkout Logic (Mixed Cart Prevention + Digital Order Auto-Complete)

Add cart validation and digital order auto-complete logic

## Task 6: Update Order Confirmation Email Logic

Hook STL emails into payment webhook

## Task 7: Download API Endpoint

Create GET /api/orders/{orderId}/download/{fileId} endpoint with auth checks

## Task 8: Update Order Detail Page (Add Download Button)

Add download button for digital products in /account/orders/[id]

## Task 9: Update Products Dashboard (Add Filter + Type Badge)

Add product type filter and badge display in dashboard

## Task 10: Unit Tests - Email Notifications

Test sendSTLOrderConfirmationEmail and sendSTLAdminNotificationEmail

## Task 11: Unit Tests - Payment & Order Auto-Complete

Test digital order auto-complete and mixed cart rejection

## Task 12: Unit Tests - Download Endpoint Security

Test auth, ownership, and file access controls

## Task 13: Unit Tests - Integration Test

End-to-end STL purchase flow test

## Task 14: Verify No Regressions & Final Testing

Manual verification of physical product flow and regression testing

## Task 15: Public STL Marketplace Page

Create /stl page with welcome banner and product grid

## Task 16: Add STL Explanation to Orders/Requests Page

Add educational card about STL files to orders/requests page
