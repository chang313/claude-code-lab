import { describe, it, expect, vi, beforeEach } from "vitest";
import { smartSearch, viewportSearch } from "@/lib/kakao";

const mockDoc = (id: string, distance: string) => ({
  id,
  place_name: `Restaurant ${id}`,
  address_name: "서울시 강남구",
  road_address_name: "서울시 강남구 테헤란로 1",
  category_group_name: "음식점",
  category_name: "음식점 > 양식",
  x: "127.0",
  y: "37.5",
  distance,
  place_url: `https://place.map.kakao.com/${id}`,
});

const mockResponse = (docs: ReturnType<typeof mockDoc>[]) => ({
  documents: docs,
  meta: { total_count: docs.length, pageable_count: docs.length, is_end: true },
});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_REST_KEY", "test-key");
});

describe("smartSearch relevance sort", () => {
  it("should use sort=accuracy instead of sort=distance when location provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse([mockDoc("1", "500")])),
      }),
    );

    await smartSearch({ query: "pizza", x: "127.0", y: "37.5" });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("sort")).toBe("accuracy");
  });
});

describe("viewportSearch relevance sort", () => {
  it("should use sort=accuracy instead of sort=distance when userLocation provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse([mockDoc("1", "500")])),
      }),
    );

    await viewportSearch({
      query: "pizza",
      bounds: { sw: { lat: 37.4, lng: 126.9 }, ne: { lat: 37.6, lng: 127.1 } },
      userLocation: { lat: 37.5, lng: 127.0 },
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = new URL(fetchCall[0] as string);
    expect(url.searchParams.get("sort")).toBe("accuracy");
  });
});

describe("deduplicateAndSort preserves insertion order", () => {
  it("should preserve relevance order instead of sorting by distance", async () => {
    // Results come back in relevance order from API: far restaurant first (more relevant), near second
    const far = mockDoc("far", "5000");
    const near = mockDoc("near", "100");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse([far, near])),
      }),
    );

    const results = await smartSearch({
      query: "pizza",
      x: "127.0",
      y: "37.5",
    });

    // Should preserve API order (relevance), NOT re-sort by distance
    expect(results[0].id).toBe("far");
    expect(results[1].id).toBe("near");
  });

  it("should still deduplicate results while preserving order", async () => {
    const doc1 = mockDoc("1", "5000");
    const doc2 = mockDoc("2", "100");
    const duplicate1 = mockDoc("1", "5000");

    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        const currentCall = ++callCount;
        const docs = currentCall === 1 ? [doc1, doc2] : [duplicate1];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse(docs)),
        });
      }),
    );

    const results = await smartSearch({ query: "chicken" });
    const ids = results.map((r) => r.id);

    // No duplicates
    expect(new Set(ids).size).toBe(ids.length);
    // Preserves insertion order (doc1 before doc2)
    expect(ids.indexOf("1")).toBeLessThan(ids.indexOf("2"));
  });
});
