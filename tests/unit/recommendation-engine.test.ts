import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));
mockSelect.mockReturnValue({ eq: mockEq });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      })),
    },
  })),
}));

// Mock Kakao API
const mockSearchByKeyword = vi.fn();
vi.mock("@/lib/kakao", () => ({
  searchByKeyword: (...args: unknown[]) => mockSearchByKeyword(...args),
}));

// Mock Groq
const mockRankWithGroq = vi.fn();
vi.mock("@/lib/groq", () => ({
  rankWithGroq: (...args: unknown[]) => mockRankWithGroq(...args),
}));

import {
  getSocialCandidates,
  analyzeUserProfile,
  getDiscoveryCandidates,
  mergeCandidates,
  generateRecommendations,
} from "@/lib/recommendation-engine";
import type { SocialCandidate, DbSocialCandidate } from "@/types";

const mockDbSocialCandidates: DbSocialCandidate[] = [
  {
    kakao_place_id: "kakao-1",
    name: "맛있는 치킨",
    category: "음식점 > 치킨",
    address: "서울 강남구 테헤란로 1",
    lat: 37.5065,
    lng: 127.0536,
    place_url: "https://place.map.kakao.com/kakao-1",
    saved_by_count: 3,
    saved_by_names: ["김철수", "이영희", "박지민"],
  },
  {
    kakao_place_id: "kakao-2",
    name: "스시 오마카세",
    category: "음식점 > 일식",
    address: "서울 강남구 역삼로 10",
    lat: 37.5012,
    lng: 127.0395,
    place_url: null,
    saved_by_count: 1,
    saved_by_names: ["김철수"],
  },
];

describe("getSocialCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls RPC and maps DB rows to SocialCandidate", async () => {
    mockRpc.mockResolvedValue({ data: mockDbSocialCandidates, error: null });

    const result = await getSocialCandidates("user-1");

    expect(mockRpc).toHaveBeenCalledWith("get_social_candidates", {
      target_user_id: "user-1",
    });
    expect(result).toHaveLength(2);
    expect(result[0].kakaoPlaceId).toBe("kakao-1");
    expect(result[0].savedByCount).toBe(3);
    expect(result[0].savedByNames).toEqual(["김철수", "이영희", "박지민"]);
  });

  it("returns empty array on RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "fail" } });

    const result = await getSocialCandidates("user-1");

    expect(result).toEqual([]);
  });
});

describe("analyzeUserProfile", () => {
  it("extracts top categories and geographic center", () => {
    const restaurants = [
      { category: "음식점 > 치킨", lat: 37.50, lng: 127.05 },
      { category: "음식점 > 치킨", lat: 37.51, lng: 127.04 },
      { category: "음식점 > 일식", lat: 37.49, lng: 127.03 },
      { category: "카페", lat: 37.52, lng: 127.06 },
      { category: "카페", lat: 37.48, lng: 127.02 },
    ];

    const profile = analyzeUserProfile(restaurants);

    expect(profile.totalSaved).toBe(5);
    expect(profile.topCategories[0]).toBe("치킨");
    expect(profile.topCategories[1]).toBe("카페");
    expect(profile.topCategories).toHaveLength(3);
    expect(profile.centerLat).toBeCloseTo(37.50, 1);
    expect(profile.centerLng).toBeCloseTo(127.04, 1);
  });

  it("returns empty profile for no restaurants", () => {
    const profile = analyzeUserProfile([]);

    expect(profile.totalSaved).toBe(0);
    expect(profile.topCategories).toEqual([]);
    expect(profile.centerLat).toBe(0);
    expect(profile.centerLng).toBe(0);
  });
});

describe("mergeCandidates", () => {
  it("deduplicates by kakaoPlaceId, social wins", () => {
    const social: SocialCandidate[] = [
      {
        kakaoPlaceId: "kakao-1",
        name: "맛있는 치킨",
        category: "치킨",
        address: "강남",
        lat: 37.50,
        lng: 127.05,
        placeUrl: null,
        savedByCount: 2,
        savedByNames: ["김철수", "이영희"],
      },
    ];

    const discovery = [
      { kakaoPlaceId: "kakao-1", name: "맛있는 치킨", category: "치킨", address: "강남" },
      { kakaoPlaceId: "kakao-3", name: "새 카페", category: "카페", address: "서초" },
    ];

    const result = mergeCandidates(social, discovery);

    expect(result).toHaveLength(2);
    const first = result.find((r) => r.kakaoPlaceId === "kakao-1")!;
    expect(first.source).toBe("social");
    expect(first.savedByCount).toBe(2);
    const second = result.find((r) => r.kakaoPlaceId === "kakao-3")!;
    expect(second.source).toBe("discovery");
    expect(second.savedByCount).toBe(0);
  });

  it("caps at 50 candidates", () => {
    const social: SocialCandidate[] = Array.from({ length: 30 }, (_, i) => ({
      kakaoPlaceId: `social-${i}`,
      name: `Place ${i}`,
      category: "치킨",
      address: "강남",
      lat: 37.50,
      lng: 127.05,
      placeUrl: null,
      savedByCount: 1,
      savedByNames: ["김철수"],
    }));

    const discovery = Array.from({ length: 30 }, (_, i) => ({
      kakaoPlaceId: `discovery-${i}`,
      name: `Discover ${i}`,
      category: "카페",
      address: "서초",
    }));

    const result = mergeCandidates(social, discovery);

    expect(result.length).toBeLessThanOrEqual(50);
  });
});

describe("generateRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses LLM response when available", async () => {
    // Mock user restaurants query
    mockRpc.mockResolvedValue({ data: mockDbSocialCandidates, error: null });

    // Need to handle multiple .from() calls with different table/select chains
    // The engine calls: from("restaurants").select("category, lat, lng").eq("user_id", userId)
    // AND from("restaurants").select("kakao_place_id").eq("user_id", userId)
    const restaurantData = [
      { category: "음식점 > 치킨", lat: 37.50, lng: 127.05 },
      { category: "음식점 > 치킨", lat: 37.51, lng: 127.04 },
      { category: "음식점 > 일식", lat: 37.49, lng: 127.03 },
    ];
    const placeIdData = [
      { kakao_place_id: "existing-1" },
    ];

    let fromCallCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockImplementation((): any => {
      fromCallCount++;
      const chain: Record<string, ReturnType<typeof vi.fn>> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.then = vi.fn((resolve: (v: unknown) => void) => {
        // First call: category/lat/lng query, Second call: place_id query
        if (fromCallCount <= 1) {
          resolve({ data: restaurantData, error: null });
        } else {
          resolve({ data: placeIdData, error: null });
        }
      });
      return chain;
    });

    mockSearchByKeyword.mockResolvedValue({ documents: [] });
    mockRankWithGroq.mockResolvedValue({
      recommendations: [
        { kakao_place_id: "kakao-1", reason: "친구 3명이 저장한 치킨집" },
      ],
    });

    const result = await generateRecommendations("user-1");

    expect(result.fallback).toBe(false);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].reason).toBe("친구 3명이 저장한 치킨집");
  });

  it("falls back to SQL ranking when LLM fails", async () => {
    mockRpc.mockResolvedValue({ data: mockDbSocialCandidates, error: null });

    let fromCallCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFrom.mockImplementation((): any => {
      fromCallCount++;
      const chain: Record<string, ReturnType<typeof vi.fn>> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.then = vi.fn((resolve: (v: unknown) => void) => {
        if (fromCallCount <= 1) {
          resolve({
            data: [
              { category: "음식점 > 치킨", lat: 37.50, lng: 127.05 },
              { category: "음식점 > 치킨", lat: 37.51, lng: 127.04 },
              { category: "음식점 > 일식", lat: 37.49, lng: 127.03 },
            ],
            error: null,
          });
        } else {
          resolve({ data: [], error: null });
        }
      });
      return chain;
    });

    mockSearchByKeyword.mockResolvedValue({ documents: [] });
    mockRankWithGroq.mockResolvedValue(null); // LLM failed

    const result = await generateRecommendations("user-1");

    expect(result.fallback).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0].reason).toContain("저장");
  });
});
