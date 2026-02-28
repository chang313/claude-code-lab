import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecommendations } from "@/lib/recommendation-engine";

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

  try {
    const result = await generateRecommendations(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Recommendation generation failed:", error);
    return NextResponse.json(
      { error: "GENERATION_FAILED", message: "추천 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
