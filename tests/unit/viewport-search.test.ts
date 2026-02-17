import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchByKeyword, viewportSearch, boundsEqual } from "@/lib/kakao";
import type { Bounds, KakaoPlace, KakaoSearchResponse } from "@/types";

const makePlaceDoc = (id: string, distance = "500"): KakaoPlace => ({
  id,
  place_name: `Place ${id}`,
  address_name: "서울시 강남구",
  road_address_name: "서울시 강남구 테헤란로 1",
  category_group_name: "음식점",
  category_name: "음식점 > 양식",
  x: "127.0",
  y: "37.5",
  distance,
  place_url: `https://place.map.kakao.com/${id}`,
});

const makeResponse = (
  docs: KakaoPlace[],
  isEnd = true,
): KakaoSearchResponse => ({
  documents: docs,
  meta: {
    total_count: docs.length,
    pageable_count: docs.length,
    is_end: isEnd,
  },
});

const testBounds: Bounds = {
  sw: { lat: 37.4, lng: 126.9 },
  ne: { lat: 37.6, lng: 127.1 },
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_REST_KEY", "test-key");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse([makePlaceDoc("1")])),
    }),
  );
});

describe("boundsEqual", () => {
  it("should return true for identical bounds", () => {
    expect(boundsEqual(testBounds, { ...testBounds })).toBe(true);
  });

  it("should return false when bounds differ", () => {
    const other: Bounds = {
      sw: { lat: 37.3, lng: 126.9 },
      ne: { lat: 37.6, lng: 127.1 },
    };
    expect(boundsEqual(testBounds, other)).toBe(false);
  });

  it("should tolerate floating-point noise within epsilon", () => {
    const noisy: Bounds = {
      sw: { lat: 37.4 + 1e-8, lng: 126.9 },
      ne: { lat: 37.6, lng: 127.1 - 1e-8 },
    };
    expect(boundsEqual(testBounds, noisy)).toBe(true);
  });

  it("should detect differences larger than epsilon", () => {
    const shifted: Bounds = {
      sw: { lat: 37.4 + 1e-4, lng: 126.9 },
      ne: { lat: 37.6, lng: 127.1 },
    };
    expect(boundsEqual(testBounds, shifted)).toBe(false);
  });
});

describe("searchByKeyword with rect", () => {
  it("should include rect parameter in URL when provided", async () => {
    await searchByKeyword({ query: "pizza", rect: "126.9,37.4,127.1,37.6" });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("rect")).toBe("126.9,37.4,127.1,37.6");
  });

  it("should not include radius when rect is provided", async () => {
    await searchByKeyword({
      query: "pizza",
      rect: "126.9,37.4,127.1,37.6",
      radius: 5000,
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("rect")).toBe("126.9,37.4,127.1,37.6");
    expect(url.searchParams.get("radius")).toBeNull();
  });

  it("should allow x/y alongside rect for distance calculation", async () => {
    await searchByKeyword({
      query: "pizza",
      rect: "126.9,37.4,127.1,37.6",
      x: "127.0",
      y: "37.5",
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("rect")).toBe("126.9,37.4,127.1,37.6");
    expect(url.searchParams.get("x")).toBe("127.0");
    expect(url.searchParams.get("y")).toBe("37.5");
  });
});

describe("viewportSearch pagination", () => {
  it("should fetch all 3 pages when results span multiple pages", async () => {
    const page1Docs = Array.from({ length: 15 }, (_, i) =>
      makePlaceDoc(`p1-${i}`),
    );
    const page2Docs = Array.from({ length: 15 }, (_, i) =>
      makePlaceDoc(`p2-${i}`),
    );
    const page3Docs = Array.from({ length: 10 }, (_, i) =>
      makePlaceDoc(`p3-${i}`),
    );

    let callIdx = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callIdx++;
        const pageNum = ((callIdx - 1) % 3) + 1;
        const docs =
          pageNum === 1
            ? page1Docs
            : pageNum === 2
              ? page2Docs
              : page3Docs;
        const isEnd = pageNum === 3;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeResponse(docs, isEnd)),
        });
      }),
    );

    // Use a query that won't trigger expansion (single term)
    const results = await viewportSearch({
      query: "specific place",
      bounds: testBounds,
    });

    // Should have fetched 3 pages (15 + 15 + 10 = 40 results)
    expect(results.length).toBe(40);
  });

  it("should stop pagination early when is_end is true", async () => {
    const docs = [makePlaceDoc("1"), makePlaceDoc("2")];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeResponse(docs, true)),
      }),
    );

    const results = await viewportSearch({
      query: "specific place",
      bounds: testBounds,
    });

    // Only 1 fetch call (page 1 returned is_end: true)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(results.length).toBe(2);
  });
});

describe("viewportSearch dedup", () => {
  it("should deduplicate results across expanded terms", async () => {
    const shared = makePlaceDoc("shared-1");
    const unique1 = makePlaceDoc("unique-1");
    const unique2 = makePlaceDoc("unique-2");

    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount++;
        const docs = callCount === 1 ? [shared, unique1] : [shared, unique2];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeResponse(docs)),
        });
      }),
    );

    // "chicken" triggers expansion to multiple terms
    const results = await viewportSearch({
      query: "chicken",
      bounds: testBounds,
    });

    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
    expect(ids).toContain("shared-1");
    expect(ids).toContain("unique-1");
    expect(ids).toContain("unique-2");
  });
});

describe("viewportSearch 300-result cap", () => {
  it("should cap results at 300", async () => {
    // Generate 350 unique results
    const docs = Array.from({ length: 350 }, (_, i) => makePlaceDoc(`${i}`));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeResponse(docs)),
      }),
    );

    const results = await viewportSearch({
      query: "specific place",
      bounds: testBounds,
    });

    expect(results.length).toBe(300);
  });
});
