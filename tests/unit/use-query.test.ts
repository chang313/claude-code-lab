import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/lib/supabase/invalidate", () => ({
  subscribe: vi.fn(() => vi.fn()),
  setCache: vi.fn(),
  subscribeToCache: vi.fn(() => vi.fn()),
}));

import { useSupabaseQuery } from "@/lib/supabase/use-query";
import { subscribe } from "@/lib/supabase/invalidate";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("useSupabaseQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set isLoading = true on initial fetch (no data yet)", async () => {
    const deferred = createDeferred<string>();
    const queryFn = vi.fn(() => deferred.promise);

    const { result } = renderHook(() =>
      useSupabaseQuery("test-key", queryFn),
    );

    // Before resolve: isLoading should be true, data should be undefined
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Resolve and verify it completes
    await act(async () => {
      deferred.resolve("test-data");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBe("test-data");
    });
  });

  it("should keep isLoading = false during revalidation when data already exists", async () => {
    let callCount = 0;
    const deferred1 = createDeferred<string>();
    const deferred2 = createDeferred<string>();

    const queryFn = vi.fn(() => {
      callCount++;
      return callCount === 1 ? deferred1.promise : deferred2.promise;
    });

    // Capture the invalidation listener
    let revalidate: (() => void) | undefined;
    vi.mocked(subscribe).mockImplementation((_key, listener) => {
      revalidate = listener;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useSupabaseQuery("test-key", queryFn),
    );

    // Resolve initial fetch
    await act(async () => {
      deferred1.resolve("initial-data");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBe("initial-data");
    });

    // Trigger revalidation (simulates invalidateRestaurants() after a mutation)
    await act(async () => {
      revalidate?.();
    });

    // During revalidation: isLoading should stay false (stale-while-revalidate)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBe("initial-data");

    // Resolve revalidation
    await act(async () => {
      deferred2.resolve("updated-data");
    });

    await waitFor(() => {
      expect(result.current.data).toBe("updated-data");
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should still update data after background revalidation completes", async () => {
    let callCount = 0;
    const deferred1 = createDeferred<string>();
    const deferred2 = createDeferred<string>();

    const queryFn = vi.fn(() => {
      callCount++;
      return callCount === 1 ? deferred1.promise : deferred2.promise;
    });

    let revalidate: (() => void) | undefined;
    vi.mocked(subscribe).mockImplementation((_key, listener) => {
      revalidate = listener;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useSupabaseQuery("test-key", queryFn),
    );

    // Complete initial fetch
    await act(async () => {
      deferred1.resolve("v1");
    });

    await waitFor(() => {
      expect(result.current.data).toBe("v1");
    });

    // Trigger revalidation
    await act(async () => {
      revalidate?.();
    });

    // Data should still be v1 during revalidation
    expect(result.current.data).toBe("v1");

    // Complete revalidation with new data
    await act(async () => {
      deferred2.resolve("v2");
    });

    // Data should be updated to v2
    await waitFor(() => {
      expect(result.current.data).toBe("v2");
      expect(result.current.isLoading).toBe(false);
    });
  });
});
