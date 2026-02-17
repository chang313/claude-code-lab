"use client";

import { useState, type ReactNode } from "react";
import { useFollowers, useFollowing } from "@/db/follow-hooks";
import type { UserProfileWithCounts } from "@/types";
import UserCard from "./UserCard";
import FollowButton from "./FollowButton";

type TabKey = "wishlist" | "followers" | "following";

interface FollowTabsProps {
  userId: string;
  profile: UserProfileWithCounts;
  isOwnProfile: boolean;
  children: ReactNode; // wishlist content
}

export default function FollowTabs({
  userId,
  profile,
  isOwnProfile,
  children,
}: FollowTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("wishlist");
  const { followers, isLoading: followersLoading } = useFollowers(userId);
  const { following, isLoading: followingLoading } = useFollowing(userId);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "wishlist", label: "맛집" },
    { key: "followers", label: "팔로워", count: profile.followerCount },
    { key: "following", label: "팔로잉", count: profile.followingCount },
  ];

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 text-xs">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "wishlist" && children}

      {activeTab === "followers" && (
        <div className="space-y-2">
          {followersLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : followers.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              아직 팔로워가 없습니다
            </p>
          ) : (
            followers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                action={!isOwnProfile || user.id !== userId ? <FollowButton userId={user.id} /> : undefined}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "following" && (
        <div className="space-y-2">
          {followingLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : following.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              아직 팔로우하는 사람이 없습니다
            </p>
          ) : (
            following.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                action={<FollowButton userId={user.id} />}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
