import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchByKeyword, searchByBounds } from "@/lib/kakao";

const mockResponse = {
  documents: [
    {
      id: "123",
      place_name: "Pizza Palace",
      address_name: "서울시 강남구",
      road_address_name: "서울시 강남구 테헤란로 1",
      category_group_name: "음식점",
      category_name: "음식점 > 양식 > 피자",
      x: "127.0",
      y: "37.5",
      place_url: "https://place.map.kakao.com/123",
    },
  ],
  meta: {
    total_count: 1,
    pageable_count: 1,
    is_end: true,
  },
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_REST_KEY", "test-key");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }),
  );
});

describe("searchByKeyword", () => {
  it("should include category_group_code=FD6 in query params", async () => {
    await searchByKeyword({ query: "pizza" });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("category_group_code")).toBe("FD6");
    expect(url.searchParams.get("query")).toBe("pizza");
  });

  it("should send Authorization header with KakaoAK prefix", async () => {
    await searchByKeyword({ query: "pizza" });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const options = fetchCall[1] as RequestInit;
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(
      "KakaoAK test-key",
    );
  });

  it("should parse response correctly", async () => {
    const result = await searchByKeyword({ query: "pizza" });

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].place_name).toBe("Pizza Palace");
    expect(result.meta.is_end).toBe(true);
  });

  it("should throw on API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );

    await expect(searchByKeyword({ query: "pizza" })).rejects.toThrow(
      "Kakao API error: 401",
    );
  });
});

describe("searchByBounds", () => {
  it("should include rect parameter and FD6 category", async () => {
    await searchByBounds({ rect: "126.9,37.4,127.1,37.6" });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("rect")).toBe("126.9,37.4,127.1,37.6");
    expect(url.searchParams.get("category_group_code")).toBe("FD6");
  });
});
