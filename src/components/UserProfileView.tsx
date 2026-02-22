"use client";

import Link from "next/link";
import { useProfileWithCounts, useUserVisitedGrouped, useUserWishlistGrouped } from "@/db/profile-hooks";
import ProfileHeader from "@/components/ProfileHeader";
import CategoryAccordion from "@/components/CategoryAccordion";
import RestaurantCard from "@/components/RestaurantCard";
import FollowTabs from "@/components/FollowTabs";

interface UserProfileViewProps {
  userId: string;
  isOwnProfile: boolean;
}

export default function UserProfileView({
  userId,
  isOwnProfile,
}: UserProfileViewProps) {
  const { profile, isLoading: profileLoading } =
    useProfileWithCounts(userId);
  const { groups: visitedGroups, isLoading: visitedLoading } =
    useUserVisitedGrouped(userId);
  const { groups: wishlistGroups, isLoading: wishlistLoading } =
    useUserWishlistGrouped(userId);

  const listsLoading = visitedLoading || wishlistLoading;
  const visitedCount = visitedGroups.reduce((sum, g) => sum + g.count, 0);
  const wishlistCount = wishlistGroups.reduce((sum, g) => sum + g.count, 0);
  const bothEmpty = visitedCount === 0 && wishlistCount === 0;

  if (profileLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24 animate-pulse">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-20 h-20 rounded-full bg-gray-200" />
          <div className="space-y-2 flex flex-col items-center">
            <div className="h-5 w-28 bg-gray-200 rounded" />
            <div className="h-4 w-36 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="flex border-b border-gray-200 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 py-3 flex justify-center">
              <div className="h-4 w-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-gray-500">
        사용자를 찾을 수 없습니다
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      <FollowTabs
        userId={userId}
        profile={profile}
        isOwnProfile={isOwnProfile}
      >
        {listsLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : bothEmpty ? (
          <p className="text-center text-gray-400 py-8">
            아직 저장된 맛집이 없습니다
          </p>
        ) : (
          <div className="space-y-6">
            {/* Visited Section */}
            <section>
              <h3 className="text-base font-bold text-gray-800 mb-2">
                맛집 리스트 ({visitedCount})
              </h3>
              {visitedCount === 0 ? (
                <p className="text-sm text-gray-400 py-2">
                  아직 방문한 맛집이 없습니다
                </p>
              ) : (
                <div className="space-y-4">
                  {visitedGroups.map((group) => (
                    <CategoryAccordion
                      key={group.subcategory}
                      subcategory={group.subcategory}
                      count={group.count}
                      defaultExpanded={visitedGroups.length <= 3}
                    >
                      {group.restaurants.map((restaurant) => (
                        <RestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          variant="visited"
                        />
                      ))}
                    </CategoryAccordion>
                  ))}
                </div>
              )}
            </section>

            {/* Wishlist Section */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-gray-800">
                  위시 리스트 ({wishlistCount})
                </h3>
                {isOwnProfile && (
                  <Link
                    href="/my/import"
                    className="text-xs text-blue-500 font-medium"
                  >
                    네이버에서 가져오기
                  </Link>
                )}
              </div>
              {wishlistCount === 0 ? (
                <p className="text-sm text-gray-400 py-2">
                  위시 리스트가 비어있습니다
                </p>
              ) : (
                <div className="space-y-4">
                  {wishlistGroups.map((group) => (
                    <CategoryAccordion
                      key={group.subcategory}
                      subcategory={group.subcategory}
                      count={group.count}
                      defaultExpanded={wishlistGroups.length <= 3}
                    >
                      {group.restaurants.map((restaurant) => (
                        <RestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          variant="wishlist"
                        />
                      ))}
                    </CategoryAccordion>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </FollowTabs>
    </div>
  );
}
