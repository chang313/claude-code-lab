import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { makeNaverPlaceId } from "@/types";
import { haversineDistance } from "@/lib/haversine";

interface BookmarkPayload {
  name: string;
  lat: number;
  lng: number;
  address: string;
}

const MAX_BOOKMARKS = 1000;
const DUPLICATE_RADIUS_M = 50;

function isValidBookmark(b: BookmarkPayload): boolean {
  return (
    typeof b.name === "string" &&
    b.name.trim().length > 0 &&
    typeof b.lat === "number" &&
    b.lat >= -90 &&
    b.lat <= 90 &&
    typeof b.lng === "number" &&
    b.lng >= -180 &&
    b.lng <= 180
  );
}

export async function POST(request: Request) {
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

  let body: { shareId?: string; sourceName?: string; bookmarks?: BookmarkPayload[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "잘못된 요청입니다." },
      { status: 400 },
    );
  }

  const { shareId, sourceName, bookmarks } = body;
  if (!shareId || !Array.isArray(bookmarks)) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "잘못된 요청입니다." },
      { status: 400 },
    );
  }

  // Validate and separate valid/invalid bookmarks
  const truncated = bookmarks.slice(0, MAX_BOOKMARKS);
  const validBookmarks: BookmarkPayload[] = [];
  let invalidCount = 0;
  for (const b of truncated) {
    if (isValidBookmark(b)) {
      validBookmarks.push(b);
    } else {
      invalidCount++;
    }
  }

  // Create import batch
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      user_id: user.id,
      source_name: sourceName || shareId,
      share_id: shareId,
      imported_count: 0,
      skipped_count: 0,
      invalid_count: invalidCount,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return NextResponse.json(
      { error: "SAVE_FAILED", message: "저장에 실패했습니다." },
      { status: 500 },
    );
  }

  // Fetch existing restaurants for duplicate detection
  const { data: existing } = await supabase
    .from("restaurants")
    .select("name, lat, lng")
    .eq("user_id", user.id);

  const existingRestaurants = (existing ?? []) as Array<{
    name: string;
    lat: number;
    lng: number;
  }>;

  // Duplicate detection: name match + within 50m
  const toInsert: BookmarkPayload[] = [];
  let skippedCount = 0;
  for (const bm of validBookmarks) {
    const isDuplicate = existingRestaurants.some(
      (ex) =>
        ex.name === bm.name &&
        haversineDistance(ex.lat, ex.lng, bm.lat, bm.lng) < DUPLICATE_RADIUS_M,
    );
    if (isDuplicate) {
      skippedCount++;
    } else {
      toInsert.push(bm);
    }
  }

  // Bulk insert non-duplicates
  if (toInsert.length > 0) {
    const rows = toInsert.map((bm) => ({
      user_id: user.id,
      kakao_place_id: makeNaverPlaceId(bm.lat, bm.lng),
      name: bm.name.trim(),
      address: bm.address || "",
      category: "",
      lat: bm.lat,
      lng: bm.lng,
      place_url: null,
      star_rating: null,
      import_batch_id: batch.id,
    }));

    const { error: insertError } = await supabase
      .from("restaurants")
      .insert(rows);

    if (insertError) {
      return NextResponse.json(
        { error: "SAVE_FAILED", message: "저장에 실패했습니다." },
        { status: 500 },
      );
    }
  }

  // Update batch counts
  await supabase
    .from("import_batches")
    .update({
      imported_count: toInsert.length,
      skipped_count: skippedCount,
      invalid_count: invalidCount,
    })
    .eq("id", batch.id);

  return NextResponse.json({
    batchId: batch.id,
    importedCount: toInsert.length,
    skippedCount,
    invalidCount,
    totalCount: validBookmarks.length + invalidCount,
  });
}
