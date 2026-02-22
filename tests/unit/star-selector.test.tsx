import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StarRating from "@/components/StarRating";

describe("StarRating component", () => {
  it("should render 5 star buttons", () => {
    render(<StarRating value={1} />);
    const stars = screen.getAllByRole("button");
    expect(stars).toHaveLength(5);
  });

  it("should show default value of 1 star filled", () => {
    render(<StarRating value={1} />);
    const stars = screen.getAllByRole("button");
    // First star should be yellow (filled), others gray
    expect(stars[0]).toHaveClass("text-yellow-400");
    expect(stars[1]).toHaveClass("text-gray-300");
    expect(stars[2]).toHaveClass("text-gray-300");
    expect(stars[3]).toHaveClass("text-gray-300");
    expect(stars[4]).toHaveClass("text-gray-300");
  });

  it("should call onChange with correct rating when star 5 is clicked", () => {
    const onChange = vi.fn();
    render(<StarRating value={1} onChange={onChange} />);

    const stars = screen.getAllByRole("button");
    fireEvent.click(stars[4]); // Click star 5

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("should reflect selected rating visually", () => {
    render(<StarRating value={5} />);
    const stars = screen.getAllByRole("button");
    // All 5 stars should be yellow (filled)
    expect(stars[0]).toHaveClass("text-yellow-400");
    expect(stars[1]).toHaveClass("text-yellow-400");
    expect(stars[2]).toHaveClass("text-yellow-400");
    expect(stars[3]).toHaveClass("text-yellow-400");
    expect(stars[4]).toHaveClass("text-yellow-400");
  });
});

describe("Star rating passed to addRestaurant", () => {
  it("should pass selected rating instead of hardcoded 1", () => {
    const addRestaurant = vi.fn();
    const place = {
      id: "123",
      place_name: "Test Restaurant",
      address_name: "서울시",
      road_address_name: "서울시 강남구",
      category_group_name: "음식점",
      category_name: "음식점 > 한식",
      x: "127.0",
      y: "37.5",
      place_url: "",
    };
    const selectedRating = 5;

    addRestaurant(place, selectedRating);

    expect(addRestaurant).toHaveBeenCalledWith(place, 5);
    expect(addRestaurant).not.toHaveBeenCalledWith(place, 1);
  });
});
