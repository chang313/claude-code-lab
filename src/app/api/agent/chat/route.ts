import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { APIError } from "groq-sdk";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/types";

const MAX_MESSAGES = 20;
const TOKEN_LIMIT = 6000;
const MAX_COMPLETION_TOKENS = 1024;
const SAFETY_MARGIN = 200;

interface DbPlace {
  kakao_place_id: string;
  name: string;
  category: string;
  address: string;
  star_rating: number | null;
  place_url: string | null;
}

/** Conservative token estimate: ~1 token per 2 chars for Korean-heavy JSON in LLaMA 3.1 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 2);
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

// Measured: estimateTokens(SYSTEM_PROMPT_TEMPLATE) + 10% buffer, rounded up to nearest 10
const SYSTEM_INSTRUCTION_TOKENS =
  Math.ceil((estimateTokens(SYSTEM_PROMPT_TEMPLATE) * 1.1) / 10) * 10;

function buildSystemPrompt(places: DbPlace[], availableTokens: number): string {
  // Sort: starred first (descending by rating), then unstarred preserving original order
  const sorted = [...places].sort((a, b) => {
    const aStarred = a.star_rating !== null;
    const bStarred = b.star_rating !== null;
    if (aStarred && !bStarred) return -1;
    if (!aStarred && bStarred) return 1;
    if (aStarred && bStarred) return (b.star_rating ?? 0) - (a.star_rating ?? 0);
    return 0; // preserve DB order for unstarred
  });

  const included: { id: string; name: string; category: string; address: string; star_rating: number | null }[] = [];
  let usedTokens = 20; // JSON array overhead (brackets, commas, whitespace)

  for (const p of sorted) {
    const entry = {
      id: p.kakao_place_id,
      name: p.name,
      category: p.category,
      address: p.address,
      star_rating: p.star_rating,
    };
    const entryTokens = estimateTokens(JSON.stringify(entry));
    if (usedTokens + entryTokens > availableTokens) break;
    included.push(entry);
    usedTokens += entryTokens;
  }

  const truncationNote =
    included.length < places.length
      ? `\nNote: You can only see ${included.length} of the user's ${places.length} saved places due to context limits. If the user asks about places you can't see, let them know you can only search within the visible list.`
      : "";

  return `${SYSTEM_PROMPT_TEMPLATE}${truncationNote}

User's saved places:
${JSON.stringify(included)}`;
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

  // Trim to last N messages
  const trimmedMessages = messages.slice(-MAX_MESSAGES);

  // Calculate token budget for places
  const conversationTokens = trimmedMessages.reduce(
    (sum, m) => sum + estimateTokens(m.content),
    0,
  );
  const placesBudget =
    TOKEN_LIMIT -
    MAX_COMPLETION_TOKENS -
    SAFETY_MARGIN -
    SYSTEM_INSTRUCTION_TOKENS -
    conversationTokens;

  if (placesBudget < 200) {
    return NextResponse.json(
      { error: "conversation_too_long", code: "BUDGET_EXCEEDED" },
      { status: 413 },
    );
  }

  const systemPrompt = buildSystemPrompt(places as DbPlace[], placesBudget);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let stream;
  try {
    const groq = new Groq({ apiKey });
    stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream: true,
      temperature: 0.5,
      max_tokens: MAX_COMPLETION_TOKENS,
    });
  } catch (err) {
    if (err instanceof APIError && (err.status === 400 || err.status === 413 || err.status === 429)) {
      console.warn("[chat] Groq rate/size limit hit", {
        status: err.status,
        estimatedSystemTokens: estimateTokens(systemPrompt),
        conversationTokens,
        placesBudget,
      });
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
