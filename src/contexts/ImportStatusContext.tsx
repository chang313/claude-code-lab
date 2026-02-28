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
