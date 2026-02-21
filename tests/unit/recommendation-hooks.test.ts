import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Recommendation, Restaurant } from "@/types";

// --- Chainable Supabase mock builder ---

function createChainMock(result: { data?: unknown; error?: unknown; count?: number }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "insert", "update", "eq", "neq", "order", "in"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Terminal: awaiting the chain resolves to the result
  chain.then = vi.fn((resolve: (v: unknown) => void) =>
    resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count }),
  );
  return chain;
}

let mockInsertResult: { data?: unknown; error?: unknown } = { error: null };
let mockUpdateResult: { data?: unknown; error?: unknown } = { error: null };
let mockRpcResult: { data?: unknown; error?: unknown } = { data: null, error: null };
let mockUser: { id: string } | null = { id: "user-1" };

// Track which table + operation combos were called
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

  return {
    insert: insertChain.insert,
    update: updateChain.update,
    select: insertChain.select,
  };
});

const mockRpc = vi.fn(() => Promise.resolve(mockRpcResult));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: mockAuth,
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

// Mock invalidate to track calls
const invalidateCalls: string[] = [];
vi.mock("@/lib/supabase/invalidate", () => ({
  invalidate: (key: string) => invalidateCalls.push(key),
  subscribe: () => () => {},
  invalidateAll: () => {},
}));

// Mock useSupabaseQuery to just return defaults (we test mutation hooks, not queries)
vi.mock("@/lib/supabase/use-query", () => ({
  useSupabaseQuery: () => ({ data: undefined, isLoading: false }),
}));

import {
  useSendRecommendation,
  useAcceptRecommendation,
  useIgnoreRecommendation,
  useMarkRecommendationsRead,
} from "@/db/recommendation-hooks";

// --- Fixtures ---

const mockRestaurant: Restaurant = {
  id: "kakao-123",
  name: "맛있는 치킨",
  address: "서울 강남구 테헤란로 1",
  category: "음식점 > 치킨",
  lat: 37.5065,
  lng: 127.0536,
  placeUrl: "https://place.map.kakao.com/kakao-123",
  starRating: 3,
  createdAt: "2026-01-01T00:00:00Z",
};

const mockRecommendation: Recommendation = {
  id: "rec-1",
  senderId: "sender-1",
  recipientId: "user-1",
  kakaoPlaceId: "kakao-123",
  restaurantName: "맛있는 치킨",
  restaurantCategory: "음식점 > 치킨",
  restaurantAddress: "서울 강남구 테헤란로 1",
  restaurantLat: 37.5065,
  restaurantLng: 127.0536,
  restaurantPlaceUrl: "https://place.map.kakao.com/kakao-123",
  status: "pending",
  isRead: false,
  createdAt: "2026-02-01T00:00:00Z",
  resolvedAt: null,
};

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertResult = { error: null };
  mockUpdateResult = { error: null };
  mockRpcResult = { data: null, error: null };
  mockUser = { id: "user-1" };
  insertCalls = [];
  updateCalls = [];
  invalidateCalls.length = 0;
});

describe("useSendRecommendation", () => {
  it("inserts recommendation with full snapshot including lat/lng", async () => {
    const { result } = renderHook(() => useSendRecommendation());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.sendRecommendation("recipient-1", mockRestaurant);
    });

    expect(success).toBe(true);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].table).toBe("recommendations");
    expect(insertCalls[0].data).toEqual({
      sender_id: "user-1",
      recipient_id: "recipient-1",
      kakao_place_id: "kakao-123",
      restaurant_name: "맛있는 치킨",
      restaurant_category: "음식점 > 치킨",
      restaurant_address: "서울 강남구 테헤란로 1",
      restaurant_lat: 37.5065,
      restaurant_lng: 127.0536,
      restaurant_place_url: "https://place.map.kakao.com/kakao-123",
    });
    expect(invalidateCalls).toContain("recommendations:sent");
  });

  it("returns false on duplicate pending (error code 23505)", async () => {
    mockInsertResult = { error: { code: "23505", message: "unique_violation" } };
    const { result } = renderHook(() => useSendRecommendation());

    let success: boolean = true;
    await act(async () => {
      success = await result.current.sendRecommendation("recipient-1", mockRestaurant);
    });

    expect(success).toBe(false);
    expect(invalidateCalls).not.toContain("recommendations:sent");
  });

  it("returns false when not authenticated", async () => {
    mockUser = null;
    const { result } = renderHook(() => useSendRecommendation());

    let success: boolean = true;
    await act(async () => {
      success = await result.current.sendRecommendation("recipient-1", mockRestaurant);
    });

    expect(success).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });

  it("throws on non-duplicate errors", async () => {
    mockInsertResult = { error: { code: "42501", message: "permission denied" } };
    const { result } = renderHook(() => useSendRecommendation());

    await expect(
      act(() => result.current.sendRecommendation("recipient-1", mockRestaurant)),
    ).rejects.toEqual({ code: "42501", message: "permission denied" });
  });

  it("handles restaurant without placeUrl", async () => {
    const noUrlRestaurant = { ...mockRestaurant, placeUrl: undefined };
    const { result } = renderHook(() => useSendRecommendation());

    await act(async () => {
      await result.current.sendRecommendation("recipient-1", noUrlRestaurant);
    });

    expect(insertCalls[0].data).toHaveProperty("restaurant_place_url", null);
  });
});

describe("useAcceptRecommendation", () => {
  it("executes 3-step flow: accept → insert restaurant → dismiss siblings", async () => {
    const { result } = renderHook(() => useAcceptRecommendation());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.acceptRecommendation(mockRecommendation);
    });

    expect(success).toBe(true);

    // Step 1: update recommendation status to accepted
    expect(updateCalls[0]).toEqual({
      table: "recommendations",
      data: expect.objectContaining({ status: "accepted" }),
    });

    // Step 2: insert restaurant with snapshot lat/lng (NOT 0, 0)
    expect(insertCalls[0].table).toBe("restaurants");
    expect(insertCalls[0].data).toEqual(
      expect.objectContaining({
        user_id: "user-1",
        kakao_place_id: "kakao-123",
        lat: 37.5065,
        lng: 127.0536,
        place_url: "https://place.map.kakao.com/kakao-123",
        star_rating: null,
      }),
    );

    // Step 3: auto-dismiss siblings
    expect(updateCalls[1]).toEqual({
      table: "recommendations",
      data: expect.objectContaining({ status: "ignored" }),
    });

    // Invalidation
    expect(invalidateCalls).toContain("recommendations:received");
    expect(invalidateCalls).toContain("recommendations:unread-count");
    expect(invalidateCalls).toContain("restaurants");
  });

  it("succeeds even if restaurant already wishlisted (23505 on insert)", async () => {
    // Make the restaurant insert fail with duplicate
    const originalFrom = mockFrom.getMockImplementation();
    mockFrom.mockImplementation((table: string) => {
      if (table === "restaurants") {
        const chain = createChainMock({ error: { code: "23505", message: "duplicate" } });
        const origInsert = chain.insert as Function;
        chain.insert = vi.fn((data: unknown) => {
          insertCalls.push({ table, data });
          return origInsert(data);
        });
        return { insert: chain.insert, update: chain.update, select: chain.select };
      }
      // For recommendations table, return normal mock
      const chain = createChainMock({ error: null });
      const origUpdate = chain.update as Function;
      chain.update = vi.fn((data: unknown) => {
        updateCalls.push({ table, data });
        return origUpdate(data);
      });
      const origInsert = chain.insert as Function;
      chain.insert = vi.fn((data: unknown) => {
        insertCalls.push({ table, data });
        return origInsert(data);
      });
      return { insert: chain.insert, update: chain.update, select: chain.select };
    });

    const { result } = renderHook(() => useAcceptRecommendation());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.acceptRecommendation(mockRecommendation);
    });

    // Should still succeed — 23505 on restaurant insert is expected
    expect(success).toBe(true);

    // Restore
    if (originalFrom) mockFrom.mockImplementation(originalFrom);
  });

  it("returns false when not authenticated", async () => {
    mockUser = null;
    const { result } = renderHook(() => useAcceptRecommendation());

    let success: boolean = true;
    await act(async () => {
      success = await result.current.acceptRecommendation(mockRecommendation);
    });

    expect(success).toBe(false);
    expect(updateCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });
});

describe("useIgnoreRecommendation", () => {
  it("updates recommendation status to ignored", async () => {
    const { result } = renderHook(() => useIgnoreRecommendation());

    await act(async () => {
      await result.current.ignoreRecommendation("rec-1");
    });

    expect(updateCalls[0]).toEqual({
      table: "recommendations",
      data: expect.objectContaining({ status: "ignored" }),
    });
    expect(invalidateCalls).toContain("recommendations:received");
    expect(invalidateCalls).toContain("recommendations:unread-count");
  });

  it("throws on error", async () => {
    mockUpdateResult = { error: { code: "42501", message: "permission denied" } };
    const { result } = renderHook(() => useIgnoreRecommendation());

    await expect(
      act(() => result.current.ignoreRecommendation("rec-1")),
    ).rejects.toEqual({ code: "42501", message: "permission denied" });
  });
});

describe("useMarkRecommendationsRead", () => {
  it("updates is_read for pending unread recommendations", async () => {
    const { result } = renderHook(() => useMarkRecommendationsRead());

    await act(async () => {
      await result.current.markAsRead();
    });

    expect(updateCalls[0]).toEqual({
      table: "recommendations",
      data: { is_read: true },
    });
    expect(invalidateCalls).toContain("recommendations:unread-count");
  });

  it("does nothing when not authenticated", async () => {
    mockUser = null;
    const { result } = renderHook(() => useMarkRecommendationsRead());

    await act(async () => {
      await result.current.markAsRead();
    });

    expect(updateCalls).toHaveLength(0);
    expect(invalidateCalls).toHaveLength(0);
  });
});
