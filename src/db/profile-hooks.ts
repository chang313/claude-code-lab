"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery } from "@/lib/supabase/use-query";
import { invalidate } from "@/lib/supabase/invalidate";
import { groupBySubcategory } from "@/lib/subcategory";
import type {
  DbProfile,
  UserProfile,
  UserProfileWithCounts,
  SubcategoryGroup,
  Restaurant,
} from "@/types";
import { mapDbProfile } from "@/types";

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

// === Profile Queries ===

export function useProfile(userId: string) {
  const { data, isLoading } = useSupabaseQuery<UserProfile | null>(
    `profile:${userId}`,
    async () => {
      const { data, error } = await getSupabase()
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapDbProfile(data as DbProfile) : null;
    },
    [userId],
  );
  return { profile: data ?? null, isLoading };
}

export function useProfileWithCounts(userId: string) {
  const { data, isLoading } = useSupabaseQuery<UserProfileWithCounts | null>(
    `profile-counts:${userId}`,
    async () => {
      const supabase = getSupabase();
      const [profileRes, followersRes, followingRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("followed_id", userId),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (!profileRes.data) return null;
      const profile = mapDbProfile(profileRes.data as DbProfile);
      return {
        ...profile,
        followerCount: followersRes.count ?? 0,
        followingCount: followingRes.count ?? 0,
      };
    },
    [userId],
  );
  return { profile: data ?? null, isLoading };
}

// === User Search ===

export function useSearchUsers(query: string) {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let queryBuilder = supabase
        .from("profiles")
        .select("*")
        .ilike("display_name", `%${q}%`)
        .order("display_name", { ascending: true })
        .range(0, 19);
      if (user) {
        queryBuilder = queryBuilder.neq("id", user.id);
      }
      const { data, error } = await queryBuilder;
      if (error) throw error;
      setResults((data as DbProfile[]).map(mapDbProfile));
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  return { results, isLoading };
}

// === User's Restaurants (cross-user read) ===

export function useUserRestaurants(userId: string) {
  const { data, isLoading } = useSupabaseQuery<Restaurant[]>(
    `restaurants:${userId}`,
    async () => {
      const { data, error } = await getSupabase()
        .from("restaurants")
        .select("*")
        .eq("user_id", userId)
        .order("star_rating", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as DbRestaurant[]).map(mapDbRestaurant);
    },
    [userId],
  );
  return { restaurants: data ?? [], isLoading };
}

export function useUserVisitedGrouped(userId: string) {
  const { data, isLoading } = useSupabaseQuery<SubcategoryGroup[]>(
    `restaurants:visited:${userId}`,
    async () => {
      const { data, error } = await getSupabase()
        .from("restaurants")
        .select("*")
        .eq("user_id", userId)
        .not("star_rating", "is", null)
        .order("star_rating", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const restaurants = (data as DbRestaurant[]).map(mapDbRestaurant);
      return groupBySubcategory(restaurants);
    },
    [userId],
  );
  return { groups: data ?? [], isLoading };
}

export function useUserWishlistGrouped(userId: string) {
  const { data, isLoading } = useSupabaseQuery<SubcategoryGroup[]>(
    `restaurants:wishlist:${userId}`,
    async () => {
      const { data, error } = await getSupabase()
        .from("restaurants")
        .select("*")
        .eq("user_id", userId)
        .is("star_rating", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const restaurants = (data as DbRestaurant[]).map(mapDbRestaurant);
      return groupBySubcategory(restaurants);
    },
    [userId],
  );
  return { groups: data ?? [], isLoading };
}
