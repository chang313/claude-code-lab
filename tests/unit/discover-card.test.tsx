import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DiscoverCard from "@/components/DiscoverCard";
import type { DiscoverItem } from "@/types";

const mockSocialItem: DiscoverItem = {
  kakaoPlaceId: "kakao-1",
  name: "맛있는 치킨",
  category: "음식점 > 치킨",
  address: "서울 강남구 테헤란로 1",
  lat: 37.5065,
  lng: 127.0536,
  placeUrl: "https://place.map.kakao.com/kakao-1",
  reason: "친구 3명이 저장한 치킨집",
  source: "social",
  savedByCount: 3,
  savedByNames: ["김철수", "이영희", "박지민"],
};

const mockDiscoveryItem: DiscoverItem = {
  kakaoPlaceId: "kakao-2",
  name: "새로운 카페",
  category: "카페",
  address: "서울 서초구 서초대로 1",
  lat: 37.4917,
  lng: 127.0078,
  placeUrl: null,
  reason: "자주 가는 카페 근처 맛집",
  source: "discovery",
  savedByCount: 0,
  savedByNames: [],
};

describe("DiscoverCard", () => {
  it("renders restaurant name and reason", () => {
    render(<DiscoverCard item={mockSocialItem} onAdd={vi.fn()} />);

    expect(screen.getByText("맛있는 치킨")).toBeTruthy();
    expect(screen.getByText("친구 3명이 저장한 치킨집")).toBeTruthy();
  });

  it("renders category and address", () => {
    render(<DiscoverCard item={mockSocialItem} onAdd={vi.fn()} />);

    expect(screen.getByText("음식점 > 치킨")).toBeTruthy();
    expect(screen.getByText("서울 강남구 테헤란로 1")).toBeTruthy();
  });

  it("shows social indicator for social source", () => {
    render(<DiscoverCard item={mockSocialItem} onAdd={vi.fn()} />);

    expect(screen.getByText("👥")).toBeTruthy();
  });

  it("shows discovery indicator for discovery source", () => {
    render(<DiscoverCard item={mockDiscoveryItem} onAdd={vi.fn()} />);

    expect(screen.getByText("🧭")).toBeTruthy();
  });

  it("calls onAdd when add button clicked", () => {
    const onAdd = vi.fn();
    render(<DiscoverCard item={mockSocialItem} onAdd={onAdd} />);

    fireEvent.click(screen.getByText("추가"));
    expect(onAdd).toHaveBeenCalledWith(mockSocialItem);
  });

  it("disables add button when isAdding is true", () => {
    render(
      <DiscoverCard item={mockSocialItem} onAdd={vi.fn()} isAdding />,
    );

    const button = screen.getByText("…");
    expect(button.closest("button")).toHaveProperty("disabled", true);
  });
});
