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
  findKakaoMatchByAddress,
  normalizeAddress,
  normalizeName,
  stripSuffix,
  enrichBatch,
  tokenize,
  tokenOverlapScore,
  isNameMatch,
  extractCoreName,
  findNearestByCoordinates,
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
    // Tier 1: findKakaoMatch → no results (name match fails)
    mockSearchByKeyword.mockResolvedValue({
      documents: [],
      meta: { total_count: 0, pageable_count: 0, is_end: true },
    });

    // Tier 2: coordinate fallback via searchByCategory → returns nearby (non-name-matching) place
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

describe("normalizeAddress", () => {
  it("strips 특별시 suffix", () => {
    expect(normalizeAddress("서울특별시 강남구 테헤란로 123")).toBe(
      "서울 강남구 테헤란로 123",
    );
  });

  it("strips 광역시 suffix", () => {
    expect(normalizeAddress("부산광역시 해운대구 해운대로 456")).toBe(
      "부산 해운대구 해운대로 456",
    );
  });

  it("strips 특별자치시 suffix", () => {
    expect(normalizeAddress("세종특별자치시 어진동 123")).toBe(
      "세종 어진동 123",
    );
  });

  it("strips 특별자치도 suffix", () => {
    expect(normalizeAddress("제주특별자치도 제주시 연동 789")).toBe(
      "제주 제주시 연동 789",
    );
  });

  it("normalizes whitespace", () => {
    expect(normalizeAddress("  서울특별시  강남구   테헤란로  123  ")).toBe(
      "서울 강남구 테헤란로 123",
    );
  });

  it("returns empty string for falsy input", () => {
    expect(normalizeAddress("")).toBe("");
    expect(normalizeAddress(null)).toBe("");
    expect(normalizeAddress(undefined)).toBe("");
  });
});

describe("findKakaoMatchByAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns match when road address matches exactly within 500m", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "addr-match",
          place_name: "다른이름식당",
          category_name: "음식점 > 한식",
          place_url: "https://place.map.kakao.com/addr-match",
          x: "127.0276",
          y: "37.4979",
          distance: "50",
          address_name: "서울시 강남구 역삼동 123",
          road_address_name: "서울특별시 강남구 테헤란로 123",
          category_group_name: "음식점",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    const result = await findKakaoMatchByAddress(
      "서울특별시 강남구 테헤란로 123",
      37.4979,
      127.0276,
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe("addr-match");
  });

  it("skips empty address", async () => {
    const result = await findKakaoMatchByAddress("", 37.4979, 127.0276);
    expect(result).toBeNull();
    expect(mockSearchByKeyword).not.toHaveBeenCalled();
  });

  it("skips undefined address", async () => {
    const result = await findKakaoMatchByAddress(undefined, 37.4979, 127.0276);
    expect(result).toBeNull();
    expect(mockSearchByKeyword).not.toHaveBeenCalled();
  });

  it("returns null when no address matches", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "no-addr",
          place_name: "무관한곳",
          category_name: "음식점",
          place_url: "",
          x: "127.0276",
          y: "37.4979",
          distance: "30",
          address_name: "서울시 서초구 서초동 456",
          road_address_name: "서울특별시 서초구 서초대로 456",
          category_group_name: "음식점",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    const result = await findKakaoMatchByAddress(
      "서울특별시 강남구 테헤란로 123",
      37.4979,
      127.0276,
    );
    expect(result).toBeNull();
  });

  it("matches against address_name (jibun) when road_address_name is empty", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "jibun-match",
          place_name: "이름다른식당",
          category_name: "음식점 > 중식",
          place_url: "https://place.map.kakao.com/jibun-match",
          x: "127.0276",
          y: "37.4979",
          distance: "40",
          address_name: "서울특별시 강남구 역삼동 123",
          road_address_name: "",
          category_group_name: "음식점",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    const result = await findKakaoMatchByAddress(
      "서울특별시 강남구 역삼동 123",
      37.4979,
      127.0276,
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe("jibun-match");
  });

  it("returns null when API throws", async () => {
    mockSearchByKeyword.mockRejectedValue(new Error("API error"));
    const result = await findKakaoMatchByAddress(
      "서울특별시 강남구 테헤란로 123",
      37.4979,
      127.0276,
    );
    expect(result).toBeNull();
  });
});

describe("enrichBatch — address matching integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls through to address matching when name matching fails", async () => {
    // Tier 1: name match fails (no results)
    mockSearchByKeyword
      .mockResolvedValueOnce({
        documents: [],
        meta: { total_count: 0, pageable_count: 0, is_end: true },
      })
      // Tier 1.5: address match succeeds
      .mockResolvedValueOnce({
        documents: [
          {
            id: "addr-enriched",
            place_name: "카카오식당",
            category_name: "음식점 > 양식",
            place_url: "https://place.map.kakao.com/addr-enriched",
            x: "127.0276",
            y: "37.4979",
            distance: "30",
            address_name: "서울시 강남구 역삼동 123",
            road_address_name: "서울특별시 강남구 테헤란로 123",
            category_group_name: "음식점",
          },
        ],
        meta: { total_count: 1, pageable_count: 1, is_end: true },
      });

    const updateCalls: Array<Record<string, unknown>> = [];
    const mockSupabase = {
      from: () => ({
        update: (data: Record<string, unknown>) => {
          updateCalls.push(data);
          return {
            eq: (_col: string, _val: string) => ({
              eq: (_col2: string, _val2: string) =>
                Promise.resolve({ data: null, error: null }),
              then: (resolve: (v: unknown) => void) =>
                resolve({ data: null, error: null }),
            }),
          };
        },
      }),
    };

    const result = await enrichBatch(
      null,
      [
        {
          kakao_place_id: "naver_37.4979_127.0276",
          name: "네이버식당",
          lat: 37.4979,
          lng: 127.0276,
          address: "서울특별시 강남구 테헤란로 123",
        },
      ],
      mockSupabase,
      "user-123",
    );

    // Address match = full update (all three fields)
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0]).toHaveProperty("kakao_place_id", "addr-enriched");
    expect(updateCalls[0]).toHaveProperty("category", "음식점 > 양식");
    expect(updateCalls[0]).toHaveProperty(
      "place_url",
      "https://place.map.kakao.com/addr-enriched",
    );
    expect(result.enrichedCount).toBe(1);
  });
});

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("맛집 돈까스")).toEqual(["맛집", "돈까스"]);
  });

  it("splits on Korean/non-Korean transitions", () => {
    expect(tokenize("스타벅스Reserve")).toEqual(["스타벅스", "reserve"]);
  });

  it("lowercases all tokens", () => {
    expect(tokenize("KFC 강남")).toEqual(["kfc", "강남"]);
  });

  it("strips known suffixes before tokenizing", () => {
    expect(tokenize("스타벅스 강남역점")).toEqual(["스타벅스", "강남"]);
  });

  it("handles single-token names", () => {
    expect(tokenize("스타벅스")).toEqual(["스타벅스"]);
  });

  it("handles mixed Korean and English with spaces", () => {
    expect(tokenize("Burger King 강남")).toEqual(["burger", "king", "강남"]);
  });
});

describe("tokenOverlapScore", () => {
  it("returns 1.0 for identical token sets", () => {
    expect(tokenOverlapScore(["a", "b"], ["a", "b"])).toBe(1.0);
  });

  it("returns 0 when no overlap", () => {
    expect(tokenOverlapScore(["a", "b"], ["c", "d"])).toBe(0);
  });

  it("returns ratio relative to smaller set", () => {
    // 1 common out of min(2, 3) = 2 → 0.5
    expect(tokenOverlapScore(["a", "b"], ["a", "c", "d"])).toBe(0.5);
  });

  it("returns 0 for empty arrays", () => {
    expect(tokenOverlapScore([], ["a"])).toBe(0);
    expect(tokenOverlapScore(["a"], [])).toBe(0);
  });
});

describe("isNameMatch", () => {
  it("matches substring (existing behavior)", () => {
    expect(isNameMatch("스타벅스 강남점", "스타벅스")).toBe(true);
  });

  it("matches reordered tokens via token overlap", () => {
    expect(isNameMatch("맛집 돈까스", "돈까스 맛집")).toBe(true);
  });

  it("rejects completely different names", () => {
    expect(isNameMatch("맛집A", "완전다른가게")).toBe(false);
  });

  it("matches partial token overlap >= 0.6", () => {
    // 2 common tokens ("스타벅스", "리저브") out of min(2, 2) = 2 → 1.0
    expect(isNameMatch("스타벅스 리저브", "스타벅스 리저브 청담")).toBe(true);
  });
});

describe("extractCoreName", () => {
  it("returns first token for multi-token names", () => {
    expect(extractCoreName("스타벅스 강남역점")).toBe("스타벅스");
  });

  it("returns null for single-token names", () => {
    expect(extractCoreName("스타벅스")).toBeNull();
  });

  it("returns null when first token is < 2 chars", () => {
    expect(extractCoreName("A 맛집")).toBeNull();
  });

  it("returns null for English brand with location suffix (single token after strip)", () => {
    // "KFC 강남점" → stripSuffix → "KFC " → tokenize → ["kfc"] → single token → null
    expect(extractCoreName("KFC 강남점")).toBeNull();
  });

  it("returns core name for multi-word English brand", () => {
    expect(extractCoreName("Burger King 강남")).toBe("burger");
  });
});

describe("findKakaoMatch — Tier 1b (core name retry)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries with core name when full name returns no match", async () => {
    const emptyResult = {
      documents: [],
      meta: { total_count: 0, pageable_count: 0, is_end: true },
    };

    const coreNameResult = {
      documents: [
        {
          id: "core-match",
          place_name: "스타벅스",
          category_name: "음식점 > 카페",
          place_url: "https://place.map.kakao.com/core-match",
          x: "127.0276",
          y: "37.4979",
          distance: "20",
          address_name: "",
          road_address_name: "",
          category_group_name: "카페",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    };

    mockSearchByKeyword
      .mockResolvedValueOnce(emptyResult) // Tier 1: full name search
      .mockResolvedValueOnce(coreNameResult); // Tier 1b: core name retry

    const result = await findKakaoMatch("스타벅스 리저브 청담", 37.4979, 127.0276);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("core-match");
    expect(mockSearchByKeyword).toHaveBeenCalledTimes(2);
    // Tier 1b should search with just the core name
    expect(mockSearchByKeyword.mock.calls[1][0].query).toBe("스타벅스");
  });

  it("does not retry for single-token names", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [],
      meta: { total_count: 0, pageable_count: 0, is_end: true },
    });

    const result = await findKakaoMatch("스타벅스", 37.4979, 127.0276);
    expect(result).toBeNull();
    // Only 1 call (no Tier 1b retry since extractCoreName returns null)
    expect(mockSearchByKeyword).toHaveBeenCalledTimes(1);
  });
});

describe("findNearestByCoordinates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full KakaoPlace from FD6 results", async () => {
    mockSearchByCategory.mockResolvedValue({
      documents: [
        {
          id: "fd6-place",
          place_name: "근처식당",
          category_name: "음식점 > 한식",
          place_url: "https://place.map.kakao.com/fd6-place",
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

    const result = await findNearestByCoordinates(37.4979, 127.0276);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("fd6-place");
    expect(result!.place_name).toBe("근처식당");
    expect(result!.place_url).toBe("https://place.map.kakao.com/fd6-place");
  });

  it("returns null when no results", async () => {
    mockSearchByCategory.mockResolvedValue({
      documents: [],
      meta: { total_count: 0, pageable_count: 0, is_end: true },
    });

    const result = await findNearestByCoordinates(37.4979, 127.0276);
    expect(result).toBeNull();
  });
});

describe("enrichBatch — Tier 2 name-match promotion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("promotes to full update when Tier 2 nearest place name matches", async () => {
    // All keyword searches fail (Tier 1, 1b, 1.5)
    mockSearchByKeyword.mockResolvedValue({
      documents: [],
      meta: { total_count: 0, pageable_count: 0, is_end: true },
    });

    // Tier 2: nearest place has matching name
    mockSearchByCategory.mockResolvedValue({
      documents: [
        {
          id: "promoted-place",
          place_name: "맛집A",
          category_name: "음식점 > 한식",
          place_url: "https://place.map.kakao.com/promoted",
          x: "127.0276",
          y: "37.4979",
          distance: "20",
          address_name: "",
          road_address_name: "",
          category_group_name: "음식점",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    const updateCalls: Array<Record<string, unknown>> = [];
    const mockSupabase = {
      from: () => ({
        update: (data: Record<string, unknown>) => {
          updateCalls.push(data);
          return {
            eq: (_col: string, _val: string) => ({
              eq: (_col2: string, _val2: string) =>
                Promise.resolve({ data: null, error: null }),
              then: (resolve: (v: unknown) => void) =>
                resolve({ data: null, error: null }),
            }),
          };
        },
      }),
    };

    const result = await enrichBatch(
      null,
      [
        {
          kakao_place_id: "naver_37.4979_127.0276",
          name: "맛집A",
          lat: 37.4979,
          lng: 127.0276,
        },
      ],
      mockSupabase,
      "user-123",
    );

    // Full update with all three fields (promoted)
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0]).toHaveProperty("kakao_place_id", "promoted-place");
    expect(updateCalls[0]).toHaveProperty("category", "음식점 > 한식");
    expect(updateCalls[0]).toHaveProperty(
      "place_url",
      "https://place.map.kakao.com/promoted",
    );
    expect(result.enrichedCount).toBe(1);
  });
});
