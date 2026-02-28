import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock useWishlist
const mockWishlist = vi.fn();
vi.mock("@/db/hooks", () => ({
  useWishlist: () => mockWishlist(),
}));

// Mock supabase
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));
vi.mock("@/lib/supabase/invalidate", () => ({
  invalidate: vi.fn(),
  invalidateByPrefix: vi.fn(),
}));

import DiscoverPage from "@/app/discover/page";

describe("DiscoverPage (Chat Agent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWishlist.mockReturnValue({
      restaurants: [
        {
          id: "kakao-1",
          name: "치킨집",
          category: "음식점 > 치킨",
          address: "서울",
          lat: 37.5,
          lng: 127.05,
          starRating: 4,
          createdAt: "2024-01-01",
        },
        {
          id: "kakao-2",
          name: "스시집",
          category: "음식점 > 일식",
          address: "서울",
          lat: 37.51,
          lng: 127.06,
          starRating: null,
          createdAt: "2024-01-02",
        },
        {
          id: "kakao-3",
          name: "카페",
          category: "카페",
          address: "서울",
          lat: 37.52,
          lng: 127.07,
          starRating: 3,
          createdAt: "2024-01-03",
        },
      ],
      isLoading: false,
    });
  });

  it("shows suggested prompts on empty conversation", () => {
    render(<DiscoverPage />);
    expect(screen.getByText("오늘 뭐 먹지?")).toBeTruthy();
    expect(screen.getByText("매운 거 추천해줘")).toBeTruthy();
  });

  it("renders chat input", () => {
    render(<DiscoverPage />);
    expect(screen.getByPlaceholderText("무엇이 먹고 싶으세요?")).toBeTruthy();
  });

  it("shows minimum places message when < 3 places saved", () => {
    mockWishlist.mockReturnValue({ restaurants: [], isLoading: false });
    render(<DiscoverPage />);
    expect(
      screen.getByText(/맛집을 3개 이상 저장/),
    ).toBeTruthy();
  });

  it("sends message on form submit", async () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves (streaming)

    render(<DiscoverPage />);
    const input = screen.getByPlaceholderText("무엇이 먹고 싶으세요?");

    await act(async () => {
      fireEvent.change(input, { target: { value: "치킨 추천해줘" } });
      fireEvent.submit(input.closest("form")!);
    });

    // User message should appear
    expect(screen.getByText("치킨 추천해줘")).toBeTruthy();
  });
});
