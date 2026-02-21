# Data Model: Restaurant Wishlist

**Branch**: `001-restaurant-wishlist`
**Date**: 2026-02-15

## Entities

### Restaurant (Wishlist Entry)

Represents a restaurant saved to the user's wishlist.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | string | Unique identifier (Kakao place ID) | Primary key, unique |
| name | string | Restaurant name | Required, non-empty |
| address | string | Full address | Required |
| category | string | Restaurant category (e.g., "일식", "한식") | Required |
| lat | number | Latitude coordinate | Required |
| lng | number | Longitude coordinate | Required |
| placeUrl | string | Kakao Place detail page URL | Optional |
| starRating | number | Wish-to-visit rating | Required, integer, 1–3, default: 1 |
| createdAt | string | ISO 8601 timestamp when added | Required, auto-set |

**Indexes**:
- Primary: `id`
- Compound: `[starRating+createdAt]` (for sorted wishlist view: descending star, then descending date)

**Identity rule**: A restaurant is uniquely identified by its Kakao
place ID (`id`). Duplicate detection uses this field (FR-004).

### MenuItem

Represents a user-created menu item memo attached to a restaurant.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | number | Auto-incremented primary key | Primary key, auto |
| restaurantId | string | FK to Restaurant.id | Required, indexed |
| name | string | Menu item name as entered by user | Required, non-empty |
| normalizedName | string | Lowercase trimmed name for grouping | Required, auto-derived, indexed |
| createdAt | string | ISO 8601 timestamp when added | Required, auto-set |

**Indexes**:
- Primary: `id` (auto-increment)
- Index: `restaurantId` (for listing menu items per restaurant)
- Index: `normalizedName` (for "By Menu" grouping, FR-006/FR-008)
- Compound: `[restaurantId+normalizedName]` (for duplicate check within same restaurant)

**Identity rule**: A menu item is unique per restaurant + normalized
name combination. The system SHOULD warn if adding a duplicate menu
item to the same restaurant.

**Normalization rule** (FR-008): `normalizedName = name.trim().toLowerCase()`.
This ensures "Tonkatsu", "tonkatsu", and " TONKATSU " all group together.

## Relationships

```text
Restaurant (1) ──── (0..*) MenuItem
     │                        │
     │ id ◄──────────── restaurantId
     │
     └─ On delete: CASCADE (FR-009)
         All MenuItems with matching restaurantId
         MUST be deleted when Restaurant is removed.
```

## Dexie.js Schema Definition

```typescript
// db/index.ts
import Dexie, { type EntityTable } from 'dexie';

interface Restaurant {
  id: string;           // Kakao place ID
  name: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
  placeUrl?: string;
  starRating: number;   // 1, 2, or 3
  createdAt: string;    // ISO 8601
}

interface MenuItem {
  id?: number;          // auto-increment
  restaurantId: string;
  name: string;
  normalizedName: string;
  createdAt: string;    // ISO 8601
}

const db = new Dexie('RestaurantWishlist') as Dexie & {
  restaurants: EntityTable<Restaurant, 'id'>;
  menuItems: EntityTable<MenuItem, 'id'>;
};

db.version(1).stores({
  restaurants: 'id, [starRating+createdAt]',
  menuItems: '++id, restaurantId, normalizedName, [restaurantId+normalizedName]',
});

export type { Restaurant, MenuItem };
export { db };
```

## Query Patterns

| Use Case | Query |
|----------|-------|
| Wishlist (sorted) | `db.restaurants.orderBy('[starRating+createdAt]').reverse()` |
| Restaurant detail | `db.restaurants.get(id)` |
| Menu items for restaurant | `db.menuItems.where('restaurantId').equals(id)` |
| All unique menu names | `db.menuItems.orderBy('normalizedName').uniqueKeys()` |
| Restaurants for a menu | `db.menuItems.where('normalizedName').equals(name)` → collect restaurantIds → `db.restaurants.bulkGet(ids)` |
| Check duplicate restaurant | `db.restaurants.get(kakaoPlaceId)` |
| Check duplicate menu item | `db.menuItems.where('[restaurantId+normalizedName]').equals([restaurantId, normalizedName])` |
| Delete restaurant + cascade | `db.transaction('rw', db.restaurants, db.menuItems, async () => { await db.menuItems.where('restaurantId').equals(id).delete(); await db.restaurants.delete(id); })` |
