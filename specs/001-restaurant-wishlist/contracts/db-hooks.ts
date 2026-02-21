/**
 * Contract: React hooks for IndexedDB operations via Dexie.js
 *
 * These hooks define the public API for all database interactions.
 * Components MUST use these hooks instead of accessing `db` directly.
 */

// === Wishlist Operations ===

/** Returns all wishlisted restaurants sorted by starRating desc, createdAt desc */
type UseWishlist = () => {
  restaurants: Restaurant[];
  isLoading: boolean;
};

/** Add a restaurant to the wishlist. Returns false if duplicate (FR-004). */
type UseAddRestaurant = () => {
  addRestaurant: (restaurant: KakaoPlace, starRating?: number) => Promise<boolean>;
};

/** Remove a restaurant and cascade-delete its menu items (FR-009). */
type UseRemoveRestaurant = () => {
  removeRestaurant: (id: string) => Promise<void>;
};

/** Update a restaurant's star rating (FR-013). */
type UseUpdateStarRating = () => {
  updateStarRating: (id: string, rating: 1 | 2 | 3) => Promise<void>;
};

/** Check if a restaurant is already in the wishlist (FR-004). */
type UseIsWishlisted = (id: string) => boolean;

// === Menu Item Operations ===

/** Returns all menu items for a given restaurant. */
type UseMenuItems = (restaurantId: string) => {
  menuItems: MenuItem[];
  isLoading: boolean;
};

/** Add a menu item to a restaurant. Normalizes name for grouping (FR-008). */
type UseAddMenuItem = () => {
  addMenuItem: (restaurantId: string, name: string) => Promise<void>;
};

/** Remove a menu item by ID. */
type UseRemoveMenuItem = () => {
  removeMenuItem: (id: number) => Promise<void>;
};

// === Menu Grouping Operations ===

/** Returns all unique normalized menu item names with counts. */
type UseMenuGroups = () => {
  groups: Array<{ normalizedName: string; displayName: string; count: number }>;
  isLoading: boolean;
};

/** Returns all restaurants that have a specific menu item. */
type UseRestaurantsByMenu = (normalizedMenuName: string) => {
  restaurants: Restaurant[];
  isLoading: boolean;
};
