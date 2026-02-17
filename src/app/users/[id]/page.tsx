"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfileWithCounts, useUserWishlistGrouped } from "@/db/profile-hooks";
import ProfileHeader from "@/components/ProfileHeader";
import CategoryAccordion from "@/components/CategoryAccordion";
import RestaurantCard from "@/components/RestaurantCard";
import FollowTabs from "@/components/FollowTabs";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { profile, isLoading: profileLoading } = useProfileWithCounts(id);
  const { groups, isLoading: wishlistLoading } = useUserWishlistGrouped(id);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const isOwnProfile = currentUserId === id;

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

      <FollowTabs userId={id} profile={profile} isOwnProfile={isOwnProfile}>
        {/* Wishlist tab content */}
        {wishlistLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            아직 저장된 맛집이 없습니다
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <CategoryAccordion
                key={group.subcategory}
                subcategory={group.subcategory}
                count={group.count}
                defaultExpanded={groups.length <= 3}
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
      </FollowTabs>
    </div>
  );
}
