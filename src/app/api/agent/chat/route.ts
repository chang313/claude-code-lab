import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/types";

const MAX_MESSAGES = 20;

interface DbPlace {
  kakao_place_id: string;
  name: string;
  category: string;
  address: string;
  star_rating: number | null;
  place_url: string | null;
}

/** Extract the cuisine group key from a full category path like "음식점 > 한식 > 삼겹살" → "한식" */
function extractCuisine(category: string): string {
  const parts = category.split(" > ");
  return parts.length >= 2 ? parts[1] : parts[0];
}

/** Group places by cuisine for structured presentation */
function groupPlacesByCuisine(places: DbPlace[]): Map<string, DbPlace[]> {
  const groups = new Map<string, DbPlace[]>();
  for (const p of places) {
    const cuisine = extractCuisine(p.category);
    const list = groups.get(cuisine) ?? [];
    list.push(p);
    groups.set(cuisine, list);
  }
  return groups;
}

/** Format a single place as a readable line */
function formatPlace(p: DbPlace): string {
  const rating =
    p.star_rating !== null ? `★${p.star_rating}` : "아직 안 가봄";
  const area = p.address.split(" ").slice(0, 3).join(" ");
  return `- ${p.name} (id:${p.kakao_place_id}) | ${area} | ${rating}`;
}

// Exported for testing
export { extractCuisine, groupPlacesByCuisine, formatPlace };
export type { DbPlace };

const SYSTEM_PROMPT_TEMPLATE = `당신은 사용자의 맛집 리스트에서 딱 맞는 곳을 골라주는 한국어 맛집 추천 어시스턴트입니다.

## 핵심 규칙
1. 반드시 아래 "저장된 맛집" 목록에서만 추천하세요
2. 장소를 언급할 때 반드시 <<장소명:id>> 마커를 포함하세요
3. 한국어로 답변하세요
4. 2~3곳 추천 (더 달라고 하면 더 많이)

## 추천 품질 가이드
- 별점(★) 높은 곳을 우선 추천하되, 질문 맥락에 맞는 곳이 더 중요합니다
- "아직 안 가봄" = 위시리스트 (가보고 싶어서 저장한 곳). 새로운 곳을 원할 때 추천하세요
- 각 추천마다 왜 이 곳인지 한 줄 이유를 덧붙이세요 (카테고리, 별점, 위치 등)
- 주소에서 지역(강남, 홍대, 성수 등)을 파악해 "근처", "○○ 쪽" 질문에 활용하세요

## 질문 유형별 대응
- 음식 종류 ("치킨", "초밥"): 해당 카테고리에서 찾기
- 기분/상황 ("매운 거", "가벼운 거", "혼밥"): 아래 매핑 참고
- 별점 기반 ("맛있었던 곳", "별점 높은 곳"): ★4~5 우선
- 지역 ("강남에서", "집 근처"): 주소 매칭
- 탐색 ("새로운 곳", "안 가본 곳"): 아직 안 가봄 목록에서
- 모호한 질문 ("오늘 뭐 먹지?"): 다양한 카테고리에서 골고루 추천

## 기분/상황 → 카테고리 매핑
- 매운 거: 떡볶이, 마라, 닭발, 불닭, 짬뽕, 낙곱새
- 가벼운 거: 샐러드, 포케, 샌드위치, 카페, 베이커리
- 든든한 거: 한식, 국밥, 찌개, 백반, 고기
- 분위기 좋은/데이트: 이탈리안, 프렌치, 와인바, 오마카세
- 혼밥: 라멘, 덮밥, 국밥, 김밥, 1인 가능한 곳
- 회식/모임: 고깃집, 삼겹살, 치킨, 포차

## 마커 형식
장소를 언급할 때: <<장소명:id>>
예시: "삼겹살이 드시고 싶으시면 <<돼지한마리 역삼점:12345678>>을 추천드려요! ★4점으로 직접 높게 평가하셨어요."

## 대화 예시

사용자: 매운 거 먹고 싶어
어시스턴트: 매운 음식이 땡기시는군요! 🌶️

1. <<엽기떡볶이 강남점:11111111>> - 직접 ★5점 주신 곳이에요! 떡볶이 맛집으로 검증 완료죠.
2. <<마라탕 홍대점:22222222>> - 아직 안 가보셨는데, 마라 좋아하시면 도전해보세요!

혹시 매운 정도 선호가 있으시면 말씀해주세요 😊

사용자: 오늘 뭐 먹지?
어시스턴트: 오늘 뭘 드실지 고민이시군요! 다양한 장르에서 골라봤어요:

1. <<스시오마카세 성수:33333333>> - ★5점! 특별한 날 아니어도 가볼 만한 곳이에요.
2. <<백반집 을지로:44444444>> - 든든한 한 끼 원하시면 여기! ★4점 주셨죠.
3. <<포케올데이 삼성:55555555>> - 가볍게 드시고 싶다면 이 곳도 좋아요.

어떤 스타일이 끌리세요? 🤔`;

function buildSystemPrompt(places: DbPlace[]): string {
  // Sort: starred first (descending by rating), then unstarred preserving original order
  const sorted = [...places].sort((a, b) => {
    const aStarred = a.star_rating !== null;
    const bStarred = b.star_rating !== null;
    if (aStarred && !bStarred) return -1;
    if (!aStarred && bStarred) return 1;
    if (aStarred && bStarred) return (b.star_rating ?? 0) - (a.star_rating ?? 0);
    return 0;
  });

  // Build structured place list grouped by cuisine
  const groups = groupPlacesByCuisine(sorted);
  const structuredList = Array.from(groups.entries())
    .map(([cuisine, items]) => {
      const lines = items.map(formatPlace).join("\n");
      return `[${cuisine}]\n${lines}`;
    })
    .join("\n\n");

  return `${SYSTEM_PROMPT_TEMPLATE}

## 저장된 맛집 (${sorted.length}개)
${structuredList}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const messages: ChatMessage[] = body.messages;

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: "Messages required" },
      { status: 400 },
    );
  }

  // Fetch user's saved places
  const { data: places, error: dbError } = await supabase
    .from("restaurants")
    .select("kakao_place_id, name, category, address, star_rating, place_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 },
    );
  }

  const trimmedMessages = messages.slice(-MAX_MESSAGES);
  const systemPrompt = buildSystemPrompt(places as DbPlace[]);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let stream;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = trimmedMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 400 || status === 429) {
      console.warn("[chat] Gemini rate/size limit hit", { status });
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Failed to connect to AI service" },
      { status: 502 },
    );
  }

  // Convert Gemini stream to SSE ReadableStream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.text;
          if (content) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Stream error" })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
