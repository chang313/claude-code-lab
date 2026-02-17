"use client";

import { useRouter } from "next/navigation";
import RestaurantCard from "@/components/RestaurantCard";
import CategoryAccordion from "@/components/CategoryAccordion";
import {
  useWishlistGrouped,
  useRemoveRestaurant,
  useUpdateStarRating,
} from "@/db/hooks";

export default function WishlistPage() {
  const { groups, isLoading } = useWishlistGrouped();
  const { removeRestaurant } = useRemoveRestaurant();
  const { updateStarRating } = useUpdateStarRating();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">나의 맛집</h1>
        <div className="text-center py-8 text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">나의 맛집</h1>

      {groups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">아직 저장된 맛집이 없습니다</p>
          <p className="text-sm mt-1">
            검색하거나 지도에서 맛집을 추가해 보세요
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <CategoryAccordion
              key={group.subcategory}
              subcategory={group.subcategory}
              count={group.count}
            >
              {group.restaurants.map((restaurant) => (
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
            </CategoryAccordion>
          ))}
        </div>
      )}
    </div>
  );
}
