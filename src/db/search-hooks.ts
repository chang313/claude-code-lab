"use client";

import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery } from "@/lib/supabase/use-query";
import { invalidate } from "@/lib/supabase/invalidate";
import type { KakaoPlace } from "@/types";

const RESTAURANTS_KEY = "restaurants";

function getSupabase() {
  return createClient();
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
      if (error.code === "23505") return false;
      throw error;
    }

    invalidate(RESTAURANTS_KEY);
    return true;
  };
  return { addRestaurant };
}

export function useIsWishlistedSet(ids: string[]): Set<string> {
  const { data } = useSupabaseQuery<Set<string>>(
    `wishlisted-set:${ids.join(",")}`,
    async () => {
      if (ids.length === 0) return new Set<string>();
      const { data, error } = await getSupabase()
        .from("restaurants")
        .select("kakao_place_id")
        .in("kakao_place_id", ids);
      if (error) throw error;
      return new Set(
        (data as { kakao_place_id: string }[]).map((r) => r.kakao_place_id),
      );
    },
    [ids.join(",")],
  );
  return data ?? new Set();
}
