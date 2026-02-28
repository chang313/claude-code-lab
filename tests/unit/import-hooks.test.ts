import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock invalidate
const invalidateCalls: string[] = [];
vi.mock("@/lib/supabase/invalidate", () => ({
  invalidate: (key: string) => invalidateCalls.push(key),
  subscribe: () => () => {},
  invalidateAll: () => {},
}));

// Mock useSupabaseQuery (not used by import hooks, but imported transitively)
vi.mock("@/lib/supabase/use-query", () => ({
  useSupabaseQuery: () => ({ data: undefined, isLoading: false }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockStartFetching = vi.fn();
const mockStartSaving = vi.fn();
const mockStartEnriching = vi.fn();
const mockComplete = vi.fn();
const mockFail = vi.fn();

vi.mock("@/contexts/ImportStatusContext", () => ({
  useImportStatus: () => ({
    phase: { status: "idle" },
    startFetching: mockStartFetching,
    startSaving: mockStartSaving,
    startEnriching: mockStartEnriching,
    complete: mockComplete,
    fail: mockFail,
    dismiss: vi.fn(),
  }),
}));

import { useNaverImport } from "@/db/import-hooks";

describe("useNaverImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCalls.length = 0;
  });

  it("returns correct initial state", () => {
    const { result } = renderHook(() => useNaverImport());
    expect(result.current.isImporting).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("completes a successful import flow", async () => {
    // Mock /api/import/naver response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            bookmarks: [
              { displayname: "맛집A", px: 127.0, py: 37.5, address: "서울" },
            ],
            totalCount: 1,
            folderName: "내 맛집",
          }),
      })
      // Mock /api/import/save response
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            batchId: "batch-1",
            importedCount: 1,
            skippedCount: 0,
            invalidCount: 0,
            totalCount: 1,
          }),
      })
      // Mock /api/import/enrich (fire-and-forget)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: "started", batchId: "batch-1" }),
      });

    const { result } = renderHook(() => useNaverImport());

    let importResult: unknown;
    await act(async () => {
      importResult = await result.current.importFromNaver("abc123");
    });

    expect(importResult).toEqual({
      batchId: "batch-1",
      importedCount: 1,
      skippedCount: 0,
      invalidCount: 0,
      totalCount: 1,
    });
    expect(result.current.isImporting).toBe(false);
    expect(result.current.error).toBeNull();

    // Check fetch calls
    expect(mockFetch).toHaveBeenCalledWith("/api/import/naver", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ shareId: "abc123" }),
    }));
    expect(mockFetch).toHaveBeenCalledWith("/api/import/save", expect.objectContaining({
      method: "POST",
    }));

    // Verify cache invalidation
    expect(invalidateCalls).toContain("restaurants");
    expect(invalidateCalls).toContain("restaurants:visited");
    expect(invalidateCalls).toContain("restaurants:wishlist");
  });

  it("handles invalid link error from /api/import/naver", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "INVALID_SHARE_ID",
          message: "유효하지 않은 공유 링크입니다.",
        }),
    });

    const { result } = renderHook(() => useNaverImport());

    await act(async () => {
      await result.current.importFromNaver("bad-link");
    });

    expect(result.current.error).toBe("유효하지 않은 공유 링크입니다.");
    expect(result.current.isImporting).toBe(false);
  });

  it("handles network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => useNaverImport());

    await act(async () => {
      await result.current.importFromNaver("abc123");
    });

    expect(result.current.error).toBe(
      "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.",
    );
  });

  it("handles empty folder", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          bookmarks: [],
          totalCount: 0,
          folderName: "빈 폴더",
        }),
    });

    const { result } = renderHook(() => useNaverImport());

    await act(async () => {
      await result.current.importFromNaver("abc123");
    });

    expect(result.current.error).toBe("이 폴더에 저장된 장소가 없습니다.");
  });

  it("calls context setters during import flow", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            bookmarks: [
              { displayname: "맛집", px: 127.0, py: 37.5, address: "서울" },
              { displayname: "카페", px: 127.1, py: 37.6, address: "부산" },
            ],
            totalCount: 2,
            folderName: "폴더",
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            batchId: "batch-ctx",
            importedCount: 2,
            skippedCount: 0,
            invalidCount: 0,
            totalCount: 2,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: "started" }),
      });

    const { result } = renderHook(() => useNaverImport());

    await act(async () => {
      await result.current.importFromNaver("ctx-test");
    });

    expect(mockStartFetching).toHaveBeenCalledOnce();
    expect(mockStartSaving).toHaveBeenCalledWith(2);
    expect(mockStartEnriching).toHaveBeenCalledWith("batch-ctx");
  });

  it("calls fail on context when naver fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          message: "가져오기 실패",
        }),
    });

    const { result } = renderHook(() => useNaverImport());

    await act(async () => {
      await result.current.importFromNaver("fail-test");
    });

    expect(mockStartFetching).toHaveBeenCalledOnce();
    expect(mockFail).toHaveBeenCalledWith("가져오기 실패");
  });
});
