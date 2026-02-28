# Global Import WIP Banner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a persistent top banner across all pages during Naver import + enrichment, with a completion indicator that persists until dismissed.

**Architecture:** React Context (`ImportStatusContext`) wraps the app at the `AuthLayoutShell` level. The context manages a state machine (`idle → fetching → saving → enriching → completed/failed`). A separate `ImportBanner` component reads from context and renders a slim color-coded bar below TopBar. Polling (`/api/import/history` every 5s) only runs during the `enriching` phase. On mount, auto-recovers by checking for any batch with `enrichment_status === "running"`.

**Tech Stack:** React 19, TypeScript, Next.js 16, Tailwind CSS 4, vitest + @testing-library/react

---

### Task 1: Create ImportStatusContext — types and provider shell

**Files:**
- Create: `src/contexts/ImportStatusContext.tsx`
- Test: `tests/unit/import-status-context.test.tsx`

**Step 1: Write the failing test**

```tsx
// tests/unit/import-status-context.test.tsx
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
    // Mock history check on mount — return empty batches (no recovery needed)
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/import-status-context.test.tsx`
Expected: FAIL — module `@/contexts/ImportStatusContext` not found

**Step 3: Write minimal implementation**

```tsx
// src/contexts/ImportStatusContext.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ImportPhase =
  | { status: "idle" }
  | { status: "fetching" }
  | { status: "saving"; total: number }
  | { status: "enriching"; batchId: string }
  | { status: "completed"; importedCount: number }
  | { status: "failed"; message: string };

interface ImportStatusContextValue {
  phase: ImportPhase;
  startFetching: () => void;
  startSaving: (total: number) => void;
  startEnriching: (batchId: string) => void;
  complete: (importedCount: number) => void;
  fail: (message: string) => void;
  dismiss: () => void;
}

const ImportStatusContext = createContext<ImportStatusContextValue | null>(null);

const POLL_INTERVAL = 5000;

export function ImportStatusProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<ImportPhase>({ status: "idle" });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startFetching = useCallback(() => {
    stopPolling();
    setPhase({ status: "fetching" });
  }, [stopPolling]);

  const startSaving = useCallback((total: number) => {
    setPhase({ status: "saving", total });
  }, []);

  const startEnriching = useCallback((batchId: string) => {
    setPhase({ status: "enriching", batchId });
  }, []);

  const complete = useCallback(
    (importedCount: number) => {
      stopPolling();
      setPhase({ status: "completed", importedCount });
    },
    [stopPolling],
  );

  const fail = useCallback(
    (message: string) => {
      stopPolling();
      setPhase({ status: "failed", message });
    },
    [stopPolling],
  );

  const dismiss = useCallback(() => {
    stopPolling();
    setPhase({ status: "idle" });
  }, [stopPolling]);

  // Poll enrichment status when in "enriching" phase
  useEffect(() => {
    if (phase.status !== "enriching") return;

    const batchId = phase.batchId;

    const poll = async () => {
      try {
        const res = await fetch("/api/import/history");
        if (!res.ok) return;
        const data = await res.json();
        const batch = (data.batches ?? []).find(
          (b: { id: string }) => b.id === batchId,
        );
        if (!batch) return;
        if (batch.enrichmentStatus === "completed") {
          complete(batch.importedCount);
        } else if (batch.enrichmentStatus === "failed") {
          fail("카테고리 매칭에 실패했습니다.");
        }
      } catch {
        // Network error — stay in enriching, retry next poll
      }
    };

    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => stopPolling();
  }, [phase, complete, fail, stopPolling]);

  // Recovery on mount: check for running batches
  useEffect(() => {
    const recover = async () => {
      try {
        const res = await fetch("/api/import/history");
        if (!res.ok) return;
        const data = await res.json();
        const running = (data.batches ?? []).find(
          (b: { enrichmentStatus: string }) =>
            b.enrichmentStatus === "running",
        );
        if (running) {
          setPhase({ status: "enriching", batchId: running.id });
        }
      } catch {
        // Ignore — no recovery needed if fetch fails
      }
    };
    recover();
  }, []);

  return (
    <ImportStatusContext.Provider
      value={{
        phase,
        startFetching,
        startSaving,
        startEnriching,
        complete,
        fail,
        dismiss,
      }}
    >
      {children}
    </ImportStatusContext.Provider>
  );
}

export function useImportStatus() {
  const ctx = useContext(ImportStatusContext);
  if (!ctx) {
    throw new Error("useImportStatus must be used within ImportStatusProvider");
  }
  return ctx;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/import-status-context.test.tsx`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/contexts/ImportStatusContext.tsx tests/unit/import-status-context.test.tsx
git commit -m "feat: add ImportStatusContext with state machine and polling"
```

---

### Task 2: Create ImportBanner component

**Files:**
- Create: `src/components/ImportBanner.tsx`
- Test: `tests/unit/import-banner.test.tsx`

**Step 1: Write the failing test**

```tsx
// tests/unit/import-banner.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// Mock the context hook
const mockDismiss = vi.fn();
let mockPhase: Record<string, unknown> = { status: "idle" };

vi.mock("@/contexts/ImportStatusContext", () => ({
  useImportStatus: () => ({
    phase: mockPhase,
    dismiss: mockDismiss,
  }),
}));

import ImportBanner from "@/components/ImportBanner";

afterEach(() => {
  cleanup();
  mockPhase = { status: "idle" };
  vi.clearAllMocks();
});

describe("ImportBanner", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<ImportBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("shows fetching state with spinner", () => {
    mockPhase = { status: "fetching" };
    render(<ImportBanner />);
    expect(screen.getByText("네이버에서 가져오는 중...")).toBeTruthy();
  });

  it("shows saving state with count", () => {
    mockPhase = { status: "saving", total: 15 };
    render(<ImportBanner />);
    expect(screen.getByText("15개 장소 저장 중...")).toBeTruthy();
  });

  it("shows enriching state", () => {
    mockPhase = { status: "enriching", batchId: "b1" };
    render(<ImportBanner />);
    expect(screen.getByText("카테고리 매칭 중...")).toBeTruthy();
  });

  it("shows completed state with dismiss button", () => {
    mockPhase = { status: "completed", importedCount: 10 };
    render(<ImportBanner />);
    expect(screen.getByText(/가져오기 완료! 10개 추가됨/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /닫기/ }));
    expect(mockDismiss).toHaveBeenCalledOnce();
  });

  it("shows failed state with dismiss button", () => {
    mockPhase = { status: "failed", message: "오류" };
    render(<ImportBanner />);
    expect(screen.getByText("가져오기 실패")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /닫기/ }));
    expect(mockDismiss).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/import-banner.test.tsx`
Expected: FAIL — module `@/components/ImportBanner` not found

**Step 3: Write minimal implementation**

```tsx
// src/components/ImportBanner.tsx
"use client";

import { useImportStatus } from "@/contexts/ImportStatusContext";

function Spinner() {
  return (
    <svg
      className="w-4 h-4 text-white animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="닫기"
      className="ml-2 p-0.5 rounded hover:bg-white/20"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

export default function ImportBanner() {
  const { phase, dismiss } = useImportStatus();

  if (phase.status === "idle") return null;

  const config = {
    fetching: {
      bg: "bg-blue-500",
      text: "네이버에서 가져오는 중...",
      spinner: true,
      dismissable: false,
    },
    saving: {
      bg: "bg-blue-500",
      text: `${(phase as { total: number }).total}개 장소 저장 중...`,
      spinner: true,
      dismissable: false,
    },
    enriching: {
      bg: "bg-blue-500",
      text: "카테고리 매칭 중...",
      spinner: true,
      dismissable: false,
    },
    completed: {
      bg: "bg-green-500",
      text: `가져오기 완료! ${(phase as { importedCount: number }).importedCount}개 추가됨`,
      spinner: false,
      dismissable: true,
    },
    failed: {
      bg: "bg-red-500",
      text: "가져오기 실패",
      spinner: false,
      dismissable: true,
    },
  }[phase.status];

  if (!config) return null;

  return (
    <div
      role="status"
      className={`sticky top-12 left-0 right-0 z-30 ${config.bg} text-white text-center py-2 text-sm font-medium`}
    >
      <div className="max-w-lg mx-auto flex items-center justify-center gap-2 px-4">
        {config.spinner && <Spinner />}
        <span>{config.text}</span>
        {config.dismissable && <DismissButton onClick={dismiss} />}
      </div>
    </div>
  );
}
```

Note: We use `sticky top-12` instead of `fixed` so the banner sits right below TopBar (h-12) and scrolls naturally with the page layout. The z-30 ensures it layers below TopBar (z-40) and OfflineBanner (z-50).

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/import-banner.test.tsx`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add src/components/ImportBanner.tsx tests/unit/import-banner.test.tsx
git commit -m "feat: add ImportBanner component with all phase states"
```

---

### Task 3: Wire ImportStatusProvider and ImportBanner into AuthLayoutShell

**Files:**
- Modify: `src/components/AuthLayoutShell.tsx:1-27`

**Step 1: Write the failing test**

No new test file — this is a wiring step. We verify by running the full build (`pnpm build`).

**Step 2: Modify AuthLayoutShell**

In `src/components/AuthLayoutShell.tsx`, add the import and wrap children:

```tsx
// src/components/AuthLayoutShell.tsx
"use client";

import { usePathname } from "next/navigation";
import AuthCacheGuard from "./AuthCacheGuard";
import BottomNav from "./BottomNav";
import ImportBanner from "./ImportBanner";
import OfflineBanner from "./OfflineBanner";
import TopBar from "./TopBar";
import { ImportStatusProvider } from "@/contexts/ImportStatusContext";

export default function AuthLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <ImportStatusProvider>
      <AuthCacheGuard />
      {!isLoginPage && <OfflineBanner />}
      {!isLoginPage && <TopBar />}
      {!isLoginPage && <ImportBanner />}
      <main className="max-w-lg mx-auto px-4 pt-4">{children}</main>
      {!isLoginPage && <BottomNav />}
    </ImportStatusProvider>
  );
}
```

**Step 3: Run build to verify**

Run: `pnpm build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/components/AuthLayoutShell.tsx
git commit -m "feat: wire ImportStatusProvider and ImportBanner into layout"
```

---

### Task 4: Connect useNaverImport hook to ImportStatusContext

**Files:**
- Modify: `src/db/import-hooks.ts:29-119` — `useNaverImport` function
- Modify: `tests/unit/import-hooks.test.ts` — update existing tests

**Step 1: Update test to verify context integration**

The existing tests in `tests/unit/import-hooks.test.ts` mock `fetch` globally. Now we also need to mock the context. Add to the existing test file:

Add a mock for `ImportStatusContext` before the existing `import { useNaverImport }` line:

```ts
// Add mock for ImportStatusContext — add these before the import
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
```

Add a new test case to the existing `describe("useNaverImport")` block:

```ts
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
```

Add `mockStartFetching`, `mockStartSaving`, `mockStartEnriching`, `mockComplete`, `mockFail` to the `beforeEach` clear:

```ts
beforeEach(() => {
  vi.clearAllMocks();
  invalidateCalls.length = 0;
});
```

(`vi.clearAllMocks()` already clears all mocks including the new ones.)

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/import-hooks.test.ts`
Expected: FAIL — `mockStartFetching` never called (hook doesn't use context yet)

**Step 3: Modify useNaverImport to call context setters**

In `src/db/import-hooks.ts`, modify the `useNaverImport` function. The hook needs to optionally use the context (it may be rendered outside the provider in tests). Use a try-catch pattern:

```ts
// At the top of the file, add import:
import { useImportStatus } from "@/contexts/ImportStatusContext";

// Replace the useNaverImport function (lines 29-119):
export function useNaverImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importStatus = useImportStatus();

  const importFromNaver = async (rawInput: string): Promise<ImportResult | null> => {
    setIsImporting(true);
    setError(null);
    setProgress(null);
    importStatus.startFetching();

    try {
      // Step 1: Fetch bookmarks from Naver via API proxy
      // Send raw input (URL or share ID) so the API can resolve short URLs
      const fetchRes = await fetch("/api/import/naver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId: rawInput }),
      });

      if (!fetchRes.ok) {
        const errData = await fetchRes.json().catch(() => null);
        const message =
          errData?.message ?? "가져오기에 실패했습니다. 다시 시도해주세요.";
        setError(message);
        importStatus.fail(message);
        return null;
      }

      const naverData: NaverFetchResponse = await fetchRes.json();

      if (naverData.bookmarks.length === 0) {
        const msg = "이 폴더에 저장된 장소가 없습니다.";
        setError(msg);
        importStatus.fail(msg);
        return null;
      }

      setProgress({ current: 0, total: naverData.bookmarks.length });
      importStatus.startSaving(naverData.bookmarks.length);

      // Step 2: Save bookmarks to DB
      const bookmarks = naverData.bookmarks.map((b) => ({
        name: b.displayname,
        lat: b.py,
        lng: b.px,
        address: b.address,
      }));

      const saveRes = await fetch("/api/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareId: rawInput,
          sourceName: naverData.folderName || rawInput,
          bookmarks,
          closedCount: naverData.closedCount || 0,
        }),
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => null);
        const msg = errData?.message ?? "저장에 실패했습니다.";
        setError(msg);
        importStatus.fail(msg);
        return null;
      }

      const result: ImportResult = await saveRes.json();
      setProgress({ current: result.importedCount, total: result.totalCount });

      invalidateRestaurants();

      // Step 3: Fire-and-forget enrichment
      if (result.batchId && result.importedCount > 0) {
        importStatus.startEnriching(result.batchId);
        fetch("/api/import/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId: result.batchId }),
        }).catch(() => {
          // Enrichment failure is non-blocking
        });
      } else {
        importStatus.complete(result.importedCount);
      }

      return result;
    } catch {
      const msg = "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
      setError(msg);
      importStatus.fail(msg);
      return null;
    } finally {
      setIsImporting(false);
    }
  };

  return { importFromNaver, isImporting, progress, error };
}
```

Key changes:
- Added `const importStatus = useImportStatus()` at hook top
- `startFetching()` at import start
- `startSaving(count)` after successful Naver fetch
- `startEnriching(batchId)` before fire-and-forget enrichment call
- `fail(message)` on all error paths
- `complete(count)` when no enrichment is needed (0 imported)
- Removed the `try-catch` for optional context — the hook is always used inside the provider now

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/import-hooks.test.ts`
Expected: All tests PASS (existing + 2 new)

**Step 5: Commit**

```bash
git add src/db/import-hooks.ts tests/unit/import-hooks.test.ts
git commit -m "feat: connect useNaverImport to ImportStatusContext"
```

---

### Task 5: Add polling test for enrichment completion

**Files:**
- Modify: `tests/unit/import-status-context.test.tsx` — add polling tests

**Step 1: Add polling tests**

Add to the existing describe block in `tests/unit/import-status-context.test.tsx`:

```tsx
it("polls and transitions to completed when enrichment finishes", async () => {
  vi.useFakeTimers();

  // Mount: return empty batches
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ batches: [] }),
  });

  const { result } = renderHook(() => useImportStatus(), { wrapper });

  // Start enriching
  act(() => result.current.startEnriching("poll-batch"));
  expect(result.current.phase.status).toBe("enriching");

  // Mock poll response: enrichment completed
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        batches: [
          {
            id: "poll-batch",
            enrichmentStatus: "completed",
            importedCount: 8,
          },
        ],
      }),
  });

  // Advance timer to trigger poll
  await act(async () => {
    vi.advanceTimersByTime(5000);
  });

  expect(result.current.phase).toEqual({
    status: "completed",
    importedCount: 8,
  });

  vi.useRealTimers();
});

it("recovers running batch on mount", async () => {
  // Mount: return a running batch
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        batches: [
          { id: "recover-batch", enrichmentStatus: "running" },
        ],
      }),
  });

  const { result } = renderHook(() => useImportStatus(), { wrapper });

  // Wait for the useEffect recovery to complete
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  expect(result.current.phase).toEqual({
    status: "enriching",
    batchId: "recover-batch",
  });
});
```

**Step 2: Run test to verify it passes**

Run: `pnpm test tests/unit/import-status-context.test.tsx`
Expected: All 7 tests PASS

**Step 3: Commit**

```bash
git add tests/unit/import-status-context.test.tsx
git commit -m "test: add polling and recovery tests for ImportStatusContext"
```

---

### Task 6: Full build verification

**Files:** None (verification only)

**Step 1: Run type check**

Run: `tsc --noEmit`
Expected: No errors (or use `pnpm build` if path aliases cause issues with bare tsc)

**Step 2: Run full build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address build/test issues from import banner feature"
```

If no fixes needed, skip this commit.
