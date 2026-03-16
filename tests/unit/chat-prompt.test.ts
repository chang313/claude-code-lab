import { describe, it, expect } from "vitest";
import {
  extractCuisine,
  groupPlacesByCuisine,
  formatPlace,
  type DbPlace,
} from "@/app/api/agent/chat/route";

describe("extractCuisine", () => {
  it("extracts second-level category from full path", () => {
    expect(extractCuisine("음식점 > 한식 > 삼겹살")).toBe("한식");
  });

  it("extracts second-level from two-part path", () => {
    expect(extractCuisine("카페 > 커피전문점")).toBe("커피전문점");
  });

  it("returns as-is for single category", () => {
    expect(extractCuisine("카페")).toBe("카페");
  });

  it("handles empty string", () => {
    expect(extractCuisine("")).toBe("");
  });
});

describe("groupPlacesByCuisine", () => {
  const makePlaces = (categories: string[]): DbPlace[] =>
    categories.map((category, i) => ({
      kakao_place_id: `id-${i}`,
      name: `Place ${i}`,
      category,
      address: "서울 강남구 역삼동",
      star_rating: null,
      place_url: null,
    }));

  it("groups places by cuisine", () => {
    const places = makePlaces([
      "음식점 > 한식 > 삼겹살",
      "음식점 > 한식 > 국밥",
      "음식점 > 일식",
    ]);
    const groups = groupPlacesByCuisine(places);
    expect(groups.size).toBe(2);
    expect(groups.get("한식")!.length).toBe(2);
    expect(groups.get("일식")!.length).toBe(1);
  });

  it("returns empty map for empty list", () => {
    const groups = groupPlacesByCuisine([]);
    expect(groups.size).toBe(0);
  });

  it("groups cafe subcategories under second-level key", () => {
    const places = makePlaces(["카페 > 커피전문점", "카페 > 디저트카페"]);
    const groups = groupPlacesByCuisine(places);
    expect(groups.has("커피전문점")).toBe(true);
    expect(groups.has("디저트카페")).toBe(true);
  });
});

describe("formatPlace", () => {
  it("formats rated place with star rating", () => {
    const place: DbPlace = {
      kakao_place_id: "12345",
      name: "교촌치킨",
      category: "음식점 > 치킨",
      address: "서울 강남구 역삼동 123-4",
      star_rating: 4,
      place_url: null,
    };
    const result = formatPlace(place);
    expect(result).toBe("- 교촌치킨 (id:12345) | 서울 강남구 역삼동 | ★4");
  });

  it("formats unvisited place as wishlist", () => {
    const place: DbPlace = {
      kakao_place_id: "67890",
      name: "스시집",
      category: "음식점 > 일식",
      address: "서울 마포구 합정동",
      star_rating: null,
      place_url: null,
    };
    const result = formatPlace(place);
    expect(result).toContain("아직 안 가봄");
  });

  it("truncates address to first 3 words", () => {
    const place: DbPlace = {
      kakao_place_id: "11111",
      name: "맛집",
      category: "음식점",
      address: "경기도 성남시 분당구 판교역로 235",
      star_rating: 3,
      place_url: null,
    };
    const result = formatPlace(place);
    expect(result).toContain("경기도 성남시 분당구");
    expect(result).not.toContain("판교역로");
  });
});
