"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RestaurantCard from "@/components/RestaurantCard";
import CategoryAccordion from "@/components/CategoryAccordion";
import RecommendModal from "@/components/RecommendModal";
import {
  useVisitedGrouped,
  useWishlistGrouped,
  useRemoveRestaurant,
  useUpdateStarRating,
  useMarkAsVisited,
  useMoveToWishlist,
} from "@/db/hooks";
import type { Restaurant } from "@/types";

export default function WishlistPage() {
  const { groups: visitedGroups, isLoading: visitedLoading } =
    useVisitedGrouped();
  const { groups: wishlistGroups, isLoading: wishlistLoading } =
    useWishlistGrouped();
  const { removeRestaurant } = useRemoveRestaurant();
  const { updateStarRating } = useUpdateStarRating();
  const { markAsVisited } = useMarkAsVisited();
  const { moveToWishlist } = useMoveToWishlist();
  const router = useRouter();
  const [recommendTarget, setRecommendTarget] = useState<Restaurant | null>(
    null,
  );

  const isLoading = visitedLoading || wishlistLoading;
  const visitedCount = visitedGroups.reduce((sum, g) => sum + g.count, 0);
  const wishlistCount = wishlistGroups.reduce((sum, g) => sum + g.count, 0);
  const bothEmpty = visitedCount === 0 && wishlistCount === 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">나의 맛집</h1>
        <div className="text-center py-8 text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">나의 맛집</h1>

      {bothEmpty ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">아직 저장된 맛집이 없습니다</p>
          <p className="text-sm mt-1">
            검색하거나 지도에서 맛집을 추가해 보세요
          </p>
        </div>
      ) : (
        <>
          {/* Visited Section (맛집 리스트) */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">
              맛집 리스트 ({visitedCount})
            </h2>
            {visitedCount === 0 ? (
              <p className="text-sm text-gray-400 py-4">
                아직 방문한 맛집이 없습니다. 위시 리스트에서 별점을 눌러 방문 기록을 남겨보세요.
              </p>
            ) : (
              <div className="space-y-4">
                {visitedGroups.map((group) => (
                  <CategoryAccordion
                    key={group.subcategory}
                    subcategory={group.subcategory}
                    count={group.count}
                  >
                    {group.restaurants.map((restaurant) => (
                      <RestaurantCard
                        key={restaurant.id}
                        restaurant={restaurant}
                        variant="visited"
                        onStarChange={(rating) =>
                          updateStarRating(restaurant.id, rating)
                        }
                        onRemove={() => removeRestaurant(restaurant.id)}
                        onClick={() =>
                          router.push(`/restaurant/${restaurant.id}`)
                        }
                        onRecommend={() => setRecommendTarget(restaurant)}
                        onMoveToWishlist={() => moveToWishlist(restaurant.id)}
                      />
                    ))}
                  </CategoryAccordion>
                ))}
              </div>
            )}
          </section>

          {/* Wishlist Section (위시 리스트) */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">
              위시 리스트 ({wishlistCount})
            </h2>
            {wishlistCount === 0 ? (
              <p className="text-sm text-gray-400 py-4">
                위시 리스트가 비어있습니다. 검색에서 맛집을 추가해 보세요.
              </p>
            ) : (
              <div className="space-y-4">
                {wishlistGroups.map((group) => (
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
                          markAsVisited(restaurant.id, rating)
                        }
                        onRemove={() => removeRestaurant(restaurant.id)}
                        onClick={() =>
                          router.push(`/restaurant/${restaurant.id}`)
                        }
                      />
                    ))}
                  </CategoryAccordion>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {recommendTarget && (
        <RecommendModal
          restaurant={recommendTarget}
          onClose={() => setRecommendTarget(null)}
        />
      )}
    </div>
  );
}
