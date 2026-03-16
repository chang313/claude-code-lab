import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs before vi.mock hoisting, making MockAPIError available in the factory
const { MockAPIError, mockCreate } = vi.hoisted(() => {
  class MockAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "APIError";
    }
  }
  return { MockAPIError, mockCreate: vi.fn() };
});

vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = { completions: { create: mockCreate } };
  },
  APIError: MockAPIError,
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

function mockGroqStream(contents: string[]) {
  const chunks = contents.map((c) => ({
    choices: [{ delta: { content: c } }],
  }));
  mockCreate.mockResolvedValue({
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
    vi.stubEnv("GROQ_API_KEY", "test-key");
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

  it("returns 500 when GROQ_API_KEY is missing", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("GROQ_API_KEY");
  });

  it("returns streaming response for valid request", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    mockGroqStream(["치킨집", " 추천!"]);

    const res = await POST(
      makeRequest([{ role: "user", content: "치킨 먹고싶어" }]),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const text = await res.text();
    expect(text).toContain("치킨집");
    expect(text).toContain("추천!");
  });

  it("truncates places when they exceed token budget", async () => {
    // Generate 200 places — should exceed the budget
    const places = Array.from({ length: 200 }, (_, i) =>
      makePlace(`place-${i}`, `맛집 ${i}번`, i % 5 === 0 ? 4 : null),
    );
    mockAuthAndPlaces(places);
    mockGroqStream(["추천합니다"]);

    const res = await POST(
      makeRequest([{ role: "user", content: "뭐 먹을까" }]),
    );
    expect(res.status).toBe(200);

    // Verify the system prompt sent to Groq was truncated
    const callArgs = mockCreate.mock.calls[0][0];
    const systemMsg = callArgs.messages[0].content;
    // Should include truncation note
    expect(systemMsg).toContain("saved places due to context limits");
    // Should NOT contain all 200 places
    expect(systemMsg).not.toContain("place-199");
  });

  it("prioritizes starred places over unstarred", async () => {
    const places = [
      makePlace("unstarred-1", "일반식당1"),
      makePlace("starred-5", "별점5식당", 5),
      makePlace("unstarred-2", "일반식당2"),
      makePlace("starred-3", "별점3식당", 3),
    ];
    mockAuthAndPlaces(places);
    mockGroqStream(["추천"]);

    const res = await POST(
      makeRequest([{ role: "user", content: "추천해줘" }]),
    );
    expect(res.status).toBe(200);

    const callArgs = mockCreate.mock.calls[0][0];
    const systemMsg: string = callArgs.messages[0].content;
    // Starred places should appear before unstarred in the JSON
    const star5Pos = systemMsg.indexOf("starred-5");
    const star3Pos = systemMsg.indexOf("starred-3");
    const unstarred1Pos = systemMsg.indexOf("unstarred-1");
    const unstarred2Pos = systemMsg.indexOf("unstarred-2");
    // 5-star before 3-star
    expect(star5Pos).toBeLessThan(star3Pos);
    // Both starred before both unstarred
    expect(star5Pos).toBeLessThan(unstarred1Pos);
    expect(star3Pos).toBeLessThan(unstarred2Pos);
    // Unstarred preserve original order
    expect(unstarred1Pos).toBeLessThan(unstarred2Pos);
  });

  it("returns 429 when Groq returns rate limit error (429)", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    mockCreate.mockRejectedValue(new MockAPIError(429, "Rate limit exceeded"));

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("try again");
  });

  it("returns 429 when Groq returns request too large (413)", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    mockCreate.mockRejectedValue(
      new MockAPIError(413, "Request too large"),
    );

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(429);
  });

  it("returns 429 when Groq returns bad request (400)", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    mockCreate.mockRejectedValue(
      new MockAPIError(400, "Request too large for model"),
    );

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(429);
  });

  it("returns 413 BUDGET_EXCEEDED when conversation too long", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    // Send a very long message that exhausts the token budget
    const longContent = "가".repeat(15000);

    const res = await POST(
      makeRequest([{ role: "user", content: longContent }]),
    );
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toBe("conversation_too_long");
    expect(json.code).toBe("BUDGET_EXCEEDED");
  });

  it("handles zero places gracefully", async () => {
    mockAuthAndPlaces([]);
    mockGroqStream(["저장된 맛집이 없어요"]);

    const res = await POST(
      makeRequest([{ role: "user", content: "추천해줘" }]),
    );
    expect(res.status).toBe(200);

    const callArgs = mockCreate.mock.calls[0][0];
    const systemMsg = callArgs.messages[0].content;
    // Should have empty array in prompt
    expect(systemMsg).toContain("[]");
    // Should NOT have truncation note
    expect(systemMsg).not.toContain("context limits");
  });

  it("returns 502 for non-APIError exceptions", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    mockCreate.mockRejectedValue(new Error("Network failure"));

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe("Failed to connect to AI service");
  });

  it("returns 502 for Groq server errors (500)", async () => {
    mockAuthAndPlaces([makePlace("k1", "치킨집", 4)]);
    mockCreate.mockRejectedValue(
      new MockAPIError(500, "Internal server error"),
    );

    const res = await POST(
      makeRequest([{ role: "user", content: "test" }]),
    );
    expect(res.status).toBe(502);
  });
});
