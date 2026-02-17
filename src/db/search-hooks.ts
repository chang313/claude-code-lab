"use client";

import { createClient } from "@/lib/supabase/client";
import { useSupabaseQuery } from "@/lib/supabase/use-query";

function getSupabase() {
  return createClient();
}

export function useIsWishlistedSet(ids: string[]): Set<string> {
  const stableKey = [...ids].sort().join(",");
  const { data } = useSupabaseQuery<Set<string>>(
    `wishlisted-set:${stableKey}`,
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
    [stableKey],
  );
  return data ?? new Set();
}
