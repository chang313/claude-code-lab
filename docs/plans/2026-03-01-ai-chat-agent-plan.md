# AI Chat Recommendation Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `/discover` auto-recommendations with an interactive chat agent that streams Groq responses and renders inline place cards from the user's saved restaurants.

**Architecture:** A Next.js API route (`/api/agent/chat`) authenticates the user, fetches their saved places, builds a system prompt with all places as context, and streams the Groq response as SSE. The client renders chat bubbles and parses `<<PLACE:id>>` markers into inline `ChatPlaceCard` components. Conversation state lives in React state (no DB persistence).

**Tech Stack:** Next.js 16 App Router, Groq SDK (streaming), React 19, Tailwind CSS 4, Supabase server client

**Design doc:** `docs/plans/2026-03-01-ai-chat-recommendation-agent-design.md`

---

### Task 1: Add ChatMessage types

**Files:**
- Modify: `src/types/index.ts`
- Test: `tests/unit/chat-types.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/chat-types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { ChatMessage } from "@/types";

describe("ChatMessage type", () => {
  it("accepts user message", () => {
    const msg: ChatMessage = { role: "user", content: "매운 거 추천해줘" };
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("매운 거 추천해줘");
  });

  it("accepts assistant message", () => {
    const msg: ChatMessage = {
      role: "assistant",
      content: "매운집 <<PLACE:12345>> 추천드려요!",
    };
    expect(msg.role).toBe("assistant");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/chat-types.test.ts`
Expected: FAIL — `ChatMessage` not exported from `@/types`

**Step 3: Write minimal implementation**

Add to the end of `src/types/index.ts`:

```typescript
// === Chat Agent types ===

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/chat-types.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/types/index.ts tests/unit/chat-types.test.ts
git commit -m "feat(chat-agent): add ChatMessage type"
```

---

### Task 2: Build place marker parser utility

**Files:**
- Create: `src/lib/chat-parser.ts`
- Test: `tests/unit/chat-parser.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/chat-parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseChatContent } from "@/lib/chat-parser";

describe("parseChatContent", () => {
  it("returns plain text when no markers", () => {
    const result = parseChatContent("오늘 뭐 먹을까요?");
    expect(result).toEqual([{ type: "text", content: "오늘 뭐 먹을까요?" }]);
  });

  it("parses a single place marker", () => {
    const result = parseChatContent("맛있는 치킨 <<PLACE:kakao-1>> 추천드려요!");
    expect(result).toEqual([
      { type: "text", content: "맛있는 치킨 " },
      { type: "place", placeId: "kakao-1" },
      { type: "text", content: " 추천드려요!" },
    ]);
  });

  it("parses multiple place markers", () => {
    const result = parseChatContent(
      "<<PLACE:id1>> 과 <<PLACE:id2>> 를 추천합니다",
    );
    expect(result).toEqual([
      { type: "place", placeId: "id1" },
      { type: "text", content: " 과 " },
      { type: "place", placeId: "id2" },
      { type: "text", content: " 를 추천합니다" },
    ]);
  });

  it("handles empty string", () => {
    const result = parseChatContent("");
    expect(result).toEqual([]);
  });

  it("handles marker at start and end", () => {
    const result = parseChatContent("<<PLACE:abc>>");
    expect(result).toEqual([{ type: "place", placeId: "abc" }]);
  });

  it("skips empty text segments between adjacent markers", () => {
    const result = parseChatContent("<<PLACE:a>><<PLACE:b>>");
    expect(result).toEqual([
      { type: "place", placeId: "a" },
      { type: "place", placeId: "b" },
    ]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/chat-parser.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/lib/chat-parser.ts`:

```typescript
export type ChatSegment =
  | { type: "text"; content: string }
  | { type: "place"; placeId: string };

const PLACE_MARKER_REGEX = /<<PLACE:([^>]+)>>/g;

export function parseChatContent(content: string): ChatSegment[] {
  if (!content) return [];

  const segments: ChatSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PLACE_MARKER_REGEX.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before) {
      segments.push({ type: "text", content: before });
    }
    segments.push({ type: "place", placeId: match[1] });
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining) {
    segments.push({ type: "text", content: remaining });
  }

  return segments;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/chat-parser.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/lib/chat-parser.ts tests/unit/chat-parser.test.ts
git commit -m "feat(chat-agent): add place marker parser utility"
```

---

### Task 3: Build the streaming chat API route

**Files:**
- Create: `src/app/api/agent/chat/route.ts`
- Test: `tests/unit/chat-api.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/chat-api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock groq-sdk
const mockCreate = vi.fn();
vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = { completions: { create: mockCreate } };
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

// Need to mock next/headers for server component
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}));

import { POST } from "@/app/api/agent/chat/route";

describe("POST /api/agent/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GROQ_API_KEY", "test-key");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const req = new Request("http://localhost/api/agent/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "test" }] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when messages array is empty", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const req = new Request("http://localhost/api/agent/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns streaming response for valid request", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // Mock Supabase chain: from().select().eq().order()
    mockOrder.mockResolvedValue({
      data: [
        {
          kakao_place_id: "k1",
          name: "치킨집",
          category: "음식점 > 치킨",
          address: "서울",
          star_rating: 4,
          place_url: null,
        },
      ],
      error: null,
    });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });

    // Mock Groq streaming — async iterable
    const chunks = [
      { choices: [{ delta: { content: "치킨집" } }] },
      { choices: [{ delta: { content: " 추천!" } }] },
    ];
    mockCreate.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        for (const chunk of chunks) yield chunk;
      },
    });

    const req = new Request("http://localhost/api/agent/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "치킨 먹고싶어" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const text = await res.text();
    expect(text).toContain("치킨집");
    expect(text).toContain("추천!");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/chat-api.test.ts`
Expected: FAIL — route module not found

**Step 3: Write minimal implementation**

Create `src/app/api/agent/chat/route.ts`:

```typescript
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
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

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/chat-api.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/app/api/agent/chat/route.ts tests/unit/chat-api.test.ts
git commit -m "feat(chat-agent): add streaming chat API route"
```

---

### Task 4: Build ChatPlaceCard component

**Files:**
- Create: `src/components/ChatPlaceCard.tsx`
- Test: `tests/unit/chat-place-card.test.tsx`

**Step 1: Write the failing test**

Create `tests/unit/chat-place-card.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatPlaceCard from "@/components/ChatPlaceCard";
import type { Restaurant } from "@/types";

const visited: Restaurant = {
  id: "kakao-1",
  name: "맛있는 치킨",
  category: "음식점 > 치킨",
  address: "서울 강남구 테헤란로 123",
  lat: 37.5,
  lng: 127.05,
  placeUrl: "https://place.map.kakao.com/kakao-1",
  starRating: 4,
  createdAt: "2024-01-01",
};

const wishlisted: Restaurant = {
  ...visited,
  id: "kakao-2",
  name: "스시 오마카세",
  starRating: null,
  placeUrl: undefined,
};

describe("ChatPlaceCard", () => {
  it("renders place name and category", () => {
    render(<ChatPlaceCard place={visited} />);
    expect(screen.getByText("맛있는 치킨")).toBeTruthy();
    expect(screen.getByText("치킨")).toBeTruthy(); // subcategory
  });

  it("shows star rating for visited places", () => {
    render(<ChatPlaceCard place={visited} />);
    // 4 filled stars
    expect(screen.getByText(/★★★★/)).toBeTruthy();
  });

  it("shows wishlist badge for unvisited places", () => {
    render(<ChatPlaceCard place={wishlisted} />);
    expect(screen.getByText("위시리스트")).toBeTruthy();
  });

  it("links to place URL when available", () => {
    render(<ChatPlaceCard place={visited} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(
      "https://place.map.kakao.com/kakao-1",
    );
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/chat-place-card.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/components/ChatPlaceCard.tsx`:

```tsx
"use client";

import type { Restaurant } from "@/types";

interface ChatPlaceCardProps {
  place: Restaurant;
}

function getSubcategory(category: string): string {
  const parts = category.split(" > ");
  return parts[parts.length - 1] || category;
}

function renderStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export default function ChatPlaceCard({ place }: ChatPlaceCardProps) {
  const card = (
    <div className="my-2 bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 truncate">
            {place.name}
          </h4>
          <p className="text-xs text-gray-500">{getSubcategory(place.category)}</p>
          <p className="text-xs text-gray-400 truncate">{place.address}</p>
        </div>
        <div className="shrink-0 text-right">
          {place.starRating !== null ? (
            <span className="text-xs text-yellow-500">
              {renderStars(place.starRating)}
            </span>
          ) : (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              위시리스트
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (place.placeUrl) {
    return (
      <a href={place.placeUrl} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }

  return card;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/chat-place-card.test.tsx`
Expected: PASS

**Step 5: Commit**

```
git add src/components/ChatPlaceCard.tsx tests/unit/chat-place-card.test.tsx
git commit -m "feat(chat-agent): add ChatPlaceCard component"
```

---

### Task 5: Build useChat hook for streaming

**Files:**
- Create: `src/hooks/use-chat.ts`
- Test: `tests/unit/use-chat.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/use-chat.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "@/hooks/use-chat";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockSSEResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: chunks[index] })}\n\n`),
        );
        index++;
      } else {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("useChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty messages and not streaming", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
  });

  it("sends message and accumulates streamed response", async () => {
    mockFetch.mockResolvedValue(createMockSSEResponse(["안녕", "하세요"]));

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("안녕");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({
      role: "user",
      content: "안녕",
    });
    expect(result.current.messages[1].content).toContain("안녕");
    expect(result.current.messages[1].content).toContain("하세요");
  });

  it("sets error on fetch failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(result.current.error).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/use-chat.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/hooks/use-chat.ts`:

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "@/types";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    setError(null);
    const userMessage: ChatMessage = { role: "user", content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsStreaming(true);

    // Placeholder for assistant response
    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setMessages([
                  ...updatedMessages,
                  { role: "assistant", content: accumulated },
                ]);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("응답을 가져오는데 실패했어요. 다시 시도해주세요.");
      // Remove the empty assistant message on error
      setMessages(updatedMessages);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, clearMessages };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/use-chat.test.ts`
Expected: PASS

**Step 5: Commit**

```
git add src/hooks/use-chat.ts tests/unit/use-chat.test.ts
git commit -m "feat(chat-agent): add useChat hook with SSE streaming"
```

---

### Task 6: Build ChatInput component

**Files:**
- Create: `src/components/ChatInput.tsx`
- Test: `tests/unit/chat-input.test.tsx`

**Step 1: Write the failing test**

Create `tests/unit/chat-input.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatInput from "@/components/ChatInput";

describe("ChatInput", () => {
  it("renders input and send button", () => {
    render(<ChatInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByPlaceholderText("무엇이 먹고 싶으세요?")).toBeTruthy();
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("calls onSend with trimmed input on submit", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const input = screen.getByPlaceholderText("무엇이 먹고 싶으세요?");
    fireEvent.change(input, { target: { value: "  치킨 추천해줘  " } });
    fireEvent.submit(input.closest("form")!);

    expect(onSend).toHaveBeenCalledWith("치킨 추천해줘");
  });

  it("clears input after submit", () => {
    render(<ChatInput onSend={vi.fn()} disabled={false} />);
    const input = screen.getByPlaceholderText(
      "무엇이 먹고 싶으세요?",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "테스트" } });
    fireEvent.submit(input.closest("form")!);

    expect(input.value).toBe("");
  });

  it("disables send button when disabled prop is true", () => {
    render(<ChatInput onSend={vi.fn()} disabled={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onSend for empty input", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);
    fireEvent.submit(screen.getByPlaceholderText("무엇이 먹고 싶으세요?").closest("form")!);
    expect(onSend).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/chat-input.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/components/ChatInput.tsx`:

```tsx
"use client";

import { useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 border-t border-gray-200 bg-white"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="무엇이 먹고 싶으세요?"
        disabled={disabled}
        className="flex-1 px-4 py-2 rounded-full border border-gray-300 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:bg-gray-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.114A28.897 28.897 0 003.105 2.289z" />
        </svg>
      </button>
    </form>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/chat-input.test.tsx`
Expected: PASS

**Step 5: Commit**

```
git add src/components/ChatInput.tsx tests/unit/chat-input.test.tsx
git commit -m "feat(chat-agent): add ChatInput component"
```

---

### Task 7: Build AssistantBubble component (renders parsed content with place cards)

**Files:**
- Create: `src/components/AssistantBubble.tsx`
- Test: `tests/unit/assistant-bubble.test.tsx`

**Step 1: Write the failing test**

Create `tests/unit/assistant-bubble.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AssistantBubble from "@/components/AssistantBubble";
import type { Restaurant } from "@/types";

const placeMap = new Map<string, Restaurant>([
  [
    "kakao-1",
    {
      id: "kakao-1",
      name: "맛있는 치킨",
      category: "음식점 > 치킨",
      address: "서울",
      lat: 37.5,
      lng: 127.05,
      starRating: 4,
      createdAt: "2024-01-01",
    },
  ],
]);

describe("AssistantBubble", () => {
  it("renders plain text without markers", () => {
    render(<AssistantBubble content="안녕하세요!" placeMap={placeMap} />);
    expect(screen.getByText("안녕하세요!")).toBeTruthy();
  });

  it("renders place card for valid marker", () => {
    render(
      <AssistantBubble
        content="추천: <<PLACE:kakao-1>> 입니다"
        placeMap={placeMap}
      />,
    );
    expect(screen.getByText("맛있는 치킨")).toBeTruthy();
    expect(screen.getByText("추천:")).toBeTruthy();
  });

  it("renders marker as plain text when place not found", () => {
    render(
      <AssistantBubble
        content="<<PLACE:unknown-id>> 추천!"
        placeMap={placeMap}
      />,
    );
    // Should not render a card, just show text
    expect(screen.queryByText("unknown-id")).toBeFalsy();
    expect(screen.getByText("추천!")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/assistant-bubble.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/components/AssistantBubble.tsx`:

```tsx
"use client";

import { parseChatContent } from "@/lib/chat-parser";
import ChatPlaceCard from "@/components/ChatPlaceCard";
import type { Restaurant } from "@/types";

interface AssistantBubbleProps {
  content: string;
  placeMap: Map<string, Restaurant>;
}

export default function AssistantBubble({
  content,
  placeMap,
}: AssistantBubbleProps) {
  const segments = parseChatContent(content);

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%]">
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
          {segments.map((seg, i) => {
            if (seg.type === "text") {
              return (
                <span key={i} className="text-sm text-gray-800 whitespace-pre-wrap">
                  {seg.content}
                </span>
              );
            }
            const place = placeMap.get(seg.placeId);
            if (!place) return null; // Skip unknown markers
            return <ChatPlaceCard key={i} place={place} />;
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/assistant-bubble.test.tsx`
Expected: PASS

**Step 5: Commit**

```
git add src/components/AssistantBubble.tsx tests/unit/assistant-bubble.test.tsx
git commit -m "feat(chat-agent): add AssistantBubble with place card rendering"
```

---

### Task 8: Rewrite /discover page with chat UI

**Files:**
- Modify: `src/app/discover/page.tsx`
- Test: `tests/unit/discover-page.test.tsx` (rewrite)

**Step 1: Write the failing test**

Rewrite `tests/unit/discover-page.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock useWishlist
const mockWishlist = vi.fn();
vi.mock("@/db/hooks", () => ({
  useWishlist: () => mockWishlist(),
}));

// Mock supabase
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));
vi.mock("@/lib/supabase/invalidate", () => ({
  invalidate: vi.fn(),
  invalidateByPrefix: vi.fn(),
}));

import DiscoverPage from "@/app/discover/page";

describe("DiscoverPage (Chat Agent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWishlist.mockReturnValue({
      restaurants: [
        {
          id: "kakao-1",
          name: "치킨집",
          category: "음식점 > 치킨",
          address: "서울",
          lat: 37.5,
          lng: 127.05,
          starRating: 4,
          createdAt: "2024-01-01",
        },
        {
          id: "kakao-2",
          name: "스시집",
          category: "음식점 > 일식",
          address: "서울",
          lat: 37.51,
          lng: 127.06,
          starRating: null,
          createdAt: "2024-01-02",
        },
        {
          id: "kakao-3",
          name: "카페",
          category: "카페",
          address: "서울",
          lat: 37.52,
          lng: 127.07,
          starRating: 3,
          createdAt: "2024-01-03",
        },
      ],
      isLoading: false,
    });
  });

  it("shows suggested prompts on empty conversation", () => {
    render(<DiscoverPage />);
    expect(screen.getByText("오늘 뭐 먹지?")).toBeTruthy();
    expect(screen.getByText("매운 거 추천해줘")).toBeTruthy();
  });

  it("renders chat input", () => {
    render(<DiscoverPage />);
    expect(screen.getByPlaceholderText("무엇이 먹고 싶으세요?")).toBeTruthy();
  });

  it("shows minimum places message when < 3 places saved", () => {
    mockWishlist.mockReturnValue({ restaurants: [], isLoading: false });
    render(<DiscoverPage />);
    expect(
      screen.getByText(/맛집을 3개 이상 저장/),
    ).toBeTruthy();
  });

  it("sends message on form submit", async () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves (streaming)

    render(<DiscoverPage />);
    const input = screen.getByPlaceholderText("무엇이 먹고 싶으세요?");

    await act(async () => {
      fireEvent.change(input, { target: { value: "치킨 추천해줘" } });
      fireEvent.submit(input.closest("form")!);
    });

    // User message should appear
    expect(screen.getByText("치킨 추천해줘")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/discover-page.test.tsx`
Expected: FAIL — current page doesn't have chat UI elements

**Step 3: Write the new /discover page**

Replace `src/app/discover/page.tsx` entirely:

```tsx
"use client";

import { useRef, useEffect, useMemo } from "react";
import { useWishlist } from "@/db/hooks";
import { useChat } from "@/hooks/use-chat";
import ChatInput from "@/components/ChatInput";
import AssistantBubble from "@/components/AssistantBubble";
import Toast from "@/components/Toast";
import type { Restaurant } from "@/types";

const SUGGESTED_PROMPTS = [
  "오늘 뭐 먹지?",
  "매운 거 추천해줘",
  "카페 가고 싶어",
  "별점 높은 곳 알려줘",
];

const MIN_PLACES = 3;

export default function DiscoverPage() {
  const { restaurants, isLoading: placesLoading } = useWishlist();
  const { messages, isStreaming, error, sendMessage, clearMessages } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build a place lookup map
  const placeMap = useMemo(() => {
    const map = new Map<string, Restaurant>();
    for (const r of restaurants) {
      map.set(r.id, r);
    }
    return map;
  }, [restaurants]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  if (placesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">로딩 중...</p>
      </div>
    );
  }

  if (restaurants.length < MIN_PLACES) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
        <p className="text-lg text-gray-600">
          맛집을 3개 이상 저장하면 AI 추천을 받을 수 있어요!
        </p>
        <p className="text-sm text-gray-400 mt-2">
          검색에서 맛집을 저장해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h1 className="text-lg font-bold">AI 맛집 추천</h1>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            새 대화
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
              <p className="text-gray-500 text-sm">
                저장한 {restaurants.length}개의 맛집 중에서 추천해드릴게요
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isStreaming}
                  className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end mb-3">
                  <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <AssistantBubble key={i} content={msg.content} placeMap={placeMap} />
              ),
            )}
            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start mb-3">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pb-16">
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </div>

      {error && (
        <Toast
          message={error}
          type="error"
          onDismiss={() => {}}
        />
      )}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/discover-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```
git add src/app/discover/page.tsx tests/unit/discover-page.test.tsx
git commit -m "feat(chat-agent): rewrite /discover page with chat UI"
```

---

### Task 9: Run full verification

**Step 1: Run type check and build**

Run: `pnpm build`
Expected: Build succeeds (using `pnpm build` instead of `tsc --noEmit` per project rules — bundler moduleResolution)

**Step 2: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass

**Step 3: Fix any issues found**

If type errors or test failures, fix them before proceeding.

**Step 4: Commit any fixes**

```
git add -A
git commit -m "fix(chat-agent): address build/test issues"
```

---

### Task 10: Clean up old discover components

Now that the old discover system is replaced, remove unused code.

**Files to potentially remove:**
- `src/components/DiscoverCard.tsx` (no longer imported)
- `tests/unit/discover-card.test.tsx`
- `tests/unit/discover-types.test.ts` (if it only tests old DiscoverItem)

**Step 1: Check if old recommendation API is still needed**

Run: `grep -r "recommendations/generate" src/` to see if anything still references the old API route.

If only the old discover page used it, the API route (`src/app/api/recommendations/generate/`) can be removed too. If referenced elsewhere, keep it.

**Step 2: Remove unused files**

Remove files confirmed as unused.

**Step 3: Run verification**

Run: `pnpm build && pnpm vitest run`
Expected: PASS

**Step 4: Commit**

```
git add -A
git commit -m "chore(chat-agent): remove old discover card and unused tests"
```

---

### Task 11: Manual smoke test

**Step 1: Start dev server**

Run: `pnpm dev`

**Step 2: Test in browser**

1. Navigate to `/discover`
2. Verify suggested prompts appear
3. Tap "오늘 뭐 먹지?" — verify streaming response with place cards
4. Type a follow-up message — verify multi-turn works
5. Tap "새 대화" — verify conversation clears
6. Check mobile viewport (375px) — verify layout is responsive

**Step 3: Commit any final adjustments**

```
git add -A
git commit -m "fix(chat-agent): polish after smoke test"
```
