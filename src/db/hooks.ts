"use client";

import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery } from "@/lib/supabase/use-query";
import { invalidate } from "@/lib/supabase/invalidate";
import { groupBySubcategory } from "@/lib/subcategory";
import type { KakaoPlace, Restaurant, SubcategoryGroup } from "@/types";

const RESTAURANTS_KEY = "restaurants";

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
  star_rating: number | null;
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

export function useVisitedGrouped() {
  const { data, isLoading } = useSupabaseQuery<SubcategoryGroup[]>(
    RESTAURANTS_KEY,
    async () => {
      const { data, error } = await getSupabase()
        .from("restaurants")
        .select("*")
        .not("star_rating", "is", null)
        .order("star_rating", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const restaurants = (data as DbRestaurant[]).map(mapDbRestaurant);
      return groupBySubcategory(restaurants);
    },
  );
  return { groups: data ?? [], isLoading };
}

export function useWishlistGrouped() {
  const { data, isLoading } = useSupabaseQuery<SubcategoryGroup[]>(
    RESTAURANTS_KEY,
    async () => {
      const { data, error } = await getSupabase()
        .from("restaurants")
        .select("*")
        .is("star_rating", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const restaurants = (data as DbRestaurant[]).map(mapDbRestaurant);
      return groupBySubcategory(restaurants);
    },
  );
  return { groups: data ?? [], isLoading };
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
    starRating: number | null = null,
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

export function useMarkAsVisited() {
  const markAsVisited = async (
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
    invalidate(`wishlisted:${kakaoPlaceId}`);
  };
  return { markAsVisited };
}

export function useMoveToWishlist() {
  const moveToWishlist = async (kakaoPlaceId: string): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("restaurants")
      .update({ star_rating: null })
      .eq("kakao_place_id", kakaoPlaceId);
    if (error) throw error;
    invalidate(RESTAURANTS_KEY);
    invalidate(`wishlisted:${kakaoPlaceId}`);
  };
  return { moveToWishlist };
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
