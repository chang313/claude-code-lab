"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./index";
import type { KakaoPlace, Restaurant } from "@/types";

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

export function useIsWishlistedSet(ids: string[]): Set<string> {
  const result = useLiveQuery(async () => {
    const existing = await db.restaurants.bulkGet(ids);
    return new Set(existing.filter(Boolean).map((r) => r!.id));
  }, [ids.join(",")]);
  return result ?? new Set();
}
