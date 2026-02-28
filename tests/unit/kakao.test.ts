import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchByKeyword, smartSearch } from "@/lib/kakao";
import { getExpandedTerms } from "@/lib/search-expansions";

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
      distance: "500",
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
  it("should include category_group_code when categoryGroupCode is provided", async () => {
    await searchByKeyword({ query: "pizza", categoryGroupCode: "FD6" });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("category_group_code")).toBe("FD6");
    expect(url.searchParams.get("query")).toBe("pizza");
  });

  it("should omit category_group_code when categoryGroupCode is not provided", async () => {
    await searchByKeyword({ query: "pizza" });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.has("category_group_code")).toBe(false);
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

  it("should include location params when provided", async () => {
    await searchByKeyword({
      query: "pizza",
      x: "127.0",
      y: "37.5",
      radius: 5000,
      sort: "distance",
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("x")).toBe("127.0");
    expect(url.searchParams.get("y")).toBe("37.5");
    expect(url.searchParams.get("radius")).toBe("5000");
    expect(url.searchParams.get("sort")).toBe("distance");
  });
});

describe("getExpandedTerms", () => {
  it("should return expanded terms for an exact trigger match", () => {
    const terms = getExpandedTerms("chicken");
    expect(terms).toContain("치킨");
    expect(terms).toContain("KFC");
    expect(terms.length).toBeGreaterThan(1);
  });

  it("should return original query when no trigger matches", () => {
    const terms = getExpandedTerms("some random food");
    expect(terms).toEqual(["some random food"]);
  });

  it("should be case-insensitive", () => {
    const terms = getExpandedTerms("CHICKEN");
    expect(terms).toContain("치킨");
  });

  it("should match when query contains a trigger as substring", () => {
    const terms = getExpandedTerms("치킨 맛집");
    expect(terms.length).toBeGreaterThan(1);
  });

  it("should cap results at 5 terms", () => {
    const terms = getExpandedTerms("chicken");
    expect(terms.length).toBeLessThanOrEqual(5);
  });

  it("should include original query first when not already in terms list", () => {
    const terms = getExpandedTerms("chicken");
    expect(terms[0]).toBe("chicken");
  });
});

describe("smartSearch", () => {
  it("should deduplicate results by id across parallel queries", async () => {
    const doc1 = { ...mockResponse.documents[0], id: "1" };
    const doc2 = { ...mockResponse.documents[0], id: "2" };
    const duplicateDoc1 = { ...mockResponse.documents[0], id: "1" };

    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockResponse,
              documents: callCount === 1 ? [doc1, doc2] : [duplicateDoc1],
            }),
        });
      }),
    );

    const results = await smartSearch({ query: "chicken" });
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should preserve relevance order when coordinates are provided", async () => {
    const far = { ...mockResponse.documents[0], id: "2", distance: "5000" };
    const near = { ...mockResponse.documents[0], id: "1", distance: "100" };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ ...mockResponse, documents: [far, near] }),
      }),
    );

    const results = await smartSearch({
      query: "pizza",
      x: "127.0",
      y: "37.5",
    });

    // Preserves API insertion order (relevance), not distance order
    expect(results[0].id).toBe("2");
    expect(results[1].id).toBe("1");
  });

  it("should pass location params to searchByKeyword when provided", async () => {
    await smartSearch({ query: "pizza", x: "127.0", y: "37.5" });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("x")).toBe("127.0");
    expect(url.searchParams.get("y")).toBe("37.5");
    expect(url.searchParams.get("radius")).toBe("5000");
    expect(url.searchParams.get("sort")).toBe("accuracy");
  });

  it("should not include location params when coordinates are absent", async () => {
    await smartSearch({ query: "pizza" });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("x")).toBeNull();
    expect(url.searchParams.get("sort")).toBeNull();
  });

  it("should cap results at 300", async () => {
    const docs = Array.from({ length: 15 }, (_, i) => ({
      ...mockResponse.documents[0],
      id: String(i),
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ ...mockResponse, documents: docs }),
      }),
    );

    const results = await smartSearch({ query: "chicken" });
    expect(results.length).toBeLessThanOrEqual(300);
  });

  it("should ignore failed parallel fetches", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) return Promise.resolve({ ok: false, status: 500 });
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });
      }),
    );

    const results = await smartSearch({ query: "chicken" });
    expect(results.length).toBeGreaterThan(0);
  });
});
