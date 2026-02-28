import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/supabase/invalidate", () => ({
  invalidate: () => {},
  subscribe: () => () => {},
  invalidateAll: () => {},
}));
vi.mock("@/lib/supabase/use-query", () => ({
  useSupabaseQuery: () => ({ data: undefined, isLoading: false }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  ImportStatusProvider,
  useImportStatus,
} from "@/contexts/ImportStatusContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ImportStatusProvider>{children}</ImportStatusProvider>;
}

describe("ImportStatusContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ batches: [] }),
    });
  });

  it("starts with idle status", () => {
    const { result } = renderHook(() => useImportStatus(), { wrapper });
    expect(result.current.phase.status).toBe("idle");
  });

  it("transitions through fetching → saving → enriching", async () => {
    const { result } = renderHook(() => useImportStatus(), { wrapper });

    act(() => result.current.startFetching());
    expect(result.current.phase.status).toBe("fetching");

    act(() => result.current.startSaving(15));
    expect(result.current.phase).toEqual({ status: "saving", total: 15 });

    act(() => result.current.startEnriching("batch-123"));
    expect(result.current.phase).toEqual({
      status: "enriching",
      batchId: "batch-123",
    });
  });

  it("transitions to completed", () => {
    const { result } = renderHook(() => useImportStatus(), { wrapper });

    act(() => result.current.startFetching());
    act(() => result.current.complete(10));
    expect(result.current.phase).toEqual({
      status: "completed",
      importedCount: 10,
    });
  });

  it("transitions to failed", () => {
    const { result } = renderHook(() => useImportStatus(), { wrapper });

    act(() => result.current.startFetching());
    act(() => result.current.fail("오류 발생"));
    expect(result.current.phase).toEqual({
      status: "failed",
      message: "오류 발생",
    });
  });

  it("dismiss returns to idle", () => {
    const { result } = renderHook(() => useImportStatus(), { wrapper });

    act(() => result.current.startFetching());
    act(() => result.current.complete(5));
    act(() => result.current.dismiss());
    expect(result.current.phase.status).toBe("idle");
  });
});
