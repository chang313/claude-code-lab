import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Kakao searchByKeyword
const mockSearchByKeyword = vi.fn();
vi.mock("@/lib/kakao", () => ({
  searchByKeyword: (...args: unknown[]) => mockSearchByKeyword(...args),
}));

import { findKakaoMatch, normalizeName } from "@/lib/enrichment";

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

  it("returns null when same name but beyond 100m", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "22222",
          place_name: "맛집A",
          category_name: "음식점",
          place_url: "",
          x: "127.03",
          y: "37.50",
          distance: "200",
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
