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
