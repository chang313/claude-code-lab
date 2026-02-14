import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/index";
import { normalizeMenuName } from "@/lib/normalize";
import type { KakaoPlace, Restaurant } from "@/types";

const mockPlace: KakaoPlace = {
  id: "place-1",
  place_name: "Test Restaurant",
  address_name: "서울시 강남구",
  road_address_name: "서울시 강남구 테헤란로 1",
  category_group_name: "음식점",
  category_name: "음식점 > 한식",
  x: "127.0",
  y: "37.5",
  place_url: "https://place.map.kakao.com/place-1",
};

function kakaoToRestaurant(
  place: KakaoPlace,
  starRating = 1,
): Restaurant {
  return {
    id: place.id,
    name: place.place_name,
    address: place.road_address_name || place.address_name,
    category: place.category_name,
    lat: parseFloat(place.y),
    lng: parseFloat(place.x),
    placeUrl: place.place_url,
    starRating,
    createdAt: new Date().toISOString(),
  };
}

beforeEach(async () => {
  await db.restaurants.clear();
  await db.menuItems.clear();
});

describe("Restaurant wishlist operations", () => {
  it("should add a restaurant with default starRating=1", async () => {
    const restaurant = kakaoToRestaurant(mockPlace);
    await db.restaurants.add(restaurant);

    const saved = await db.restaurants.get("place-1");
    expect(saved).toBeDefined();
    expect(saved!.starRating).toBe(1);
    expect(saved!.name).toBe("Test Restaurant");
  });

  it("should detect duplicate by Kakao place ID (FR-004)", async () => {
    const restaurant = kakaoToRestaurant(mockPlace);
    await db.restaurants.add(restaurant);

    const existing = await db.restaurants.get(mockPlace.id);
    expect(existing).toBeDefined();
  });

  it("should sort by starRating desc then createdAt desc (FR-012)", async () => {
    const now = Date.now();
    await db.restaurants.bulkAdd([
      kakaoToRestaurant(
        { ...mockPlace, id: "a", place_name: "A" },
        1,
      ),
      kakaoToRestaurant(
        { ...mockPlace, id: "b", place_name: "B" },
        3,
      ),
      kakaoToRestaurant(
        { ...mockPlace, id: "c", place_name: "C" },
        2,
      ),
    ]);

    // Update createdAt to control sort order within same rating
    await db.restaurants.update("a", {
      createdAt: new Date(now - 1000).toISOString(),
    });
    await db.restaurants.update("b", {
      createdAt: new Date(now).toISOString(),
    });
    await db.restaurants.update("c", {
      createdAt: new Date(now - 500).toISOString(),
    });

    const sorted = await db.restaurants
      .orderBy("[starRating+createdAt]")
      .reverse()
      .toArray();

    expect(sorted[0].id).toBe("b"); // 3 stars
    expect(sorted[1].id).toBe("c"); // 2 stars
    expect(sorted[2].id).toBe("a"); // 1 star
  });

  it("should update star rating (FR-013)", async () => {
    await db.restaurants.add(kakaoToRestaurant(mockPlace));
    await db.restaurants.update("place-1", { starRating: 3 });

    const updated = await db.restaurants.get("place-1");
    expect(updated!.starRating).toBe(3);
  });
});

describe("Menu item operations", () => {
  it("should derive normalizedName from name (FR-008)", () => {
    expect(normalizeMenuName("Tonkatsu")).toBe("tonkatsu");
    expect(normalizeMenuName("  TONKATSU  ")).toBe("tonkatsu");
    expect(normalizeMenuName("tonkatsu")).toBe("tonkatsu");
  });

  it("should add menu item with normalizedName", async () => {
    await db.menuItems.add({
      restaurantId: "place-1",
      name: "Tonkatsu",
      normalizedName: normalizeMenuName("Tonkatsu"),
      createdAt: new Date().toISOString(),
    });

    const items = await db.menuItems
      .where("restaurantId")
      .equals("place-1")
      .toArray();
    expect(items).toHaveLength(1);
    expect(items[0].normalizedName).toBe("tonkatsu");
  });

  it("should cascade-delete menu items when restaurant removed (FR-009)", async () => {
    await db.restaurants.add(kakaoToRestaurant(mockPlace));
    await db.menuItems.bulkAdd([
      {
        restaurantId: "place-1",
        name: "Tonkatsu",
        normalizedName: "tonkatsu",
        createdAt: new Date().toISOString(),
      },
      {
        restaurantId: "place-1",
        name: "Ramen",
        normalizedName: "ramen",
        createdAt: new Date().toISOString(),
      },
    ]);

    await db.transaction("rw", db.restaurants, db.menuItems, async () => {
      await db.menuItems.where("restaurantId").equals("place-1").delete();
      await db.restaurants.delete("place-1");
    });

    const restaurant = await db.restaurants.get("place-1");
    const items = await db.menuItems
      .where("restaurantId")
      .equals("place-1")
      .toArray();

    expect(restaurant).toBeUndefined();
    expect(items).toHaveLength(0);
  });
});

describe("Menu grouping operations", () => {
  it("should group restaurants by normalizedName (FR-006, FR-008)", async () => {
    await db.menuItems.bulkAdd([
      {
        restaurantId: "r1",
        name: "Tonkatsu",
        normalizedName: "tonkatsu",
        createdAt: new Date().toISOString(),
      },
      {
        restaurantId: "r2",
        name: "tonkatsu",
        normalizedName: "tonkatsu",
        createdAt: new Date().toISOString(),
      },
      {
        restaurantId: "r1",
        name: "Ramen",
        normalizedName: "ramen",
        createdAt: new Date().toISOString(),
      },
    ]);

    const tonkatsuItems = await db.menuItems
      .where("normalizedName")
      .equals("tonkatsu")
      .toArray();
    const restaurantIds = [...new Set(tonkatsuItems.map((i) => i.restaurantId))];

    expect(restaurantIds).toHaveLength(2);
    expect(restaurantIds).toContain("r1");
    expect(restaurantIds).toContain("r2");
  });
});
