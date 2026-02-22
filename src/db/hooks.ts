"use client";

import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery } from "@/lib/supabase/use-query";
import { invalidate, invalidateByPrefix, getCache, setCache } from "@/lib/supabase/invalidate";
import { groupBySubcategory } from "@/lib/subcategory";
import type { KakaoPlace, Restaurant, SubcategoryGroup } from "@/types";

const RESTAURANTS_KEY = "restaurants";
const VISITED_KEY = "restaurants:visited";
const WISHLIST_KEY = "restaurants:wishlist";

function invalidateRestaurants() {
  invalidate(RESTAURANTS_KEY);
  invalidate(VISITED_KEY);
  invalidate(WISHLIST_KEY);
  invalidateByPrefix("restaurant-status:");
  invalidateByPrefix("wishlisted-set:");
}

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
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", user.id)
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
    VISITED_KEY,
    async () => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", user.id)
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
    WISHLIST_KEY,
    async () => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", user.id)
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
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", user.id)
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

    invalidateRestaurants();
    return true;
  };
  return { addRestaurant };
}

export function useRemoveRestaurant(onError?: (msg: string) => void) {
  const removeRestaurant = async (
    kakaoPlaceId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Optimistic update: remove item from both lists
    const visitedSnapshot = getCache<SubcategoryGroup[]>(VISITED_KEY);
    const wishlistSnapshot = getCache<SubcategoryGroup[]>(WISHLIST_KEY);

    const removeFromGroups = (groups: SubcategoryGroup[]) =>
      groups
        .map((group) => {
          const filtered = group.restaurants.filter((r) => r.id !== kakaoPlaceId);
          return { ...group, restaurants: filtered, count: filtered.length };
        })
        .filter((g) => g.count > 0);

    if (visitedSnapshot) setCache(VISITED_KEY, removeFromGroups(visitedSnapshot));
    if (wishlistSnapshot) setCache(WISHLIST_KEY, removeFromGroups(wishlistSnapshot));

    try {
      const { error } = await supabase
        .from("restaurants")
        .delete()
        .eq("user_id", user.id)
        .eq("kakao_place_id", kakaoPlaceId);
      if (error) {
        if (visitedSnapshot) setCache(VISITED_KEY, visitedSnapshot);
        if (wishlistSnapshot) setCache(WISHLIST_KEY, wishlistSnapshot);
        onError?.(error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e) {
      if (visitedSnapshot) setCache(VISITED_KEY, visitedSnapshot);
      if (wishlistSnapshot) setCache(WISHLIST_KEY, wishlistSnapshot);
      const msg = e instanceof Error ? e.message : "Unknown error";
      onError?.(msg);
      return { success: false, error: msg };
    } finally {
      invalidateRestaurants();
    }
  };
  return { removeRestaurant };
}

export function useUpdateStarRating(onError?: (msg: string) => void) {
  const updateStarRating = async (
    kakaoPlaceId: string,
    rating: 1 | 2 | 3 | 4 | 5,
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Optimistic update: snapshot → apply → server → rollback on error
    const visitedSnapshot = getCache<SubcategoryGroup[]>(VISITED_KEY);
    if (visitedSnapshot) {
      const optimistic = visitedSnapshot.map((group) => ({
        ...group,
        restaurants: group.restaurants.map((r) =>
          r.id === kakaoPlaceId ? { ...r, starRating: rating } : r,
        ),
      }));
      setCache(VISITED_KEY, optimistic);
    }

    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ star_rating: rating })
        .eq("user_id", user.id)
        .eq("kakao_place_id", kakaoPlaceId);
      if (error) {
        if (visitedSnapshot) setCache(VISITED_KEY, visitedSnapshot);
        onError?.(error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e) {
      if (visitedSnapshot) setCache(VISITED_KEY, visitedSnapshot);
      const msg = e instanceof Error ? e.message : "Unknown error";
      onError?.(msg);
      return { success: false, error: msg };
    } finally {
      invalidateRestaurants();
      invalidate(`${RESTAURANTS_KEY}:${kakaoPlaceId}`);
    }
  };
  return { updateStarRating };
}

export function useMarkAsVisited(onError?: (msg: string) => void) {
  const markAsVisited = async (
    kakaoPlaceId: string,
    rating: 1 | 2 | 3 | 4 | 5,
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Optimistic update: move item from wishlist to visited
    const wishlistSnapshot = getCache<SubcategoryGroup[]>(WISHLIST_KEY);
    const visitedSnapshot = getCache<SubcategoryGroup[]>(VISITED_KEY);
    if (wishlistSnapshot) {
      let movedItem: Restaurant | undefined;
      const optimisticWishlist = wishlistSnapshot
        .map((group) => {
          const filtered = group.restaurants.filter((r) => {
            if (r.id === kakaoPlaceId) {
              movedItem = { ...r, starRating: rating };
              return false;
            }
            return true;
          });
          return { ...group, restaurants: filtered, count: filtered.length };
        })
        .filter((g) => g.count > 0);
      setCache(WISHLIST_KEY, optimisticWishlist);

      if (movedItem && visitedSnapshot) {
        const optimisticVisited = visitedSnapshot.map((group) => ({
          ...group,
          restaurants: [...group.restaurants],
        }));
        // Add to first group or create a new one
        if (optimisticVisited.length > 0) {
          optimisticVisited[0] = {
            ...optimisticVisited[0],
            restaurants: [movedItem, ...optimisticVisited[0].restaurants],
            count: optimisticVisited[0].count + 1,
          };
        }
        setCache(VISITED_KEY, optimisticVisited);
      }
    }

    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ star_rating: rating })
        .eq("user_id", user.id)
        .eq("kakao_place_id", kakaoPlaceId);
      if (error) {
        if (wishlistSnapshot) setCache(WISHLIST_KEY, wishlistSnapshot);
        if (visitedSnapshot) setCache(VISITED_KEY, visitedSnapshot);
        onError?.(error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e) {
      if (wishlistSnapshot) setCache(WISHLIST_KEY, wishlistSnapshot);
      if (visitedSnapshot) setCache(VISITED_KEY, visitedSnapshot);
      const msg = e instanceof Error ? e.message : "Unknown error";
      onError?.(msg);
      return { success: false, error: msg };
    } finally {
      invalidateRestaurants();
      invalidate(`wishlisted:${kakaoPlaceId}`);
    }
  };
  return { markAsVisited };
}

export function useMoveToWishlist(onError?: (msg: string) => void) {
  const moveToWishlist = async (
    kakaoPlaceId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Optimistic update: move item from visited to wishlist
    const visitedSnapshot = getCache<SubcategoryGroup[]>(VISITED_KEY);
    const wishlistSnapshot = getCache<SubcategoryGroup[]>(WISHLIST_KEY);
    if (visitedSnapshot) {
      let movedItem: Restaurant | undefined;
      const optimisticVisited = visitedSnapshot
        .map((group) => {
          const filtered = group.restaurants.filter((r) => {
            if (r.id === kakaoPlaceId) {
              movedItem = { ...r, starRating: null };
              return false;
            }
            return true;
          });
          return { ...group, restaurants: filtered, count: filtered.length };
        })
        .filter((g) => g.count > 0);
      setCache(VISITED_KEY, optimisticVisited);

      if (movedItem && wishlistSnapshot) {
        const optimisticWishlist = wishlistSnapshot.map((group) => ({
          ...group,
          restaurants: [...group.restaurants],
        }));
        if (optimisticWishlist.length > 0) {
          optimisticWishlist[0] = {
            ...optimisticWishlist[0],
            restaurants: [movedItem, ...optimisticWishlist[0].restaurants],
            count: optimisticWishlist[0].count + 1,
          };
        }
        setCache(WISHLIST_KEY, optimisticWishlist);
      }
    }

    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ star_rating: null })
        .eq("user_id", user.id)
        .eq("kakao_place_id", kakaoPlaceId);
      if (error) {
        if (visitedSnapshot) setCache(VISITED_KEY, visitedSnapshot);
        if (wishlistSnapshot) setCache(WISHLIST_KEY, wishlistSnapshot);
        onError?.(error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e) {
      if (visitedSnapshot) setCache(VISITED_KEY, visitedSnapshot);
      if (wishlistSnapshot) setCache(WISHLIST_KEY, wishlistSnapshot);
      const msg = e instanceof Error ? e.message : "Unknown error";
      onError?.(msg);
      return { success: false, error: msg };
    } finally {
      invalidateRestaurants();
      invalidate(`wishlisted:${kakaoPlaceId}`);
    }
  };
  return { moveToWishlist };
}

export function useIsWishlisted(kakaoPlaceId: string): boolean {
  const { data } = useSupabaseQuery<boolean>(
    `wishlisted:${kakaoPlaceId}`,
    async () => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { count, error } = await supabase
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("kakao_place_id", kakaoPlaceId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    [kakaoPlaceId],
  );
  return data ?? false;
}
