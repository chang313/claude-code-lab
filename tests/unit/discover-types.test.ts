import { describe, it, expect } from "vitest";
import type { DiscoverItem, DiscoverResponse } from "@/types";

describe("Discover types", () => {
  it("DiscoverItem has required fields", () => {
    const item: DiscoverItem = {
      kakaoPlaceId: "kakao-123",
      name: "맛있는 치킨",
      category: "음식점 > 치킨",
      address: "서울 강남구 테헤란로 1",
      lat: 37.5065,
      lng: 127.0536,
      placeUrl: "https://place.map.kakao.com/kakao-123",
      reason: "친구 3명이 저장한 강남 이자카야",
      source: "social",
      savedByCount: 3,
      savedByNames: ["김철수", "이영희", "박지민"],
    };
    expect(item.kakaoPlaceId).toBe("kakao-123");
    expect(item.source).toBe("social");
  });

  it("DiscoverItem supports discovery source without social fields", () => {
    const item: DiscoverItem = {
      kakaoPlaceId: "kakao-456",
      name: "새로운 카페",
      category: "카페",
      address: "서울 서초구 서초대로 1",
      lat: 37.4917,
      lng: 127.0078,
      placeUrl: null,
      reason: "자주 가는 카페 카테고리 근처 맛집",
      source: "discovery",
      savedByCount: 0,
      savedByNames: [],
    };
    expect(item.source).toBe("discovery");
    expect(item.savedByCount).toBe(0);
  });

  it("DiscoverResponse includes fallback flag", () => {
    const response: DiscoverResponse = {
      recommendations: [],
      fallback: false,
    };
    expect(response.fallback).toBe(false);
  });
});
