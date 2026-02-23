import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock the hooks
const mockFetchHistory = vi.fn();
const mockUndoImport = vi.fn();
const mockRetriggerEnrichment = vi.fn();
const mockRetroactiveEnrich = vi.fn();

vi.mock("@/db/import-hooks", () => ({
  useImportHistory: () => ({
    batches: [
      {
        id: "batch-1",
        sourceName: "강남맛집",
        importedCount: 20,
        skippedCount: 2,
        invalidCount: 0,
        enrichmentStatus: "completed",
        enrichedCount: 15,
        categorizedCount: 18,
        createdAt: "2026-02-23T10:00:00Z",
      },
    ],
    isLoading: false,
    fetchHistory: mockFetchHistory,
  }),
  useUndoImport: () => ({ undoImport: mockUndoImport }),
  useRetriggerEnrichment: () => ({
    retriggerEnrichment: mockRetriggerEnrichment,
  }),
  useRetroactiveEnrich: () => ({
    retroactiveEnrich: mockRetroactiveEnrich,
    isEnriching: false,
  }),
}));

import ImportHistory from "@/components/ImportHistory";

afterEach(cleanup);

describe("ImportHistory — categorization stats", () => {
  it("displays categorization stats as 'categorizedCount/importedCount'", () => {
    render(<ImportHistory />);
    expect(screen.getByText(/카테고리 18\/20/)).toBeTruthy();
  });

  it("shows source name and imported count", () => {
    render(<ImportHistory />);
    expect(screen.getByText("강남맛집")).toBeTruthy();
    expect(screen.getByText(/가져온 20개/)).toBeTruthy();
  });
});
