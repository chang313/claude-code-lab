import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock supabase client (for add-to-wishlist)
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: null, error: null }),
      })),
    })),
  }),
}));

// Mock invalidate
vi.mock("@/lib/supabase/invalidate", () => ({
  invalidate: vi.fn(),
  invalidateByPrefix: vi.fn(),
}));

import DiscoverPage from "@/app/discover/page";
import type { DiscoverResponse } from "@/types";

describe("DiscoverPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<DiscoverPage />);

    expect(screen.getByText("추천 맛집 찾는 중...")).toBeTruthy();
  });

  it("renders recommendations on success", async () => {
    const response: DiscoverResponse = {
      recommendations: [
        {
          kakaoPlaceId: "kakao-1",
          name: "맛있는 치킨",
          category: "치킨",
          address: "강남",
          lat: 37.5,
          lng: 127.05,
          placeUrl: null,
          reason: "친구 3명이 저장",
          source: "social",
          savedByCount: 3,
          savedByNames: ["김철수"],
        },
      ],
      fallback: false,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => response,
    });

    await act(async () => {
      render(<DiscoverPage />);
    });

    expect(screen.getByText("맛있는 치킨")).toBeTruthy();
    expect(screen.getByText("친구 3명이 저장")).toBeTruthy();
  });

  it("shows empty state when no recommendations", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [], fallback: false }),
    });

    await act(async () => {
      render(<DiscoverPage />);
    });

    expect(
      screen.getByText("추천을 생성하려면 맛집을 더 저장해보세요"),
    ).toBeTruthy();
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await act(async () => {
      render(<DiscoverPage />);
    });

    expect(screen.getByText("추천 생성에 실패했습니다")).toBeTruthy();
  });
});
