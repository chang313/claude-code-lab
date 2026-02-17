"use client";

import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery } from "@/lib/supabase/use-query";
import { invalidate } from "@/lib/supabase/invalidate";
import type { DbProfile, UserProfile } from "@/types";
import { mapDbProfile } from "@/types";

function getSupabase() {
  return createClient();
}

// === Follow / Unfollow Mutations ===

export function useFollowUser() {
  const followUser = async (followedId: string): Promise<boolean> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("follows").insert({
      follower_id: user.id,
      followed_id: followedId,
    });

    if (error) {
      if (error.code === "23505") return false; // already following
      throw error;
    }

    invalidate(`followers:${followedId}`);
    invalidate(`following:${user.id}`);
    invalidate(`profile-counts:${followedId}`);
    invalidate(`profile-counts:${user.id}`);
    invalidate(`is-following:${user.id}:${followedId}`);
    return true;
  };
  return { followUser };
}

export function useUnfollowUser() {
  const unfollowUser = async (followedId: string): Promise<boolean> => {
    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followed_id", followedId);

    if (error) throw error;

    invalidate(`followers:${followedId}`);
    invalidate(`following:${user.id}`);
    invalidate(`profile-counts:${followedId}`);
    invalidate(`profile-counts:${user.id}`);
    invalidate(`is-following:${user.id}:${followedId}`);
    return true;
  };
  return { unfollowUser };
}

// === Follow Status Query ===

export function useIsFollowing(followedId: string) {
  const { data, isLoading } = useSupabaseQuery<boolean>(
    `is-following:current:${followedId}`,
    async () => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("followed_id", followedId)
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },
    [followedId],
  );
  return { isFollowing: data ?? false, isLoading };
}

// === Followers / Following Lists ===

export function useFollowers(userId: string, limit = 20) {
  const { data, isLoading } = useSupabaseQuery<UserProfile[]>(
    `followers:${userId}`,
    async () => {
      const { data, error } = await getSupabase()
        .from("follows")
        .select("follower_id, created_at, profiles!follows_follower_id_fkey(*)")
        .eq("followed_id", userId)
        .order("created_at", { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;
      return (data ?? [])
        .map((row: Record<string, unknown>) => {
          const profile = row.profiles as DbProfile | null;
          return profile ? mapDbProfile(profile) : null;
        })
        .filter((p): p is UserProfile => p !== null);
    },
    [userId, limit],
  );
  return { followers: data ?? [], isLoading };
}

export function useFollowing(userId: string, limit = 20) {
  const { data, isLoading } = useSupabaseQuery<UserProfile[]>(
    `following:${userId}`,
    async () => {
      const { data, error } = await getSupabase()
        .from("follows")
        .select(
          "followed_id, created_at, profiles!follows_followed_id_fkey(*)",
        )
        .eq("follower_id", userId)
        .order("created_at", { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;
      return (data ?? [])
        .map((row: Record<string, unknown>) => {
          const profile = row.profiles as DbProfile | null;
          return profile ? mapDbProfile(profile) : null;
        })
        .filter((p): p is UserProfile => p !== null);
    },
    [userId, limit],
  );
  return { following: data ?? [], isLoading };
}
