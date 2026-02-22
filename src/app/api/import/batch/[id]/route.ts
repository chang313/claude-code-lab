import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: batchId } = await params;
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

  // Count preserved (rated) restaurants before deletion
  const { count: preservedCount } = await supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true })
    .eq("import_batch_id", batchId)
    .not("star_rating", "is", null);

  // Delete unrated restaurants from this batch
  const { count: removedCount } = await supabase
    .from("restaurants")
    .delete({ count: "exact" })
    .eq("import_batch_id", batchId)
    .is("star_rating", null);

  // Delete the batch record
  await supabase.from("import_batches").delete().eq("id", batchId);

  return NextResponse.json({
    removedCount: removedCount ?? 0,
    preservedCount: preservedCount ?? 0,
  });
}
