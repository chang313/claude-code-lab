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

const SYSTEM_PROMPT_TEMPLATE = `You are a friendly Korean restaurant recommendation assistant.
The user has saved the following places. ONLY recommend from this list.

When mentioning a place, you MUST include its marker like this: <<place_name:kakao_place_id>>
For example: "맛있는 치킨을 드시려면 <<교촌치킨 강남점:12345678>>을 추천드려요!"

Rules:
- Answer in Korean
- Only recommend places from the user's saved list below
- Include <<place_name:id>> marker (using the exact name and id from the list below) right after mentioning each place
- If the user's request is unclear, ask a clarifying question
- Consider star_rating (null=wishlist/not yet visited, 1-5=visited rating)
- Be concise: 2-3 recommendations max unless asked for more`;

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

  const placeList = sorted.map((p) => ({
    id: p.kakao_place_id,
    name: p.name,
    category: p.category,
    address: p.address,
    star_rating: p.star_rating,
  }));

  return `${SYSTEM_PROMPT_TEMPLATE}

User's saved places:
${JSON.stringify(placeList)}`;
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
    // Build contents array: conversation history with role mapping
    const contents = trimmedMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5,
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
