# Gemini Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Groq (LLaMA 3.1) with Google Gemini 2.5 Flash to eliminate the 6000 token-per-request limit causing multi-turn chat failures.

**Architecture:** Swap SDK in the single API route (`route.ts`), remove all token budget logic, update tests. Client-side code unchanged — SSE format stays the same.

**Tech Stack:** `@google/genai` (unified Google Gen AI SDK), Gemini 2.5 Flash model, Next.js API route

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/api/agent/chat/route.ts` | Modify | Replace Groq with Gemini SDK, remove token budgeting |
| `tests/unit/chat-api.test.ts` | Modify | Update mocks for Gemini SDK, remove budget tests |
| `package.json` | Modify | Swap `groq-sdk` → `@google/genai` |
| `.env.example` | Modify | Replace `GROQ_API_KEY` → `GEMINI_API_KEY` |

---

## Chunk 1: SDK Swap and Route Implementation

### Task 1: Swap dependencies

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Remove groq-sdk and add @google/genai**

Run from worktree root:
```bash
pnpm remove groq-sdk && pnpm add @google/genai
```

- [ ] **Step 2: Update .env.example**

Replace:
```
GROQ_API_KEY=your_groq_api_key_here
```
With:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 3: Update .env.local with real Gemini API key**

Get a key from https://aistudio.google.com/apikey and set it:
```
GEMINI_API_KEY=<real-key>
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: swap groq-sdk for @google/genai"
```

---

### Task 2: Rewrite route.ts for Gemini SDK

**Files:**
- Modify: `src/app/api/agent/chat/route.ts`

- [ ] **Step 1: Rewrite the route file**

Replace the entire file with:

```typescript
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
```

Key changes from the original:
- Removed: `TOKEN_LIMIT`, `MAX_COMPLETION_TOKENS`, `SAFETY_MARGIN`, `SYSTEM_INSTRUCTION_TOKENS`, `estimateTokens()`
- Removed: `placesBudget` calculation, `BUDGET_EXCEEDED` check, token-aware truncation in `buildSystemPrompt`
- Added: `GoogleGenAI` client, `generateContentStream` with `config.systemInstruction`
- Role mapping: `assistant` → `model` (Gemini uses "model" not "assistant")
- Stream: `chunk.text` instead of `chunk.choices[0]?.delta?.content`
- Error: check `.status` property on caught error (Gemini SDK sets this)

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /path/to/worktree && pnpm build
```
Expected: build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/agent/chat/route.ts
git commit -m "feat: migrate chat API from Groq LLaMA to Gemini 2.5 Flash"
```

---

## Chunk 2: Test Updates

### Task 3: Update tests for Gemini SDK

**Files:**
- Modify: `tests/unit/chat-api.test.ts`

- [ ] **Step 1: Rewrite the test file**

Replace the entire file with:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Gemini SDK
const mockGenerateContentStream = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContentStream: mockGenerateContentStream };
  },
}));

// Mock supabase server client
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}));

import { POST } from "@/app/api/agent/chat/route";

function makePlace(
  id: string,
  name: string,
  starRating: number | null = null,
) {
  return {
    kakao_place_id: id,
    name,
    category: "음식점 > 한식",
    address: "서울특별시 강남구",
    star_rating: starRating,
    place_url: null,
  };
}

function mockAuthAndPlaces(places: ReturnType<typeof makePlace>[]) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
  mockOrder.mockResolvedValue({ data: places, error: null });
  mockEq.mockReturnValue({ order: mockOrder });
  mockSelect.mockReturnValue({ eq: mockEq });
}

function mockGeminiStream(texts: string[]) {
  const chunks = texts.map((t) => ({ text: t }));
  mockGenerateContentStream.mockResolvedValue({
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) yield chunk;
    },
  });
}

function makeRequest(messages: { role: string; content: string }[]) {
  return new Request("http://localhost/api/agent/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
}

describe("POST /api/agent/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when messages array is empty", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const res = await POST(makeRequest([]));
    expect(res.status).toBe(400);
  });

  it("returns 500 when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("GEMINI_API_KEY");
  });

  it("returns streaming response for valid request", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    mockGeminiStream(["치킨집", " 추천!"]);

    const res = await POST(
      makeRequest([{ role: "user", content: "치킨 먹고싶어" }]),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const text = await res.text();
    expect(text).toContain("치킨집");
    expect(text).toContain("추천!");
  });

  it("prioritizes starred places over unstarred", async () => {
    const places = [
      makePlace("unstarred-1", "일반식당1"),
      makePlace("starred-5", "별점5식당", 5),
      makePlace("unstarred-2", "일반식당2"),
      makePlace("starred-3", "별점3식당", 3),
    ];
    mockAuthAndPlaces(places);
    mockGeminiStream(["추천"]);

    const res = await POST(
      makeRequest([{ role: "user", content: "추천해줘" }]),
    );
    expect(res.status).toBe(200);

    const callArgs = mockGenerateContentStream.mock.calls[0][0];
    const systemMsg: string = callArgs.config.systemInstruction;
    const star5Pos = systemMsg.indexOf("starred-5");
    const star3Pos = systemMsg.indexOf("starred-3");
    const unstarred1Pos = systemMsg.indexOf("unstarred-1");
    const unstarred2Pos = systemMsg.indexOf("unstarred-2");
    expect(star5Pos).toBeLessThan(star3Pos);
    expect(star5Pos).toBeLessThan(unstarred1Pos);
    expect(star3Pos).toBeLessThan(unstarred2Pos);
    expect(unstarred1Pos).toBeLessThan(unstarred2Pos);
  });

  it("maps assistant role to model for Gemini", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    mockGeminiStream(["응답"]);

    await POST(
      makeRequest([
        { role: "user", content: "안녕" },
        { role: "assistant", content: "안녕하세요!" },
        { role: "user", content: "추천해줘" },
      ]),
    );

    const callArgs = mockGenerateContentStream.mock.calls[0][0];
    const contents = callArgs.contents;
    expect(contents[0].role).toBe("user");
    expect(contents[1].role).toBe("model");
    expect(contents[2].role).toBe("user");
  });

  it("returns 429 when Gemini returns rate limit error", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    const err = new Error("Rate limit exceeded");
    (err as unknown as { status: number }).status = 429;
    mockGenerateContentStream.mockRejectedValue(err);

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("try again");
  });

  it("returns 429 when Gemini returns bad request (400)", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    const err = new Error("Bad request");
    (err as unknown as { status: number }).status = 400;
    mockGenerateContentStream.mockRejectedValue(err);

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(429);
  });

  it("handles zero places gracefully", async () => {
    mockAuthAndPlaces([]);
    mockGeminiStream(["저장된 맛집이 없어요"]);

    const res = await POST(
      makeRequest([{ role: "user", content: "추천해줘" }]),
    );
    expect(res.status).toBe(200);

    const callArgs = mockGenerateContentStream.mock.calls[0][0];
    const systemMsg = callArgs.config.systemInstruction;
    expect(systemMsg).toContain("[]");
  });

  it("returns 502 for non-API errors", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    mockGenerateContentStream.mockRejectedValue(new Error("Network failure"));

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe("Failed to connect to AI service");
  });

  it("returns 502 for Gemini server errors (500)", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    const err = new Error("Internal server error");
    (err as unknown as { status: number }).status = 500;
    mockGenerateContentStream.mockRejectedValue(err);

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(502);
  });
});
```

Key changes from original:
- Removed `MockAPIError` class and `vi.hoisted` — Gemini errors are plain errors with `.status`
- Replaced `mockCreate` with `mockGenerateContentStream`
- `mockGeminiStream` yields `{ text }` objects instead of `{ choices: [{ delta: { content } }] }`
- System instruction is at `callArgs.config.systemInstruction` not `callArgs.messages[0].content`
- Removed: truncation test, `BUDGET_EXCEEDED` test
- Added: role mapping test (`assistant` → `model`)
- `GROQ_API_KEY` → `GEMINI_API_KEY` in all env stubs

- [ ] **Step 2: Run tests**

```bash
cd /path/to/worktree && pnpm test
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/chat-api.test.ts
git commit -m "test: update chat API tests for Gemini SDK migration"
```

---

## Chunk 3: Verification

### Task 4: Full verification

- [ ] **Step 1: Run type check**

```bash
pnpm build
```
Expected: build succeeds.

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```
Expected: all tests pass, including chat-api tests.

- [ ] **Step 3: Manual smoke test (if GEMINI_API_KEY set)**

```bash
pnpm dev
```
Open the app, navigate to discover page, send a chat message. Verify streaming response works.
