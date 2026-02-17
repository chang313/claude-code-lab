"use client";

import { useState } from "react";
import { useFollowUser, useUnfollowUser, useIsFollowing } from "@/db/follow-hooks";
import ErrorToast from "./ErrorToast";

interface FollowButtonProps {
  userId: string;
}

export default function FollowButton({ userId }: FollowButtonProps) {
  const { isFollowing, isLoading } = useIsFollowing(userId);
  const { followUser } = useFollowUser();
  const { unfollowUser } = useUnfollowUser();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return null;

  const handleClick = async () => {
    setIsPending(true);
    setError(null);
    try {
      if (isFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } catch {
      setError(isFollowing ? "팔로우 취소에 실패했습니다" : "팔로우에 실패했습니다");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          isFollowing
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
            : "bg-blue-600 text-white hover:bg-blue-700"
        } ${isPending ? "opacity-50" : ""}`}
      >
        {isPending ? "..." : isFollowing ? "팔로잉" : "팔로우"}
      </button>
      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
    </>
  );
}
