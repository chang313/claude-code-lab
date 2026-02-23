"use client";

import { useState } from "react";
import { invalidate } from "@/lib/supabase/invalidate";
import type { ImportResult } from "@/types";

const RESTAURANTS_KEY = "restaurants";
const VISITED_KEY = "restaurants:visited";
const WISHLIST_KEY = "restaurants:wishlist";

function invalidateRestaurants() {
  invalidate(RESTAURANTS_KEY);
  invalidate(VISITED_KEY);
  invalidate(WISHLIST_KEY);
}

interface NaverFetchResponse {
  bookmarks: Array<{
    displayname: string;
    px: number;
    py: number;
    address: string;
  }>;
  totalCount: number;
  folderName: string | null;
}

export function useNaverImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importFromNaver = async (rawInput: string): Promise<ImportResult | null> => {
    setIsImporting(true);
    setError(null);
    setProgress(null);

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
        return null;
      }

      const naverData: NaverFetchResponse = await fetchRes.json();

      if (naverData.bookmarks.length === 0) {
        setError("이 폴더에 저장된 장소가 없습니다.");
        return null;
      }

      setProgress({ current: 0, total: naverData.bookmarks.length });

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
        }),
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => null);
        setError(errData?.message ?? "저장에 실패했습니다.");
        return null;
      }

      const result: ImportResult = await saveRes.json();
      setProgress({ current: result.importedCount, total: result.totalCount });

      invalidateRestaurants();

      // Step 3: Fire-and-forget enrichment
      if (result.batchId && result.importedCount > 0) {
        fetch("/api/import/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId: result.batchId }),
        }).catch(() => {
          // Enrichment failure is non-blocking
        });
      }

      return result;
    } catch {
      setError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.");
      return null;
    } finally {
      setIsImporting(false);
    }
  };

  return { importFromNaver, isImporting, progress, error };
}

// === Import History Hooks ===

const IMPORT_HISTORY_KEY = "import-history";

export interface ImportBatchSummary {
  id: string;
  sourceName: string;
  importedCount: number;
  skippedCount: number;
  invalidCount: number;
  enrichmentStatus: "pending" | "running" | "completed" | "failed";
  enrichedCount: number;
  categorizedCount: number;
  createdAt: string;
}

export function useImportHistory() {
  const [batches, setBatches] = useState<ImportBatchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/import/history");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return { batches, isLoading, fetchHistory };
}

export function useUndoImport() {
  const undoImport = async (
    batchId: string,
  ): Promise<{ removedCount: number; preservedCount: number } | null> => {
    const res = await fetch(`/api/import/batch/${batchId}`, {
      method: "DELETE",
    });
    if (!res.ok) return null;
    invalidateRestaurants();
    invalidate(IMPORT_HISTORY_KEY);
    return res.json();
  };
  return { undoImport };
}

export function useRetriggerEnrichment() {
  const retriggerEnrichment = async (batchId: string): Promise<boolean> => {
    const res = await fetch("/api/import/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId }),
    });
    return res.ok;
  };
  return { retriggerEnrichment };
}

export function useRetroactiveEnrich() {
  const [isEnriching, setIsEnriching] = useState(false);

  const retroactiveEnrich = async (): Promise<{
    status: string;
    restaurantCount: number;
  } | null> => {
    setIsEnriching(true);
    try {
      const res = await fetch("/api/import/re-enrich", {
        method: "POST",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status === "started") {
        invalidateRestaurants();
        invalidate(IMPORT_HISTORY_KEY);
      }
      return data;
    } catch {
      return null;
    } finally {
      setIsEnriching(false);
    }
  };

  return { retroactiveEnrich, isEnriching };
}
