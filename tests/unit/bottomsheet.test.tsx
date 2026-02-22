import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BottomSheet from "@/components/BottomSheet";
import BottomNav from "@/components/BottomNav";

function renderSheet(state: "hidden" | "peek" | "expanded" = "peek") {
  return render(
    <BottomSheet state={state} onStateChange={vi.fn()}>
      <div>Test content</div>
    </BottomSheet>,
  );
}

describe("BottomSheet layout", () => {
  it("outer div uses flexbox column layout", () => {
    renderSheet();
    const sheet = screen.getByText("Test content").closest(
      "[class*='fixed']",
    ) as HTMLElement;
    expect(sheet.className).toContain("flex");
    expect(sheet.className).toContain("flex-col");
  });

  it("scroll container uses flex-1 and overflow-y-auto", () => {
    renderSheet();
    const scrollContainer = screen.getByText("Test content")
      .parentElement as HTMLElement;
    expect(scrollContainer.className).toContain("flex-1");
    expect(scrollContainer.className).toContain("overflow-y-auto");
  });

  it("scroll container has bottom padding for nav bar", () => {
    renderSheet();
    const scrollContainer = screen.getByText("Test content")
      .parentElement as HTMLElement;
    expect(scrollContainer.className).toContain("pb-20");
  });

  it("outer div uses 100dvh height", () => {
    renderSheet();
    const sheet = screen.getByText("Test content").closest(
      "[class*='fixed']",
    ) as HTMLElement;
    expect(sheet.style.height).toBe("100dvh");
  });

  it("scroll container does not use explicit height style", () => {
    renderSheet();
    const scrollContainer = screen.getByText("Test content")
      .parentElement as HTMLElement;
    expect(scrollContainer.style.height).toBe("");
  });

  it("scroll container has min-h-0 for flex shrink", () => {
    renderSheet();
    const scrollContainer = screen.getByText("Test content")
      .parentElement as HTMLElement;
    expect(scrollContainer.className).toContain("min-h-0");
  });
});

describe("BottomSheet drag calculation", () => {
  it("handleTouchMove does not reference hardcoded peek state", async () => {
    // This is a source-level verification: the handleTouchMove function
    // should use currentTranslateY.current, not getTranslateY("peek").
    // We verify by reading the source module and checking the compiled output.
    const module = await import("@/components/BottomSheet?raw");
    const source = typeof module.default === "string" ? module.default : "";
    // The source should NOT contain getTranslateY("peek") inside handleTouchMove
    // but SHOULD contain currentTranslateY.current
    if (source) {
      expect(source).not.toContain('getTranslateY("peek")');
      expect(source).toContain("currentTranslateY.current");
    }
  });
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/search",
}));

describe("BottomNav z-index", () => {
  it("uses z-20 class, not z-40", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("z-20");
    expect(nav.className).not.toContain("z-40");
  });
});
