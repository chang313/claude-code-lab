import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { KakaoPlace } from "@/types";

// --- Chainable Supabase mock builder ---

function createChainMock(result: { data?: unknown; error?: unknown; count?: number }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "neq", "order", "is", "not", "maybeSingle"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = vi.fn((resolve: (v: unknown) => void) =>
    resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count }),
  );
  return chain;
}

let mockInsertResult: { data?: unknown; error?: unknown } = { error: null };
let mockUpdateResult: { data?: unknown; error?: unknown } = { error: null };
let mockUser: { id: string } | null = { id: "user-1" };

let insertCalls: { table: string; data: unknown }[] = [];
let updateCalls: { table: string; data: unknown }[] = [];

const mockAuth = {
  getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
};

const mockFrom = vi.fn((table: string) => {
  const insertChain = createChainMock(mockInsertResult);
  const originalInsert = insertChain.insert as Function;
  insertChain.insert = vi.fn((data: unknown) => {
    insertCalls.push({ table, data });
    return originalInsert(data);
  });

  const updateChain = createChainMock(mockUpdateResult);
  const originalUpdate = updateChain.update as Function;
  updateChain.update = vi.fn((data: unknown) => {
    updateCalls.push({ table, data });
    return originalUpdate(data);
  });

  const deleteChain = createChainMock({ error: null });

  return {
    insert: insertChain.insert,
    update: updateChain.update,
    delete: deleteChain.delete,
    select: insertChain.select,
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: mockAuth,
    from: mockFrom,
  }),
}));

const invalidateCalls: string[] = [];
vi.mock("@/lib/supabase/invalidate", () => ({
  invalidate: (key: string) => invalidateCalls.push(key),
  subscribe: () => () => {},
  invalidateAll: () => {},
}));

vi.mock("@/lib/supabase/use-query", () => ({
  useSupabaseQuery: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@/lib/subcategory", () => ({
  groupBySubcategory: (restaurants: unknown[]) => restaurants,
}));

import {
  useAddRestaurant,
  useMarkAsVisited,
  useMoveToWishlist,
} from "@/db/hooks";

// --- Fixtures ---

const mockPlace: KakaoPlace = {
  id: "kakao-456",
  place_name: "맛있는 피자",
  address_name: "서울 서초구 서초대로 1",
  road_address_name: "서울 서초구 서초대로 1",
  category_group_name: "음식점",
  category_name: "음식점 > 피자",
  x: "127.0200",
  y: "37.4900",
  place_url: "https://place.map.kakao.com/kakao-456",
};

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertResult = { error: null };
  mockUpdateResult = { error: null };
  mockUser = { id: "user-1" };
  insertCalls = [];
  updateCalls = [];
  invalidateCalls.length = 0;
});

describe("useAddRestaurant", () => {
  it("T009: inserts with star_rating null by default (wishlist)", async () => {
    const { result } = renderHook(() => useAddRestaurant());

    let success = false;
    await act(async () => {
      success = await result.current.addRestaurant(mockPlace);
    });

    expect(success).toBe(true);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].table).toBe("restaurants");
    expect(insertCalls[0].data).toEqual(
      expect.objectContaining({
        user_id: "user-1",
        kakao_place_id: "kakao-456",
        name: "맛있는 피자",
        star_rating: null,
        lat: 37.49,
        lng: 127.02,
      }),
    );
    expect(invalidateCalls).toContain("restaurants");
  });

  it("T019: inserts with explicit starRating when provided (visited)", async () => {
    const { result } = renderHook(() => useAddRestaurant());

    let success = false;
    await act(async () => {
      success = await result.current.addRestaurant(mockPlace, 2);
    });

    expect(success).toBe(true);
    expect(insertCalls[0].data).toEqual(
      expect.objectContaining({
        star_rating: 2,
      }),
    );
  });
});

describe("useMarkAsVisited", () => {
  it("T010: updates star_rating from null to given rating", async () => {
    const { result } = renderHook(() => useMarkAsVisited());

    await act(async () => {
      await result.current.markAsVisited("kakao-456", 3);
    });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].table).toBe("restaurants");
    expect(updateCalls[0].data).toEqual({ star_rating: 3 });
    expect(invalidateCalls).toContain("restaurants");
    expect(invalidateCalls).toContain("wishlisted:kakao-456");
  });

  it("accepts rating value 5 (new max)", async () => {
    const { result } = renderHook(() => useMarkAsVisited());

    await act(async () => {
      await result.current.markAsVisited("kakao-456", 5);
    });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].data).toEqual({ star_rating: 5 });
  });
});

describe("useMoveToWishlist", () => {
  it("T017: sets star_rating to null", async () => {
    const { result } = renderHook(() => useMoveToWishlist());

    await act(async () => {
      await result.current.moveToWishlist("kakao-456");
    });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].table).toBe("restaurants");
    expect(updateCalls[0].data).toEqual({ star_rating: null });
    expect(invalidateCalls).toContain("restaurants");
    expect(invalidateCalls).toContain("wishlisted:kakao-456");
  });
});
