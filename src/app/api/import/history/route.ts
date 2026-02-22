import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  const { data: batches, error } = await supabase
    .from("import_batches")
    .select(
      "id, source_name, imported_count, skipped_count, invalid_count, enrichment_status, enriched_count, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "FETCH_FAILED", message: "기록을 불러올 수 없습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    batches: (batches ?? []).map((b) => ({
      id: b.id,
      sourceName: b.source_name,
      importedCount: b.imported_count,
      skippedCount: b.skipped_count,
      invalidCount: b.invalid_count,
      enrichmentStatus: b.enrichment_status,
      enrichedCount: b.enriched_count,
      createdAt: b.created_at,
    })),
  });
}
