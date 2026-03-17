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
