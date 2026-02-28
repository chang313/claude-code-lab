import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AssistantBubble from "@/components/AssistantBubble";
import type { Restaurant } from "@/types";

const placeMap = new Map<string, Restaurant>([
  [
    "kakao-1",
    {
      id: "kakao-1",
      name: "맛있는 치킨",
      category: "음식점 > 치킨",
      address: "서울",
      lat: 37.5,
      lng: 127.05,
      starRating: 4,
      createdAt: "2024-01-01",
    },
  ],
]);

describe("AssistantBubble", () => {
  it("renders plain text without markers", () => {
    render(<AssistantBubble content="안녕하세요!" placeMap={placeMap} />);
    expect(screen.getByText("안녕하세요!")).toBeTruthy();
  });

  it("renders place card for valid marker", () => {
    render(
      <AssistantBubble
        content="추천: <<PLACE:kakao-1>> 입니다"
        placeMap={placeMap}
      />,
    );
    expect(screen.getByText("맛있는 치킨")).toBeTruthy();
    expect(screen.getByText("추천:")).toBeTruthy();
  });

  it("renders marker as plain text when place not found", () => {
    render(
      <AssistantBubble
        content="<<PLACE:unknown-id>> 추천!"
        placeMap={placeMap}
      />,
    );
    // Should not render a card, just show text
    expect(screen.queryByText("unknown-id")).toBeFalsy();
    expect(screen.getByText("추천!")).toBeTruthy();
  });
});
