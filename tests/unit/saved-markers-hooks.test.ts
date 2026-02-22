import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { SavedMarkerData, Bounds, KakaoPlace } from "@/types";

// --- Supabase mock ---

let mockQueryData: unknown = undefined;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: "user-1" } }, error: null }),
      ),
    },
    from: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/invalidate", () => ({
  invalidate: () => {},
  subscribe: () => () => {},
  invalidateAll: () => {},
}));

vi.mock("@/lib/supabase/use-query", () => ({
  useSupabaseQuery: () => ({ data: mockQueryData, isLoading: false }),
}));

import { useSavedRestaurantsForMap } from "@/db/hooks";
import { mergeMarkers, isInViewport } from "@/lib/merge-markers";

// === T009: useSavedRestaurantsForMap() tests ===

describe("useSavedRestaurantsForMap", () => {
  beforeEach(() => {
    mockQueryData = undefined;
  });

  it("returns empty array when useSupabaseQuery returns undefined", () => {
    mockQueryData = undefined;
    const { result } = renderHook(() => useSavedRestaurantsForMap());
    expect(result.current.data).toEqual([]);
  });

  it("returns data from useSupabaseQuery when available", () => {
    const expected: SavedMarkerData[] = [
      {
        kakaoPlaceId: "place-1",
        name: "Test Restaurant",
        lat: 37.5,
        lng: 127.0,
        starRating: null,
        category: "한식",
      },
      {
        kakaoPlaceId: "place-2",
        name: "Visited Place",
        lat: 37.6,
        lng: 127.1,
        starRating: 4,
        category: "일식",
      },
    ];
    mockQueryData = expected;

    const { result } = renderHook(() => useSavedRestaurantsForMap());
    expect(result.current.data).toEqual(expected);
  });
});

// === T010: mergeMarkers() tests ===

const sampleBounds: Bounds = {
  sw: { lat: 37.0, lng: 126.5 },
  ne: { lat: 38.0, lng: 127.5 },
};

const searchResults: KakaoPlace[] = [
  {
    id: "place-1",
    place_name: "Shared Place",
    address_name: "addr1",
    road_address_name: "road1",
    category_group_name: "음식점",
    category_name: "한식",
    x: "127.0",
    y: "37.5",
    place_url: "http://example.com/1",
  },
  {
    id: "place-3",
    place_name: "Search Only",
    address_name: "addr3",
    road_address_name: "road3",
    category_group_name: "음식점",
    category_name: "양식",
    x: "127.2",
    y: "37.7",
    place_url: "http://example.com/3",
  },
];

const savedMarkers: SavedMarkerData[] = [
  {
    kakaoPlaceId: "place-1",
    name: "Shared Place",
    lat: 37.5,
    lng: 127.0,
    starRating: 3,
    category: "한식",
  },
  {
    kakaoPlaceId: "place-2",
    name: "Saved Only",
    lat: 37.6,
    lng: 127.1,
    starRating: null,
    category: "일식",
  },
];

describe("mergeMarkers", () => {
  it("replaces search result with saved marker when same kakao_place_id", () => {
    const result = mergeMarkers(searchResults, savedMarkers, sampleBounds, true);
    const sharedMarker = result.find((m) => m.id === "place-1");
    expect(sharedMarker).toBeDefined();
    expect(sharedMarker!.markerType).toBe("visited");
    expect(sharedMarker!.starRating).toBe(3);
  });

  it("adds saved-only markers when in viewport and toggle on", () => {
    const result = mergeMarkers(searchResults, savedMarkers, sampleBounds, true);
    const savedOnly = result.find((m) => m.id === "place-2");
    expect(savedOnly).toBeDefined();
    expect(savedOnly!.markerType).toBe("wishlist");
    expect(savedOnly!.name).toBe("Saved Only");
  });

  it("excludes saved-only markers when toggle is off", () => {
    const result = mergeMarkers(searchResults, savedMarkers, sampleBounds, false);
    const savedOnly = result.find((m) => m.id === "place-2");
    expect(savedOnly).toBeUndefined();
  });

  it("still applies saved style to search matches even when toggle is off", () => {
    const result = mergeMarkers(searchResults, savedMarkers, sampleBounds, false);
    const sharedMarker = result.find((m) => m.id === "place-1");
    expect(sharedMarker!.markerType).toBe("visited");
  });

  it("returns search-only markers unchanged", () => {
    const result = mergeMarkers(searchResults, savedMarkers, sampleBounds, true);
    const searchOnly = result.find((m) => m.id === "place-3");
    expect(searchOnly).toBeDefined();
    expect(searchOnly!.markerType).toBe("search");
  });

  it("returns empty array when no results and no saved markers", () => {
    const result = mergeMarkers([], [], sampleBounds, true);
    expect(result).toEqual([]);
  });

  it("sets markerType to wishlist when starRating is null", () => {
    const result = mergeMarkers([], savedMarkers, sampleBounds, true);
    const wishlistMarker = result.find((m) => m.id === "place-2");
    expect(wishlistMarker!.markerType).toBe("wishlist");
  });

  it("sets markerType to visited when starRating is 1-5", () => {
    const result = mergeMarkers([], savedMarkers, sampleBounds, true);
    const visitedMarker = result.find((m) => m.id === "place-1");
    expect(visitedMarker!.markerType).toBe("visited");
    expect(visitedMarker!.starRating).toBe(3);
  });
});

// === isInViewport() tests ===

describe("isInViewport", () => {
  it("returns true when marker is within bounds", () => {
    expect(isInViewport({ lat: 37.5, lng: 127.0 }, sampleBounds)).toBe(true);
  });

  it("returns false when marker is outside bounds", () => {
    expect(isInViewport({ lat: 39.0, lng: 127.0 }, sampleBounds)).toBe(false);
  });

  it("returns true when bounds is null (show all)", () => {
    expect(isInViewport({ lat: 37.5, lng: 127.0 }, null)).toBe(true);
  });
});
