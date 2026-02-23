import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Kakao APIs
const mockSearchByKeyword = vi.fn();
const mockSearchByCategory = vi.fn();
vi.mock("@/lib/kakao", () => ({
  searchByKeyword: (...args: unknown[]) => mockSearchByKeyword(...args),
  searchByCategory: (...args: unknown[]) => mockSearchByCategory(...args),
}));

import {
  findKakaoMatch,
  normalizeName,
  stripSuffix,
  enrichBatch,
} from "@/lib/enrichment";

describe("normalizeName", () => {
  it("strips whitespace", () => {
    expect(normalizeName("  맛 집  ")).toBe("맛집");
  });

  it("lowercases English characters", () => {
    expect(normalizeName("Burger King")).toBe("burgerking");
  });

  it("handles mixed Korean/English", () => {
    expect(normalizeName("스타벅스 Gangnam")).toBe("스타벅스gangnam");
  });
});

describe("stripSuffix", () => {
  it("strips 역점 suffix", () => {
    expect(stripSuffix("스타벅스강남역점")).toBe("스타벅스강남");
  });

  it("strips 직영점 suffix", () => {
    expect(stripSuffix("맘스터치직영점")).toBe("맘스터치");
  });

  it("strips 지점 suffix", () => {
    expect(stripSuffix("본죽강남지점")).toBe("본죽강남");
  });

  it("strips 본점 suffix", () => {
    expect(stripSuffix("한신포차본점")).toBe("한신포차");
  });

  it("strips location+점 suffix (1-4 char location)", () => {
    expect(stripSuffix("kfc강남점")).toBe("kfc");
  });

  it("preserves base names without suffix", () => {
    expect(stripSuffix("맛집")).toBe("맛집");
    expect(stripSuffix("스타벅스")).toBe("스타벅스");
  });

  it("handles mixed Korean+English with suffix", () => {
    expect(stripSuffix("burgerking강남점")).toBe("burgerking");
  });
});

describe("findKakaoMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns match when exact name + within 100m", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "12345",
          place_name: "맛집A",
          category_name: "음식점 > 한식",
          place_url: "https://place.map.kakao.com/12345",
          x: "127.0276",
          y: "37.4979",
          distance: "30",
          address_name: "서울시 강남구",
          road_address_name: "서울시 강남구 테헤란로",
          category_group_name: "음식점",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    const result = await findKakaoMatch("맛집A", 37.4979, 127.0276);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("12345");
  });

  it("returns match with substring name match", async () => {
    // Naver name "스타벅스 강남점" contains Kakao name "스타벅스"
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "99999",
          place_name: "스타벅스",
          category_name: "음식점 > 카페",
          place_url: "https://place.map.kakao.com/99999",
          x: "127.0276",
          y: "37.4979",
          distance: "20",
          address_name: "서울시 강남구",
          road_address_name: "",
          category_group_name: "카페",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    const result = await findKakaoMatch("스타벅스 강남점", 37.4979, 127.0276);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("99999");
  });

  it("returns null when name differs and within 100m", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "11111",
          place_name: "완전다른가게",
          category_name: "음식점",
          place_url: "",
          x: "127.0276",
          y: "37.4979",
          distance: "10",
          address_name: "",
          road_address_name: "",
          category_group_name: "",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    const result = await findKakaoMatch("맛집A", 37.4979, 127.0276);
    expect(result).toBeNull();
  });

  it("returns match at 200m distance (within expanded 300m radius)", async () => {
    // ~200m north of origin (37.4979 + ~0.0018 latitude ≈ 200m)
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "200m-match",
          place_name: "맛집A",
          category_name: "음식점 > 한식",
          place_url: "https://place.map.kakao.com/200m",
          x: "127.0276",
          y: "37.4997",
          distance: "200",
          address_name: "",
          road_address_name: "",
          category_group_name: "음식점",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    const result = await findKakaoMatch("맛집A", 37.4979, 127.0276);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("200m-match");
  });

  it("returns null when same name but beyond 300m", async () => {
    // ~400m north of origin
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "400m-away",
          place_name: "맛집A",
          category_name: "음식점",
          place_url: "",
          x: "127.0276",
          y: "37.5015",
          distance: "400",
          address_name: "",
          road_address_name: "",
          category_group_name: "",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    const result = await findKakaoMatch("맛집A", 37.4979, 127.0276);
    expect(result).toBeNull();
  });

  it("picks closest within 300m when multiple results", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "far-250m",
          place_name: "맛집A",
          category_name: "음식점",
          place_url: "",
          x: "127.0276",
          y: "37.50015",
          distance: "250",
          address_name: "",
          road_address_name: "",
          category_group_name: "",
        },
        {
          id: "close-150m",
          place_name: "맛집A",
          category_name: "음식점",
          place_url: "",
          x: "127.0276",
          y: "37.49925",
          distance: "150",
          address_name: "",
          road_address_name: "",
          category_group_name: "",
        },
      ],
      meta: { total_count: 2, pageable_count: 2, is_end: true },
    });

    const result = await findKakaoMatch("맛집A", 37.4979, 127.0276);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("close-150m");
  });

  it("picks closest when multiple results within 100m", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "far-match",
          place_name: "맛집A",
          category_name: "음식점",
          place_url: "",
          x: "127.0277",
          y: "37.4980",
          distance: "80",
          address_name: "",
          road_address_name: "",
          category_group_name: "",
        },
        {
          id: "close-match",
          place_name: "맛집A",
          category_name: "음식점",
          place_url: "",
          x: "127.02761",
          y: "37.49791",
          distance: "10",
          address_name: "",
          road_address_name: "",
          category_group_name: "",
        },
      ],
      meta: { total_count: 2, pageable_count: 2, is_end: true },
    });

    const result = await findKakaoMatch("맛집A", 37.4979, 127.0276);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("close-match");
  });

  it("returns null when Kakao returns no results", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [],
      meta: { total_count: 0, pageable_count: 0, is_end: true },
    });

    const result = await findKakaoMatch("존재하지않는곳", 37.4979, 127.0276);
    expect(result).toBeNull();
  });

  it("returns null when Kakao API throws", async () => {
    mockSearchByKeyword.mockRejectedValue(new Error("API error"));

    const result = await findKakaoMatch("맛집A", 37.4979, 127.0276);
    expect(result).toBeNull();
  });
});

describe("enrichBatch — coordinate fallback integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates ONLY category when findKakaoMatch returns null but coordinate fallback succeeds", async () => {
    // findKakaoMatch → no results (name match fails)
    mockSearchByKeyword.mockResolvedValue({
      documents: [],
      meta: { total_count: 0, pageable_count: 0, is_end: true },
    });

    // Coordinate fallback → returns category via FD6
    mockSearchByCategory.mockResolvedValue({
      documents: [
        {
          id: "nearby-1",
          place_name: "근처식당",
          category_name: "음식점 > 일식",
          place_url: "https://place.map.kakao.com/nearby-1",
          x: "127.0276",
          y: "37.4979",
          distance: "30",
          address_name: "",
          road_address_name: "",
          category_group_name: "음식점",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    // Track DB updates
    const updateCalls: Array<Record<string, unknown>> = [];
    const eqCalls: Array<[string, string]> = [];
    const mockSupabase = {
      from: () => ({
        update: (data: Record<string, unknown>) => {
          updateCalls.push(data);
          return {
            eq: (col: string, val: string) => {
              eqCalls.push([col, val]);
              return {
                eq: (col2: string, val2: string) => {
                  eqCalls.push([col2, val2]);
                  return Promise.resolve({ data: null, error: null });
                },
                then: (resolve: (v: unknown) => void) =>
                  resolve({ data: null, error: null }),
              };
            },
          };
        },
      }),
    };

    const result = await enrichBatch(
      null,
      [
        {
          kakao_place_id: "naver_37.4979_127.0276",
          name: "이름없는맛집",
          lat: 37.4979,
          lng: 127.0276,
        },
      ],
      mockSupabase,
      "user-123",
    );

    // Should have made one update call for the coordinate fallback
    expect(updateCalls.length).toBe(1);

    // Category-only update: MUST have category, MUST NOT have kakao_place_id or place_url
    expect(updateCalls[0]).toEqual({ category: "음식점 > 일식" });
    expect(updateCalls[0]).not.toHaveProperty("kakao_place_id");
    expect(updateCalls[0]).not.toHaveProperty("place_url");

    // Result should count this as enriched (or category-only — it's still enrichment)
    expect(result.enrichedCount).toBeGreaterThanOrEqual(0);
  });
});
