"use client";

import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery } from "@/lib/supabase/use-query";
import { invalidate } from "@/lib/supabase/invalidate";
import type {
  DbProfile,
  DbRecommendation,
  Recommendation,
  RecommendationWithSender,
  UserProfile,
  Restaurant,
} from "@/types";
import { mapDbProfile, mapDbRecommendation } from "@/types";

function getSupabase() {
  return createClient();
}

const RECEIVED_KEY = "recommendations:received";
const UNREAD_COUNT_KEY = "recommendations:unread-count";
const SENT_KEY = "recommendations:sent";
const RESTAURANTS_KEY = "restaurants";

// === Mutual Followers ===

export function useMutualFollowers() {
  const { data, isLoading } = useSupabaseQuery<UserProfile[]>(
    "mutual-followers",
    async () => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_mutual_followers", {
        target_user_id: user.id,
      });
      if (error) throw error;
      return ((data as DbProfile[]) ?? []).map(mapDbProfile);
    },
  );
  return { mutualFollowers: data ?? [], isLoading };
}

// === Send Recommendation ===

export function useSendRecommendation() {
  const sendRecommendation = async (
    recipientId: string,
    restaurant: Restaurant,
  ): Promise<boolean> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("recommendations").insert({
      sender_id: user.id,
      recipient_id: recipientId,
      kakao_place_id: restaurant.id,
      restaurant_name: restaurant.name,
      restaurant_category: restaurant.category,
      restaurant_address: restaurant.address,
      restaurant_lat: restaurant.lat,
      restaurant_lng: restaurant.lng,
      restaurant_place_url: restaurant.placeUrl ?? null,
    });

    if (error) {
      if (error.code === "23505") return false; // duplicate pending
      throw error;
    }

    invalidate(SENT_KEY);
    return true;
  };
  return { sendRecommendation };
}

// === Received Recommendations (Inbox) ===

export function useReceivedRecommendations() {
  const { data, isLoading } = useSupabaseQuery<RecommendationWithSender[]>(
    RECEIVED_KEY,
    async () => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("recommendations")
        .select("*, profiles!recommendations_sender_id_fkey(*)")
        .eq("recipient_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data as (DbRecommendation & { profiles: DbProfile })[]) ?? [])
        .map((row) => ({
          ...mapDbRecommendation(row),
          sender: mapDbProfile(row.profiles),
        }));
    },
  );
  return { recommendations: data ?? [], isLoading };
}

// === Unread Count (Badge) ===

export function useUnreadRecommendationCount() {
  const { data, isLoading } = useSupabaseQuery<number>(
    UNREAD_COUNT_KEY,
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc(
        "get_unread_recommendation_count",
      );
      if (error) throw error;
      return (data as number) ?? 0;
    },
  );
  return { count: data ?? 0, isLoading };
}

// === Accept Recommendation ===

export function useAcceptRecommendation() {
  const acceptRecommendation = async (
    recommendation: Recommendation,
  ): Promise<boolean> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const now = new Date().toISOString();

    // 1. Mark this recommendation as accepted
    const { error: updateError } = await supabase
      .from("recommendations")
      .update({ status: "accepted", resolved_at: now })
      .eq("id", recommendation.id);
    if (updateError) throw updateError;

    // 2. Add restaurant to user's wishlist
    const { error: insertError } = await supabase.from("restaurants").insert({
      user_id: user.id,
      kakao_place_id: recommendation.kakaoPlaceId,
      name: recommendation.restaurantName,
      address: recommendation.restaurantAddress,
      category: recommendation.restaurantCategory,
      lat: recommendation.restaurantLat,
      lng: recommendation.restaurantLng,
      place_url: recommendation.restaurantPlaceUrl,
      star_rating: 1,
    });

    // Ignore duplicate (already wishlisted)
    if (insertError && insertError.code !== "23505") throw insertError;

    // 3. Auto-dismiss other pending recommendations for same restaurant
    await supabase
      .from("recommendations")
      .update({ status: "ignored", resolved_at: now })
      .eq("recipient_id", user.id)
      .eq("kakao_place_id", recommendation.kakaoPlaceId)
      .eq("status", "pending")
      .neq("id", recommendation.id);

    invalidate(RECEIVED_KEY);
    invalidate(UNREAD_COUNT_KEY);
    invalidate(RESTAURANTS_KEY);
    return true;
  };
  return { acceptRecommendation };
}

// === Ignore Recommendation ===

export function useIgnoreRecommendation() {
  const ignoreRecommendation = async (
    recommendationId: string,
  ): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("recommendations")
      .update({
        status: "ignored",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", recommendationId);
    if (error) throw error;

    invalidate(RECEIVED_KEY);
    invalidate(UNREAD_COUNT_KEY);
  };
  return { ignoreRecommendation };
}

// === Mark Recommendations as Read ===

export function useMarkRecommendationsRead() {
  const markAsRead = async (): Promise<void> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("recommendations")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .eq("is_read", false);

    if (error) throw error;
    invalidate(UNREAD_COUNT_KEY);
  };
  return { markAsRead };
}

// === Sent Recommendations (History) ===

export function useSentRecommendations() {
  const { data, isLoading } = useSupabaseQuery<
    (Recommendation & { recipient: UserProfile })[]
  >(SENT_KEY, async () => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("recommendations")
      .select("*, profiles!recommendations_recipient_id_fkey(*)")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ((data as (DbRecommendation & { profiles: DbProfile })[]) ?? [])
      .map((row) => ({
        ...mapDbRecommendation(row),
        recipient: mapDbProfile(row.profiles),
      }));
  });
  return { sentRecommendations: data ?? [], isLoading };
}
