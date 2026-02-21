# Quickstart: Integrate Search & Map Tabs

**Branch**: `002-integrate-search-tabs`

## Prerequisites

- Node.js 18+
- pnpm installed
- Kakao Developer account with JS key and REST key
- Supabase project with Kakao OAuth configured

## Setup

```bash
# Switch to worktree
cd 002-integrate-search-tabs

# Merge latest app code from 001-restaurant-wishlist
git merge 001-restaurant-wishlist

# Install dependencies
pnpm install

# Copy environment variables (if not already shared)
cp ../claude-code-lab/.env.local .env.local

# Start dev server
pnpm dev
```

## Environment Variables

```
NEXT_PUBLIC_KAKAO_JS_KEY=<kakao-javascript-key>
NEXT_PUBLIC_KAKAO_REST_KEY=<kakao-rest-api-key>
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Files to Change

| File | Action | Description |
|------|--------|-------------|
| `src/components/SearchBar.tsx` | MODIFY | Replace debounce with form submit (Enter + button) |
| `src/components/MapView.tsx` | MODIFY | Add auto-fit bounds, make onBoundsChange optional |
| `src/components/BottomSheet.tsx` | CREATE | Draggable bottom sheet with 3 snap states |
| `src/app/search/page.tsx` | REWRITE | Unified search + map page with bottom sheet |
| `src/app/map/page.tsx` | DELETE | Merged into /search |
| `src/components/BottomNav.tsx` | MODIFY | Remove Map tab (5 → 4 tabs) |

## Build Order

1. **SearchBar** — Change trigger mechanism (standalone, no dependencies)
2. **MapView** — Add auto-fit bounds support (standalone)
3. **BottomSheet** — New component (standalone)
4. **search/page.tsx** — Compose all components into unified page
5. **BottomNav** — Remove Map tab
6. **Delete map/page.tsx** — Clean up old route

## Verification

```bash
# Build check
pnpm build

# Unit tests
pnpm test

# Manual verification
# 1. Open /search — see search bar + empty map centered on location
# 2. Type "pizza" + Enter — markers appear, bottom sheet slides up
# 3. Tap marker — detail card shows
# 4. Tap "Add to Wishlist" — saves restaurant
# 5. Swipe bottom sheet up/down — expands/collapses
# 6. BottomNav shows 4 tabs (no Map tab)
```
