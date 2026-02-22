import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// --- Track .eq() calls to verify user_id filtering ---

let eqCalls: [string, unknown][] = [];

function createChainMock(result: {
  data?: unknown;
  error?: unknown;
  count?: number;
}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    "select",
    "eq",
    "not",
    "is",
    "order",
    "maybeSingle",
    "in",
  ];
  for (const m of methods) {
    chain[m] = vi.fn((...args: unknown[]) => {
      if (m === "eq") eqCalls.push(args as [string, unknown]);
      return chain;
    });
  }
  chain.then = vi.fn((resolve: (v: unknown) => void) =>
    resolve({
      data: result.data ?? null,
      error: result.error ?? null,
      count: result.count ?? 0,
    }),
  );
  return chain;
}

let mockUser: { id: string } | null = { id: "user-1" };

const mockAuth = {
  getUser: vi.fn(() =>
    Promise.resolve({ data: { user: mockUser }, error: null }),
  ),
};

const mockFrom = vi.fn(() =>
  createChainMock({ data: [], error: null, count: 0 }),
);

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: mockFrom, auth: mockAuth }),
}));

vi.mock("@/lib/supabase/invalidate", () => ({
  invalidate: () => {},
  subscribe: () => () => {},
  invalidateAll: () => {},
}));

// Capture the queryFn passed to useSupabaseQuery so we can call it manually
let capturedQueryFn: (() => Promise<unknown>) | null = null;
vi.mock("@/lib/supabase/use-query", () => ({
  useSupabaseQuery: (_key: string, queryFn: () => Promise<unknown>) => {
    capturedQueryFn = queryFn;
    return { data: undefined, isLoading: false };
  },
}));

vi.mock("@/lib/subcategory", () => ({
  groupBySubcategory: (restaurants: unknown[]) => restaurants,
}));

// Import hooks AFTER mocks are set up
import {
  useVisitedGrouped,
  useWishlistGrouped,
  useWishlist,
  useRestaurant,
  useIsWishlisted,
} from "@/db/hooks";
import {
  useUserVisitedGrouped,
  useUserWishlistGrouped,
} from "@/db/profile-hooks";

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks();
  eqCalls = [];
  capturedQueryFn = null;
  mockUser = { id: "user-1" };
});

// =============================================================================
// T001–T005: hooks.ts — must filter by current auth user's ID
// =============================================================================

describe("hooks.ts user_id filtering", () => {
  describe("useVisitedGrouped", () => {
    it("T001: includes .eq('user_id', currentUserId) filter", async () => {
      renderHook(() => useVisitedGrouped());
      expect(capturedQueryFn).not.toBeNull();
      await capturedQueryFn!();
      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(eqCalls).toContainEqual(["user_id", "user-1"]);
    });

    it("returns empty array when not authenticated", async () => {
      mockUser = null;
      renderHook(() => useVisitedGrouped());
      const result = await capturedQueryFn!();
      expect(result).toEqual([]);
    });
  });

  describe("useWishlistGrouped", () => {
    it("T002: includes .eq('user_id', currentUserId) filter", async () => {
      renderHook(() => useWishlistGrouped());
      expect(capturedQueryFn).not.toBeNull();
      await capturedQueryFn!();
      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(eqCalls).toContainEqual(["user_id", "user-1"]);
    });
  });

  describe("useWishlist", () => {
    it("T003: includes .eq('user_id', currentUserId) filter", async () => {
      renderHook(() => useWishlist());
      expect(capturedQueryFn).not.toBeNull();
      await capturedQueryFn!();
      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(eqCalls).toContainEqual(["user_id", "user-1"]);
    });
  });

  describe("useRestaurant", () => {
    it("T004: includes .eq('user_id', currentUserId) filter", async () => {
      renderHook(() => useRestaurant("kakao-123"));
      expect(capturedQueryFn).not.toBeNull();
      await capturedQueryFn!();
      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(eqCalls).toContainEqual(["user_id", "user-1"]);
      expect(eqCalls).toContainEqual(["kakao_place_id", "kakao-123"]);
    });

    it("returns null when not authenticated", async () => {
      mockUser = null;
      renderHook(() => useRestaurant("kakao-123"));
      const result = await capturedQueryFn!();
      expect(result).toBeNull();
    });
  });

  describe("useIsWishlisted", () => {
    it("T005: includes .eq('user_id', currentUserId) filter", async () => {
      renderHook(() => useIsWishlisted("kakao-123"));
      expect(capturedQueryFn).not.toBeNull();
      await capturedQueryFn!();
      expect(mockAuth.getUser).toHaveBeenCalled();
      expect(eqCalls).toContainEqual(["user_id", "user-1"]);
      expect(eqCalls).toContainEqual(["kakao_place_id", "kakao-123"]);
    });

    it("returns false when not authenticated", async () => {
      mockUser = null;
      renderHook(() => useIsWishlisted("kakao-123"));
      const result = await capturedQueryFn!();
      expect(result).toBe(false);
    });
  });
});

// =============================================================================
// T011–T012: profile-hooks.ts — regression tests (already correct, no auth)
// =============================================================================

describe("profile-hooks.ts regression (explicit userId, no auth call)", () => {
  describe("useUserVisitedGrouped", () => {
    it("T011: passes explicit userId to .eq('user_id', userId)", async () => {
      renderHook(() => useUserVisitedGrouped("other-user-123"));
      expect(capturedQueryFn).not.toBeNull();
      await capturedQueryFn!();
      expect(eqCalls).toContainEqual(["user_id", "other-user-123"]);
      // Profile hooks do NOT call auth.getUser — userId comes from parameter
      expect(mockAuth.getUser).not.toHaveBeenCalled();
    });
  });

  describe("useUserWishlistGrouped", () => {
    it("T012: passes explicit userId to .eq('user_id', userId)", async () => {
      renderHook(() => useUserWishlistGrouped("other-user-123"));
      expect(capturedQueryFn).not.toBeNull();
      await capturedQueryFn!();
      expect(eqCalls).toContainEqual(["user_id", "other-user-123"]);
      expect(mockAuth.getUser).not.toHaveBeenCalled();
    });
  });
});
