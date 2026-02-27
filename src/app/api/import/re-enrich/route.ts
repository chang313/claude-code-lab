import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichBatch } from "@/lib/enrichment";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  // Find all uncategorized restaurants for this user
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("kakao_place_id, name, lat, lng, category, address")
    .eq("user_id", user.id)
    .eq("category", "");

  if (!restaurants || restaurants.length === 0) {
    return NextResponse.json(
      { status: "no_action", restaurantCount: 0 },
      { status: 200 },
    );
  }

  // Fire-and-forget: run improved enrichment on all uncategorized restaurants
  enrichBatch(
    null,
    restaurants as Array<{
      kakao_place_id: string;
      name: string;
      lat: number;
      lng: number;
      category: string;
      address: string;
    }>,
    supabase,
    user.id,
  ).catch(() => {
    // Retroactive enrichment is best-effort — no batch to mark as failed
  });

  return NextResponse.json(
    { status: "started", restaurantCount: restaurants.length },
    { status: 202 },
  );
}
