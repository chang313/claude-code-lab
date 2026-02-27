import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichBatch } from "@/lib/enrichment";

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

  let body: { batchId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "잘못된 요청입니다." },
      { status: 400 },
    );
  }

  const { batchId } = body;
  if (!batchId) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "잘못된 요청입니다." },
      { status: 400 },
    );
  }

  // Validate batch exists and belongs to user
  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, user_id")
    .eq("id", batchId)
    .single();

  if (!batch || batch.user_id !== user.id) {
    return NextResponse.json(
      { error: "BATCH_NOT_FOUND", message: "가져오기 기록을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // Set status to running
  await supabase
    .from("import_batches")
    .update({ enrichment_status: "running" })
    .eq("id", batchId);

  // Query restaurants with synthetic kakao_place_id for this batch (include category for idempotent skip)
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("kakao_place_id, name, lat, lng, category, address")
    .eq("import_batch_id", batchId)
    .like("kakao_place_id", "naver_%");

  // Fire-and-forget: do NOT await
  if (restaurants && restaurants.length > 0) {
    enrichBatch(
      batchId,
      restaurants as Array<{ kakao_place_id: string; name: string; lat: number; lng: number; category: string; address: string }>,
      supabase,
      user.id,
    ).catch(async () => {
      // If enrichment fails entirely, mark batch as failed
      await supabase
        .from("import_batches")
        .update({ enrichment_status: "failed" })
        .eq("id", batchId);
    });
  } else {
    // No restaurants to enrich
    await supabase
      .from("import_batches")
      .update({ enrichment_status: "completed", enriched_count: 0 })
      .eq("id", batchId);
  }

  return NextResponse.json({ status: "started", batchId }, { status: 202 });
}
