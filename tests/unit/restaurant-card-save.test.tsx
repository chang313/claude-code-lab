import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RestaurantCard from "@/components/RestaurantCard";

const baseRestaurant = {
  id: "kakao-123",
  name: "테스트 맛집",
  address: "서울 강남구",
  category: "음식점 > 한식",
  starRating: 4,
};

describe("RestaurantCard save-to-my-wishlist button", () => {
  it("renders save button when onSaveToMyWishlist provided and not saved", () => {
    const onSave = vi.fn();
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        variant="visited"
        onSaveToMyWishlist={onSave}
        isSavedToMyWishlist={false}
      />,
    );

    const btn = screen.getByRole("button", { name: /위시리스트에 추가/ });
    expect(btn).toBeDefined();
    expect(btn.textContent).toContain("내 위시리스트에 추가");
  });

  it("renders saved indicator when isSavedToMyWishlist is true", () => {
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        variant="visited"
        onSaveToMyWishlist={() => {}}
        isSavedToMyWishlist={true}
      />,
    );

    expect(screen.getByText("♡ 저장됨")).toBeDefined();
    expect(screen.queryByRole("button", { name: /위시리스트에 추가/ })).toBeNull();
  });

  it("calls onSaveToMyWishlist when button clicked", () => {
    const onSave = vi.fn();
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        variant="visited"
        onSaveToMyWishlist={onSave}
        isSavedToMyWishlist={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /위시리스트에 추가/ }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("shows loading state when isAdding is true", () => {
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        variant="visited"
        onSaveToMyWishlist={() => {}}
        isSavedToMyWishlist={false}
        isAdding={true}
      />,
    );

    const btn = screen.getByRole("button", { name: /위시리스트에 추가/ });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("works on wishlist variant too", () => {
    const onSave = vi.fn();
    render(
      <RestaurantCard
        restaurant={{ ...baseRestaurant, starRating: null }}
        variant="wishlist"
        onSaveToMyWishlist={onSave}
        isSavedToMyWishlist={false}
      />,
    );

    expect(screen.getByRole("button", { name: /위시리스트에 추가/ })).toBeDefined();
  });

  it("does not render save button when onSaveToMyWishlist not provided", () => {
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        variant="visited"
      />,
    );

    expect(screen.queryByRole("button", { name: /위시리스트에 추가/ })).toBeNull();
  });
});
