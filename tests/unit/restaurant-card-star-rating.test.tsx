import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RestaurantCard from "@/components/RestaurantCard";

const visitedRestaurant = {
  id: "1",
  name: "맛있는 식당",
  address: "서울시 강남구",
  category: "음식점 > 한식",
  starRating: 2 as number | null,
};

const wishlistRestaurant = {
  ...visitedRestaurant,
  starRating: null,
};

describe("RestaurantCard star rating on profile pages", () => {
  it("shows readonly star rating on visited card without onStarChange", () => {
    render(
      <RestaurantCard restaurant={visitedRestaurant} variant="visited" />,
    );

    const starGroup = screen.getByRole("group", { name: "별점" });
    expect(starGroup).toBeDefined();

    // All star buttons should be disabled (readonly)
    const stars = screen.getAllByRole("button", { name: /점$/ });
    expect(stars).toHaveLength(3);
    stars.forEach((star) => {
      expect(star).toBeDisabled();
    });

    // First 2 stars filled (rating=2), third gray
    expect(stars[0]).toHaveClass("text-yellow-400");
    expect(stars[1]).toHaveClass("text-yellow-400");
    expect(stars[2]).toHaveClass("text-gray-300");
  });

  it("does not show star rating on wishlist card", () => {
    render(
      <RestaurantCard restaurant={wishlistRestaurant} variant="wishlist" />,
    );

    const starGroup = screen.queryByRole("group", { name: "별점" });
    expect(starGroup).toBeNull();
  });

  it("shows editable stars when onStarChange is provided (regression)", () => {
    const onStarChange = vi.fn();
    render(
      <RestaurantCard
        restaurant={visitedRestaurant}
        variant="visited"
        onStarChange={onStarChange}
      />,
    );

    const stars = screen.getAllByRole("button", { name: /점$/ });
    expect(stars).toHaveLength(3);

    // Stars should NOT be disabled when editable
    stars.forEach((star) => {
      expect(star).not.toBeDisabled();
    });
  });

  it("shows correct stars for all rating values (1, 2, 3)", () => {
    for (const rating of [1, 2, 3]) {
      const { unmount } = render(
        <RestaurantCard
          restaurant={{ ...visitedRestaurant, starRating: rating }}
          variant="visited"
        />,
      );

      const stars = screen.getAllByRole("button", { name: /점$/ });
      for (let i = 0; i < 3; i++) {
        if (i < rating) {
          expect(stars[i]).toHaveClass("text-yellow-400");
        } else {
          expect(stars[i]).toHaveClass("text-gray-300");
        }
      }
      unmount();
    }
  });
});
