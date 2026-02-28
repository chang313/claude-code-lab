import { NextResponse } from "next/server";
import Groq from "groq-sdk";
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

function buildSystemPrompt(places: DbPlace[]): string {
  const placeList = places.map((p) => ({
    id: p.kakao_place_id,
    name: p.name,
    category: p.category,
    address: p.address,
    star_rating: p.star_rating,
  }));

  return `You are a friendly Korean restaurant recommendation assistant.
The user has saved the following places. ONLY recommend from this list.

When recommending a place, you MUST include its marker right after the place name: <<PLACE:kakao_place_id>>

Rules:
- Answer in Korean
- Only recommend places from the user's saved list below
- Include <<PLACE:id>> marker right after mentioning each place name
- If the user's request is unclear, ask a clarifying question
- Consider star_rating (null=wishlist/not yet visited, 1-5=visited rating)
- Be concise: 2-3 recommendations max unless asked for more

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

  const systemPrompt = buildSystemPrompt(places as DbPlace[]);

  // Trim to last N messages
  const trimmedMessages = messages.slice(-MAX_MESSAGES);

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const stream = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      ...trimmedMessages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    temperature: 0.5,
    max_tokens: 1024,
  });

  // Convert Groq stream to SSE ReadableStream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
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
