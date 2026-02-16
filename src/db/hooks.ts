"use client";

import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery } from "@/lib/supabase/use-query";
import { invalidate } from "@/lib/supabase/invalidate";
import { normalizeMenuName } from "@/lib/normalize";
import type { KakaoPlace, Restaurant, MenuItem, MenuGroup } from "@/types";

const RESTAURANTS_KEY = "restaurants";
const MENU_ITEMS_KEY = "menu_items";

function getSupabase() {
  return createClient();
}

interface DbRestaurant {
  id: string;
  kakao_place_id: string;
  name: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
  place_url: string | null;
  star_rating: number;
  created_at: string;
}

interface DbMenuItem {
  id: number;
  restaurant_id: string;
  name: string;
  normalized_name: string;
  created_at: string;
}

function mapDbRestaurant(row: DbRestaurant): Restaurant {
  return {
    id: row.kakao_place_id,
    name: row.name,
    address: row.address,
    category: row.category,
    lat: row.lat,
    lng: row.lng,
    placeUrl: row.place_url ?? undefined,
    starRating: row.star_rating,
    createdAt: row.created_at,
  };
}

function mapDbMenuItem(row: DbMenuItem): MenuItem {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    normalizedName: row.normalized_name,
    createdAt: row.created_at,
  };
}

// === Wishlist Operations ===

export function useWishlist() {
  const { data, isLoading } = useSupabaseQuery<Restaurant[]>(
    RESTAURANTS_KEY,
    async () => {
      const { data, error } = await getSupabase()
        .from("restaurants")
        .select("*")
        .order("star_rating", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as DbRestaurant[]).map(mapDbRestaurant);
    },
  );
  return { restaurants: data ?? [], isLoading };
}

export function useRestaurant(kakaoPlaceId: string) {
  const { data, isLoading } = useSupabaseQuery<Restaurant | null>(
    `${RESTAURANTS_KEY}:${kakaoPlaceId}`,
    async () => {
      const { data, error } = await getSupabase()
        .from("restaurants")
        .select("*")
        .eq("kakao_place_id", kakaoPlaceId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapDbRestaurant(data as DbRestaurant) : null;
    },
    [kakaoPlaceId],
  );
  return { restaurant: data, isLoading };
}

export function useAddRestaurant() {
  const addRestaurant = async (
    place: KakaoPlace,
    starRating: number = 1,
  ): Promise<boolean> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("restaurants").insert({
      user_id: user.id,
      kakao_place_id: place.id,
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      category: place.category_name,
      lat: parseFloat(place.y),
      lng: parseFloat(place.x),
      place_url: place.place_url,
      star_rating: starRating,
    });

    if (error) {
      if (error.code === "23505") return false; // unique constraint = already exists
      throw error;
    }

    invalidate(RESTAURANTS_KEY);
    return true;
  };
  return { addRestaurant };
}

export function useRemoveRestaurant() {
  const removeRestaurant = async (kakaoPlaceId: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("restaurants")
      .delete()
      .eq("kakao_place_id", kakaoPlaceId);
    if (error) throw error;
    invalidate(RESTAURANTS_KEY);
    invalidate(MENU_ITEMS_KEY);
  };
  return { removeRestaurant };
}

export function useUpdateStarRating() {
  const updateStarRating = async (
    kakaoPlaceId: string,
    rating: 1 | 2 | 3,
  ): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("restaurants")
      .update({ star_rating: rating })
      .eq("kakao_place_id", kakaoPlaceId);
    if (error) throw error;
    invalidate(RESTAURANTS_KEY);
    invalidate(`${RESTAURANTS_KEY}:${kakaoPlaceId}`);
  };
  return { updateStarRating };
}

export function useIsWishlisted(kakaoPlaceId: string): boolean {
  const { data } = useSupabaseQuery<boolean>(
    `wishlisted:${kakaoPlaceId}`,
    async () => {
      const { count, error } = await getSupabase()
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .eq("kakao_place_id", kakaoPlaceId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    [kakaoPlaceId],
  );
  return data ?? false;
}

// === Menu Item Operations ===

export function useMenuItems(restaurantKakaoId: string) {
  const { data, isLoading } = useSupabaseQuery<MenuItem[]>(
    `${MENU_ITEMS_KEY}:${restaurantKakaoId}`,
    async () => {
      const supabase = getSupabase();
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("kakao_place_id", restaurantKakaoId)
        .maybeSingle();
      if (!restaurant) return [];

      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurant.id);
      if (error) throw error;
      return (data as DbMenuItem[]).map(mapDbMenuItem);
    },
    [restaurantKakaoId],
  );
  return { menuItems: data ?? [], isLoading };
}

export function useAddMenuItem() {
  const addMenuItem = async (
    restaurantKakaoId: string,
    name: string,
  ): Promise<void> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("kakao_place_id", restaurantKakaoId)
      .maybeSingle();
    if (!restaurant) return;

    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: restaurant.id,
      user_id: user.id,
      name: name.trim(),
      normalized_name: normalizeMenuName(name),
    });
    if (error) throw error;
    invalidate(`${MENU_ITEMS_KEY}:${restaurantKakaoId}`);
    invalidate(MENU_ITEMS_KEY);
  };
  return { addMenuItem };
}

export function useRemoveMenuItem() {
  const removeMenuItem = async (id: number): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) throw error;
    invalidate(MENU_ITEMS_KEY);
  };
  return { removeMenuItem };
}

// === Menu Grouping Operations ===

export function useMenuGroups() {
  const { data, isLoading } = useSupabaseQuery<MenuGroup[]>(
    MENU_ITEMS_KEY,
    async () => {
      const { data, error } = await getSupabase()
        .from("menu_items")
        .select("name, normalized_name");
      if (error) throw error;

      const groupMap = new Map<string, { displayName: string; count: number }>();
      for (const item of data as { name: string; normalized_name: string }[]) {
        const existing = groupMap.get(item.normalized_name);
        if (existing) {
          existing.count++;
        } else {
          groupMap.set(item.normalized_name, {
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
    },
  );
  return { groups: data ?? [], isLoading };
}

export function useRestaurantsByMenu(normalizedMenuName: string) {
  const { data, isLoading } = useSupabaseQuery<Restaurant[]>(
    `${MENU_ITEMS_KEY}:by-menu:${normalizedMenuName}`,
    async () => {
      const supabase = getSupabase();
      const { data: items, error: itemsError } = await supabase
        .from("menu_items")
        .select("restaurant_id")
        .eq("normalized_name", normalizedMenuName);
      if (itemsError) throw itemsError;

      const restaurantIds = [
        ...new Set(
          (items as { restaurant_id: string }[]).map((i) => i.restaurant_id),
        ),
      ];
      if (restaurantIds.length === 0) return [];

      const { data: restaurants, error } = await supabase
        .from("restaurants")
        .select("*")
        .in("id", restaurantIds);
      if (error) throw error;
      return (restaurants as DbRestaurant[]).map(mapDbRestaurant);
    },
    [normalizedMenuName],
  );
  return { restaurants: data ?? [], isLoading };
}
