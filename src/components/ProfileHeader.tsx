"use client";

import type { UserProfileWithCounts } from "@/types";
import FollowButton from "./FollowButton";

interface ProfileHeaderProps {
  profile: UserProfileWithCounts;
  isOwnProfile: boolean;
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
}: ProfileHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt={profile.displayName}
          className="w-20 h-20 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-3xl">
          👤
        </div>
      )}

      <div className="text-center space-y-1">
        <p className="text-lg font-semibold">{profile.displayName}</p>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>
            <strong className="text-gray-900">{profile.followerCount}</strong>{" "}
            팔로워
          </span>
          <span>
            <strong className="text-gray-900">{profile.followingCount}</strong>{" "}
            팔로잉
          </span>
        </div>
      </div>

      {!isOwnProfile && <FollowButton userId={profile.id} />}
    </div>
  );
}
