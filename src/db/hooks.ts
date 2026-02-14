"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./index";
import { normalizeMenuName } from "@/lib/normalize";
import type { KakaoPlace, Restaurant, MenuItem, MenuGroup } from "@/types";

// === Wishlist Operations ===

export function useWishlist() {
  const restaurants = useLiveQuery(
    () =>
      db.restaurants
        .orderBy("[starRating+createdAt]")
        .reverse()
        .toArray(),
    [],
  );
  return { restaurants: restaurants ?? [], isLoading: restaurants === undefined };
}

export function useAddRestaurant() {
  const addRestaurant = async (
    place: KakaoPlace,
    starRating: number = 1,
  ): Promise<boolean> => {
    const existing = await db.restaurants.get(place.id);
    if (existing) return false;

    const restaurant: Restaurant = {
      id: place.id,
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      category: place.category_name,
      lat: parseFloat(place.y),
      lng: parseFloat(place.x),
      placeUrl: place.place_url,
      starRating,
      createdAt: new Date().toISOString(),
    };
    await db.restaurants.add(restaurant);
    return true;
  };
  return { addRestaurant };
}

export function useRemoveRestaurant() {
  const removeRestaurant = async (id: string): Promise<void> => {
    await db.transaction("rw", db.restaurants, db.menuItems, async () => {
      await db.menuItems.where("restaurantId").equals(id).delete();
      await db.restaurants.delete(id);
    });
  };
  return { removeRestaurant };
}

export function useUpdateStarRating() {
  const updateStarRating = async (
    id: string,
    rating: 1 | 2 | 3,
  ): Promise<void> => {
    await db.restaurants.update(id, { starRating: rating });
  };
  return { updateStarRating };
}

export function useIsWishlisted(id: string): boolean {
  const result = useLiveQuery(() => db.restaurants.get(id), [id]);
  return result !== undefined && result !== null;
}

// === Menu Item Operations ===

export function useMenuItems(restaurantId: string) {
  const menuItems = useLiveQuery(
    () => db.menuItems.where("restaurantId").equals(restaurantId).toArray(),
    [restaurantId],
  );
  return { menuItems: menuItems ?? [], isLoading: menuItems === undefined };
}

export function useAddMenuItem() {
  const addMenuItem = async (
    restaurantId: string,
    name: string,
  ): Promise<void> => {
    const normalized = normalizeMenuName(name);
    await db.menuItems.add({
      restaurantId,
      name: name.trim(),
      normalizedName: normalized,
      createdAt: new Date().toISOString(),
    });
  };
  return { addMenuItem };
}

export function useRemoveMenuItem() {
  const removeMenuItem = async (id: number): Promise<void> => {
    await db.menuItems.delete(id);
  };
  return { removeMenuItem };
}

// === Menu Grouping Operations ===

export function useMenuGroups() {
  const groups = useLiveQuery(async (): Promise<MenuGroup[]> => {
    const allItems = await db.menuItems.toArray();
    const groupMap = new Map<string, { displayName: string; count: number }>();

    for (const item of allItems) {
      const existing = groupMap.get(item.normalizedName);
      if (existing) {
        existing.count++;
      } else {
        groupMap.set(item.normalizedName, {
          displayName: item.name,
          count: 1,
        });
      }
    }

    return Array.from(groupMap.entries())
      .map(([normalizedName, { displayName, count }]) => ({
        normalizedName,
        displayName,
        count,
      }))
      .sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
  }, []);

  return { groups: groups ?? [], isLoading: groups === undefined };
}

export function useRestaurantsByMenu(normalizedMenuName: string) {
  const restaurants = useLiveQuery(async () => {
    const items = await db.menuItems
      .where("normalizedName")
      .equals(normalizedMenuName)
      .toArray();

    const restaurantIds = [...new Set(items.map((i) => i.restaurantId))];
    const results = await db.restaurants.bulkGet(restaurantIds);
    return results.filter((r): r is Restaurant => r !== undefined);
  }, [normalizedMenuName]);

  return {
    restaurants: restaurants ?? [],
    isLoading: restaurants === undefined,
  };
}
