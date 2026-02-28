import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatPlaceCard, { buildKakaoNavUrl } from "@/components/ChatPlaceCard";
import type { Restaurant } from "@/types";

const visited: Restaurant = {
  id: "kakao-1",
  name: "맛있는 치킨",
  category: "음식점 > 치킨",
  address: "서울 강남구 테헤란로 123",
  lat: 37.5,
  lng: 127.05,
  placeUrl: "https://place.map.kakao.com/kakao-1",
  starRating: 4,
  createdAt: "2024-01-01",
};

const wishlisted: Restaurant = {
  ...visited,
  id: "kakao-2",
  name: "스시 오마카세",
  starRating: null,
  placeUrl: undefined,
};

describe("ChatPlaceCard", () => {
  it("renders place name and category", () => {
    render(<ChatPlaceCard place={visited} />);
    expect(screen.getByText("맛있는 치킨")).toBeTruthy();
    expect(screen.getByText("치킨")).toBeTruthy(); // subcategory
  });

  it("shows star rating for visited places", () => {
    render(<ChatPlaceCard place={visited} />);
    // 4 filled stars
    expect(screen.getByText(/★★★★/)).toBeTruthy();
  });

  it("shows wishlist badge for unvisited places", () => {
    render(<ChatPlaceCard place={wishlisted} />);
    expect(screen.getByText("위시리스트")).toBeTruthy();
  });

  it("links to place URL when available", () => {
    render(<ChatPlaceCard place={visited} />);
    const links = screen.getAllByRole("link");
    const placeLink = links.find(l => l.getAttribute("href")?.includes("place.map.kakao.com"));
    expect(placeLink).toBeTruthy();
    expect(placeLink!.getAttribute("href")).toBe(
      "https://place.map.kakao.com/kakao-1",
    );
    expect(placeLink!.getAttribute("target")).toBe("_blank");
  });

  it("renders navigation button with correct Kakao Map URL", () => {
    render(<ChatPlaceCard place={visited} />);
    const links = screen.getAllByRole("link");
    const navLink = links.find(l => l.getAttribute("href")?.includes("map.kakao.com/link/to/"));
    expect(navLink).toBeTruthy();
    expect(navLink!.getAttribute("href")).toBe(
      "https://map.kakao.com/link/to/맛있는 치킨,37.5,127.05",
    );
    expect(navLink!.getAttribute("target")).toBe("_blank");
  });

  it("renders navigation button even without placeUrl", () => {
    render(<ChatPlaceCard place={wishlisted} />);
    const navLink = screen.getByRole("link", { name: /길찾기/ });
    expect(navLink.getAttribute("href")).toBe(
      "https://map.kakao.com/link/to/스시 오마카세,37.5,127.05",
    );
  });
});

describe("buildKakaoNavUrl", () => {
  it("constructs navigation URL with encoded name", () => {
    const url = buildKakaoNavUrl("맛있는 치킨", 37.5, 127.05);
    expect(url).toBe(
      "https://map.kakao.com/link/to/맛있는 치킨,37.5,127.05",
    );
  });

  it("encodes special characters in name", () => {
    const url = buildKakaoNavUrl("Bob's Burger & Grill", 37.123, 127.456);
    expect(url).toBe(
      "https://map.kakao.com/link/to/Bob's Burger & Grill,37.123,127.456",
    );
  });
});
