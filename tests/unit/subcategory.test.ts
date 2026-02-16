import { describe, it, expect } from "vitest";
import { extractSubcategory, groupBySubcategory } from "@/lib/subcategory";
import type { Restaurant } from "@/types";

describe("extractSubcategory", () => {
  it("should extract last segment from multi-level category", () => {
    expect(extractSubcategory("음식점 > 한식 > 냉면")).toBe("냉면");
  });

  it("should handle categories with commas in last segment", () => {
    expect(extractSubcategory("음식점 > 일식 > 초밥,롤")).toBe("초밥,롤");
  });

  it("should extract last segment from two-level category", () => {
    expect(extractSubcategory("음식점 > 한식")).toBe("한식");
  });

  it("should use entire string when no separator exists", () => {
    expect(extractSubcategory("음식점")).toBe("음식점");
  });

  it('should return "기타" for empty string', () => {
    expect(extractSubcategory("")).toBe("기타");
  });

  it('should return "기타" for undefined', () => {
    expect(extractSubcategory(undefined as unknown as string)).toBe("기타");
  });

  it('should return "기타" for null', () => {
    expect(extractSubcategory(null as unknown as string)).toBe("기타");
  });

  it("should trim whitespace from extracted segment", () => {
    expect(extractSubcategory("음식점 > 한식 >  냉면 ")).toBe("냉면");
  });
});

function makeRestaurant(
  overrides: Partial<Restaurant> & { category: string },
): Restaurant {
  return {
    id: overrides.id ?? "1",
    name: overrides.name ?? "Test",
    address: "서울",
    category: overrides.category,
    lat: 37.5,
    lng: 127.0,
    starRating: overrides.starRating ?? 1,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00Z",
  };
}

describe("groupBySubcategory", () => {
  it("should group restaurants by extracted subcategory", () => {
    const restaurants = [
      makeRestaurant({ id: "1", category: "음식점 > 한식 > 냉면" }),
      makeRestaurant({ id: "2", category: "음식점 > 일식 > 초밥" }),
      makeRestaurant({ id: "3", category: "음식점 > 한식 > 냉면" }),
    ];
    const groups = groupBySubcategory(restaurants);
    expect(groups).toHaveLength(2);
    const naengmyeon = groups.find((g) => g.subcategory === "냉면");
    expect(naengmyeon?.count).toBe(2);
    expect(naengmyeon?.restaurants).toHaveLength(2);
  });

  it("should sort groups alphabetically by subcategory name", () => {
    const restaurants = [
      makeRestaurant({ id: "1", category: "음식점 > 초밥" }),
      makeRestaurant({ id: "2", category: "음식점 > 냉면" }),
      makeRestaurant({ id: "3", category: "음식점 > 돈까스" }),
    ];
    const groups = groupBySubcategory(restaurants);
    expect(groups.map((g) => g.subcategory)).toEqual([
      "냉면",
      "돈까스",
      "초밥",
    ]);
  });

  it("should sort restaurants within group by starRating desc then createdAt desc", () => {
    const restaurants = [
      makeRestaurant({
        id: "1",
        category: "음식점 > 냉면",
        starRating: 1,
        createdAt: "2026-01-03T00:00:00Z",
      }),
      makeRestaurant({
        id: "2",
        category: "음식점 > 냉면",
        starRating: 3,
        createdAt: "2026-01-01T00:00:00Z",
      }),
      makeRestaurant({
        id: "3",
        category: "음식점 > 냉면",
        starRating: 3,
        createdAt: "2026-01-02T00:00:00Z",
      }),
    ];
    const groups = groupBySubcategory(restaurants);
    const ids = groups[0].restaurants.map((r) => r.id);
    expect(ids).toEqual(["3", "2", "1"]); // star 3 (newer) > star 3 (older) > star 1
  });

  it('should place "기타" group last', () => {
    const restaurants = [
      makeRestaurant({ id: "1", category: "" }),
      makeRestaurant({ id: "2", category: "음식점 > 냉면" }),
      makeRestaurant({ id: "3", category: "음식점 > 초밥" }),
    ];
    const groups = groupBySubcategory(restaurants);
    expect(groups[groups.length - 1].subcategory).toBe("기타");
    expect(groups.map((g) => g.subcategory)).toEqual(["냉면", "초밥", "기타"]);
  });

  it("should return empty array for empty input", () => {
    expect(groupBySubcategory([])).toEqual([]);
  });

  it("should group restaurants with same subcategory from different parents together", () => {
    const restaurants = [
      makeRestaurant({ id: "1", category: "음식점 > 한식 > 냉면" }),
      makeRestaurant({ id: "2", category: "음식점 > 분식 > 냉면" }),
    ];
    const groups = groupBySubcategory(restaurants);
    expect(groups).toHaveLength(1);
    expect(groups[0].subcategory).toBe("냉면");
    expect(groups[0].count).toBe(2);
  });
});
