"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfileWithCounts } from "@/types";
import FollowButton from "./FollowButton";
import ShareButton from "./ShareButton";
import Toast from "./Toast";

interface ProfileHeaderProps {
  profile: UserProfileWithCounts;
  isOwnProfile: boolean;
  wishlistCount?: number;
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
  wishlistCount = 0,
}: ProfileHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const handleLogout = async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;

    setLoggingOut(true);
    setToast(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setToast({ message: "로그아웃에 실패했습니다. 다시 시도해 주세요.", type: "error" });
      setLoggingOut(false);
      return;
    }

    router.push("/login");
  };

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

      {isOwnProfile ? (
        <div className="flex items-center gap-2">
          <ShareButton
            type="profile"
            userId={profile.id}
            displayName={profile.displayName}
            wishlistCount={wishlistCount}
            onResult={(result) => setToast(result)}
          />
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            로그아웃
          </button>
        </div>
      ) : (
        <FollowButton userId={profile.id} />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
