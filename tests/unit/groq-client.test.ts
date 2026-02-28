import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the groq-sdk before imports
const mockCreate = vi.fn();
vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  },
}));

import { rankWithGroq } from "@/lib/groq";
import type { SocialCandidate, GroqResponse } from "@/types";

const mockCandidates: SocialCandidate[] = [
  {
    kakaoPlaceId: "kakao-1",
    name: "맛있는 치킨",
    category: "음식점 > 치킨",
    address: "서울 강남구 테헤란로 1",
    lat: 37.5065,
    lng: 127.0536,
    placeUrl: "https://place.map.kakao.com/kakao-1",
    savedByCount: 3,
    savedByNames: ["김철수", "이영희", "박지민"],
  },
  {
    kakaoPlaceId: "kakao-2",
    name: "스시 오마카세",
    category: "음식점 > 일식",
    address: "서울 강남구 역삼로 10",
    lat: 37.5012,
    lng: 127.0395,
    placeUrl: null,
    savedByCount: 1,
    savedByNames: ["김철수"],
  },
];

const mockUserProfile = {
  totalSaved: 15,
  topCategories: ["치킨", "일식", "카페"],
  topArea: "강남",
};

describe("rankWithGroq", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set env var for tests
    vi.stubEnv("GROQ_API_KEY", "test-key");
  });

  it("returns ranked recommendations from LLM response", async () => {
    const groqResponse: GroqResponse = {
      recommendations: [
        { kakao_place_id: "kakao-1", reason: "친구 3명이 저장한 치킨집" },
        { kakao_place_id: "kakao-2", reason: "자주 가는 일식 카테고리" },
      ],
    };

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(groqResponse),
          },
        },
      ],
    });

    const result = await rankWithGroq(mockCandidates, [], mockUserProfile);

    expect(result).not.toBeNull();
    expect(result!.recommendations).toHaveLength(2);
    expect(result!.recommendations[0].kakao_place_id).toBe("kakao-1");
    expect(result!.recommendations[0].reason).toBe("친구 3명이 저장한 치킨집");
  });

  it("returns null on API error (graceful failure)", async () => {
    mockCreate.mockRejectedValue(new Error("Rate limited"));

    const result = await rankWithGroq(mockCandidates, [], mockUserProfile);

    expect(result).toBeNull();
  });

  it("returns null on invalid JSON response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "not valid json" } }],
    });

    const result = await rankWithGroq(mockCandidates, [], mockUserProfile);

    expect(result).toBeNull();
  });

  it("returns null on missing recommendations field", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"data": []}' } }],
    });

    const result = await rankWithGroq(mockCandidates, [], mockUserProfile);

    expect(result).toBeNull();
  });
});
