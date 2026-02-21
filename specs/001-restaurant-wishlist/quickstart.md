# Quickstart: Restaurant Wishlist

## Prerequisites

- Node.js 20+
- A Kakao Developers account with a registered app
  (https://developers.kakao.com)
- Kakao JavaScript key (for Maps SDK) and REST API key (for Local API)

## Setup

```bash
# Clone and enter the project
git clone <repo-url>
cd claude-code-lab
git checkout 001-restaurant-wishlist

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and set:
#   NEXT_PUBLIC_KAKAO_JS_KEY=your_javascript_key
#   NEXT_PUBLIC_KAKAO_REST_KEY=your_rest_api_key

# Start development server
npm run dev
```

Open http://localhost:3000 on your mobile browser (or use Chrome
DevTools responsive mode).

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production (static export) |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run test` | Run Vitest unit + integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |

## Verification Steps

1. **Search**: Open the app → tap Search → type a restaurant name →
   verify results appear with name, address, and category.
2. **Add to Wishlist**: Tap "Add to Wishlist" on a search result →
   verify it appears on the home wishlist view with 1 star.
3. **Star Rating**: Tap a wishlisted restaurant → change star rating →
   verify sort order updates on wishlist.
4. **Map**: Navigate to Map → verify markers load around your location →
   tap a marker → add to wishlist from popup.
5. **Menu Item**: Open a wishlisted restaurant → add a menu item
   (e.g., "tonkatsu") → verify it appears in the list.
6. **By Menu View**: Navigate to "By Menu" → verify menu items are
   listed → tap one → verify correct restaurants shown.
7. **Offline**: Disconnect network → verify wishlist and by-menu views
   still load → verify search/map show offline notice.
8. **Persistence**: Close and reopen the browser → verify all saved
   data is intact.

## Architecture Overview

```text
┌─────────────────────────────────────────────┐
│  Next.js App Router (client-only pages)     │
│  ┌──────────┐ ┌──────┐ ┌────────────────┐  │
│  │ /search   │ │ /map │ │ /by-menu/[menu]│  │
│  └─────┬─────┘ └──┬───┘ └───────┬────────┘  │
│        │          │              │            │
│  ┌─────▼──────────▼──────────────▼─────────┐ │
│  │         React Components                 │ │
│  │  (RestaurantCard, StarRating, MapView)   │ │
│  └─────────────┬───────────────────────────┘ │
│                │                              │
│  ┌─────────────▼───────────────────────────┐ │
│  │  DB Hooks (useWishlist, useMenuItems)    │ │
│  └─────────────┬───────────────────────────┘ │
│                │                              │
│  ┌─────────────▼────────┐  ┌──────────────┐ │
│  │  Dexie.js (IndexedDB) │  │ Kakao APIs   │ │
│  │  (local persistence)  │  │ (search/map) │ │
│  └───────────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────┘
```
