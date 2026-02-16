"use client";

import { useRouter } from "next/navigation";
import RestaurantCard from "@/components/RestaurantCard";
import {
  useWishlist,
  useRemoveRestaurant,
  useUpdateStarRating,
} from "@/db/hooks";

export default function WishlistPage() {
  const { restaurants, isLoading } = useWishlist();
  const { removeRestaurant } = useRemoveRestaurant();
  const { updateStarRating } = useUpdateStarRating();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Wishlist</h1>
        <div className="text-center py-8 text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Wishlist</h1>

      {restaurants.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No restaurants saved yet</p>
          <p className="text-sm mt-1">
            Search or browse the map to add restaurants
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              variant="wishlist"
              onStarChange={(rating) =>
                updateStarRating(restaurant.id, rating)
              }
              onRemove={() => removeRestaurant(restaurant.id)}
              onClick={() => router.push(`/restaurant/${restaurant.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
