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
