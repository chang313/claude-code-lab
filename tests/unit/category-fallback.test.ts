import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Kakao API
const mockSearchByKeyword = vi.fn();
const mockSearchByCategory = vi.fn();
vi.mock("@/lib/kakao", () => ({
  searchByKeyword: (...args: unknown[]) => mockSearchByKeyword(...args),
  searchByCategory: (...args: unknown[]) => mockSearchByCategory(...args),
}));

import { findCategoryByCoordinates } from "@/lib/enrichment";

describe("findCategoryByCoordinates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns category_name of closest FD6 result within 50m", async () => {
    mockSearchByCategory.mockResolvedValue({
      documents: [
        {
          id: "fd6-1",
          place_name: "근처식당",
          category_name: "음식점 > 한식 > 육류,고기",
          place_url: "https://place.map.kakao.com/fd6-1",
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

    const result = await findCategoryByCoordinates(37.4979, 127.0276);
    expect(result).toBe("음식점 > 한식 > 육류,고기");
    expect(mockSearchByCategory).toHaveBeenCalledWith(
      expect.objectContaining({ categoryGroupCode: "FD6" }),
    );
  });

  it("prefers FD6 over CE7 when FD6 has results", async () => {
    // FD6 returns results → should NOT call CE7
    mockSearchByCategory.mockResolvedValue({
      documents: [
        {
          id: "fd6-2",
          place_name: "음식점A",
          category_name: "음식점 > 중식",
          place_url: "",
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

    const result = await findCategoryByCoordinates(37.4979, 127.0276);
    expect(result).toBe("음식점 > 중식");
    // Should only be called once (FD6), not twice (FD6 + CE7)
    expect(mockSearchByCategory).toHaveBeenCalledTimes(1);
  });

  it("falls back to CE7 when FD6 returns no results", async () => {
    mockSearchByCategory
      .mockResolvedValueOnce({
        // FD6: no results
        documents: [],
        meta: { total_count: 0, pageable_count: 0, is_end: true },
      })
      .mockResolvedValueOnce({
        // CE7: has results
        documents: [
          {
            id: "ce7-1",
            place_name: "카페B",
            category_name: "음식점 > 카페",
            place_url: "",
            x: "127.0276",
            y: "37.4979",
            distance: "25",
            address_name: "",
            road_address_name: "",
            category_group_name: "카페",
          },
        ],
        meta: { total_count: 1, pageable_count: 1, is_end: true },
      });

    const result = await findCategoryByCoordinates(37.4979, 127.0276);
    expect(result).toBe("음식점 > 카페");
    expect(mockSearchByCategory).toHaveBeenCalledTimes(2);
    expect(mockSearchByCategory).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ categoryGroupCode: "FD6" }),
    );
    expect(mockSearchByCategory).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ categoryGroupCode: "CE7" }),
    );
  });

  it("returns null when no results within 50m", async () => {
    mockSearchByCategory
      .mockResolvedValueOnce({
        documents: [],
        meta: { total_count: 0, pageable_count: 0, is_end: true },
      })
      .mockResolvedValueOnce({
        documents: [],
        meta: { total_count: 0, pageable_count: 0, is_end: true },
      });

    const result = await findCategoryByCoordinates(37.4979, 127.0276);
    expect(result).toBeNull();
  });

  it("returns null on API error", async () => {
    mockSearchByCategory.mockRejectedValue(new Error("API error"));

    const result = await findCategoryByCoordinates(37.4979, 127.0276);
    expect(result).toBeNull();
  });
});
