import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Kakao API
const mockSearchByKeyword = vi.fn();
vi.mock("@/lib/kakao", () => ({
  searchByKeyword: (...args: unknown[]) => mockSearchByKeyword(...args),
}));

import { findCategoryByCoordinates } from "@/lib/enrichment";

describe("findCategoryByCoordinates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns category_name when name search finds a result within 50m", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [
        {
          id: "place-1",
          place_name: "신리성지",
          category_name: "여행 > 관광,명소 > 성지",
          place_url: "https://place.map.kakao.com/place-1",
          x: "126.7712",
          y: "36.7625",
          distance: "30",
          address_name: "",
          road_address_name: "",
          category_group_name: "",
        },
      ],
      meta: { total_count: 1, pageable_count: 1, is_end: true },
    });

    const result = await findCategoryByCoordinates(36.7625, 126.7712, "신리성지");
    expect(result).toBe("여행 > 관광,명소 > 성지");
    expect(mockSearchByKeyword).toHaveBeenCalledWith(
      expect.objectContaining({ query: "신리성지", radius: 50 }),
    );
  });

  it("returns null when name search returns no results", async () => {
    mockSearchByKeyword.mockResolvedValue({
      documents: [],
      meta: { total_count: 0, pageable_count: 0, is_end: true },
    });

    const result = await findCategoryByCoordinates(37.4979, 127.0276, "존재하지않는곳");
    expect(result).toBeNull();
  });

  it("returns null when no name is provided", async () => {
    const result = await findCategoryByCoordinates(37.4979, 127.0276);
    expect(result).toBeNull();
    expect(mockSearchByKeyword).not.toHaveBeenCalled();
  });

  it("returns null on API error", async () => {
    mockSearchByKeyword.mockRejectedValue(new Error("API error"));

    const result = await findCategoryByCoordinates(37.4979, 127.0276, "맛집");
    expect(result).toBeNull();
  });
});
