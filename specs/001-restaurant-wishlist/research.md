# Research: Restaurant Wishlist

**Branch**: `001-restaurant-wishlist`
**Date**: 2026-02-15

## R1: Kakao Maps SDK Integration (Map Display)

**Decision**: Use Kakao Maps JavaScript SDK v3 for interactive map rendering.

**Rationale**: Kakao Maps provides the best POI (Point of Interest)
coverage for Korean restaurants. The JS SDK loads via script tag and
provides `kakao.maps.Map`, `kakao.maps.Marker`, and
`kakao.maps.InfoWindow` for marker popups. Free tier allows 300,000
map loads/day — far exceeding personal use.

**Alternatives considered**:
- Google Maps JS API: Better global coverage but costs money after
  free tier. Overkill for primarily Korean restaurants.
- Leaflet + OpenStreetMap: Free but requires separate POI data source.
  No integrated restaurant search.
- Naver Maps: Decent Korean coverage but less developer-friendly API
  and stricter usage terms.

**Integration notes**:
- Load SDK via `<script>` tag in Next.js layout (or dynamic import).
- Requires Kakao Developers app key (JavaScript key).
- Wrap in a `MapView` React component using `useRef` for map container.
- Use `"use client"` directive since SDK requires browser APIs.

## R2: Kakao Local API (Restaurant Search)

**Decision**: Use Kakao Local REST API (`/v2/local/search/keyword`)
for restaurant name search, and category search for map-area browsing.

**Rationale**: Kakao Local API provides keyword search with category
filtering (FD6 = restaurants), returns name, address, coordinates,
category, and place URL. Free tier: 100,000 requests/day.

**Alternatives considered**:
- Google Places API: Higher cost, better global data. Unnecessary for
  Korean-focused app.
- Foursquare API: Good restaurant data but less Korean coverage than
  Kakao.
- Direct web scraping: Unreliable, legally questionable.

**Integration notes**:
- REST calls from client via `fetch()` with API key in header.
- Kakao API key can be exposed client-side (domain-restricted).
- Keyword search endpoint: `GET https://dapi.kakao.com/v2/local/search/keyword`
- Category search (for map bounds): `GET https://dapi.kakao.com/v2/local/search/category`
- Pagination supported via `page` parameter (max 45 results per query).

## R3: Dexie.js for IndexedDB (Local Persistence)

**Decision**: Use Dexie.js v4 as the IndexedDB wrapper for all local
data persistence.

**Rationale**: Dexie provides a clean Promise-based API over IndexedDB,
supports compound indexes (needed for star rating + date sorting),
and handles schema versioning. Perfect for offline-first personal apps.

**Alternatives considered**:
- Raw IndexedDB API: Too verbose, error-prone cursor management.
- localStorage: 5MB limit, no structured queries, no indexing.
- PouchDB: Designed for sync with CouchDB — unnecessary complexity
  for a local-only app.
- sql.js (SQLite WASM): Heavier bundle (~1MB), overkill for simple
  key-value + index queries.

**Integration notes**:
- Define database schema with Dexie's declarative syntax.
- Create compound index `[starRating+createdAt]` for sorted wishlist.
- Create index on `menuItems.normalizedName` for menu grouping.
- Wrap DB operations in custom React hooks (`useWishlist`,
  `useMenuItems`, `useMenuGroups`).
- Dexie.js `liveQuery` provides reactive updates when data changes.

## R4: Next.js App Router (Client-Only SPA)

**Decision**: Use Next.js 15 with App Router. All pages use `"use client"`
since the app is entirely client-side (no SSR needed for data).

**Rationale**: Next.js provides file-based routing, excellent developer
experience, and built-in optimization (code splitting, image
optimization). Even without SSR, the framework gives us fast static
shell delivery for good LCP scores.

**Alternatives considered**:
- Vite + React Router: Lighter but loses file-based routing and
  built-in optimizations.
- SvelteKit: Smaller bundle but team has less React/Svelte crossover.
- Plain Create React App: Deprecated, no longer recommended.

**Integration notes**:
- Use `output: 'export'` in `next.config.ts` for static export
  (deployable to any static host).
- All route pages are client components (`"use client"`).
- Layout provides bottom navigation bar for mobile UX.
- Dynamic routes: `/restaurant/[id]` for detail, `/by-menu/[menu]`
  for menu group view.

## R5: Tailwind CSS (Design System)

**Decision**: Use Tailwind CSS 4 with a custom theme for consistent
mobile-first design.

**Rationale**: Tailwind provides utility-first CSS that's ideal for
responsive mobile layouts. Combined with a defined color palette and
spacing scale, it satisfies the constitution's design system requirement
(Principle III) without a heavy component library.

**Alternatives considered**:
- shadcn/ui: Good components but adds complexity for a simple app.
- Material UI: Heavy bundle, opinionated design not needed.
- CSS Modules: More boilerplate, no built-in design tokens.

**Integration notes**:
- Define custom colors, font sizes, and spacing in `tailwind.config.ts`.
- Mobile-first breakpoints: default = mobile, `md:` = tablet+.
- Use consistent component patterns: cards, buttons, inputs, badges.

## R6: Offline Support Strategy

**Decision**: Service Worker not required for MVP. Offline support is
achieved through IndexedDB (Dexie.js) for saved wishlist data. Search
and map features require network.

**Rationale**: FR-010 requires browsing saved data offline, not offline
search/map. Since all wishlist data is in IndexedDB, it's inherently
available offline. Adding a Service Worker for full PWA caching can be
a future enhancement.

**Alternatives considered**:
- Full PWA with Service Worker: Adds complexity for caching API
  responses. Not needed since search results aren't cached.
- Background sync: No server to sync with.

**Integration notes**:
- Detect online/offline status via `navigator.onLine` and `online`/
  `offline` events.
- Show `OfflineBanner` component when offline.
- Disable search and map navigation when offline; wishlist and by-menu
  views remain fully functional.
