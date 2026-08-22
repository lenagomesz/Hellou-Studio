# Task 11: Update Navbar Blog Link

## Status: DONE

## Commit base: c2bea23

## Changes Made

### 1. `components/shop/Navbar.tsx`
- Added a "Blog" entry to the `NAV_LINKS` array with a document/article icon SVG path
- Positioned between "Encomendas" and "Sobre"

### 2. `lib/store-settings-schema.ts`
- Added `{ id: 'blog', label: 'Blog', href: '/blog', active: true }` to the default `navigation.links` array
- Positioned between "Encomendas" and "Sobre"

## How It Works

The navbar renders links from `settings.navigation.links` (loaded from the database or defaults). Each link is matched against `NAV_LINKS` to get its icon SVG path. By adding the Blog entry to both:
- The default settings ensure the Blog link appears for fresh installs / when no DB override exists
- The `NAV_LINKS` icon mapping ensures the Blog link gets a proper document icon

The link uses the standard nav link styling (active state with pink gradient, hover states, etc.) and appears on both desktop and mobile navigation.

## Verification

- `npm run build` passes with no TypeScript or lint errors
- The Blog link renders at `/blog` in both desktop and mobile nav
- Active state highlights correctly when on `/blog` or `/blog/*` paths (uses `pathname.startsWith('/blog')`)
