"use client";

import Link from "next/link";
import type { UserProfile } from "@/types";

interface UserCardProps {
  user: UserProfile;
  action?: React.ReactNode;
}

export default function UserCard({ user, action }: UserCardProps) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
      <Link href={`/users/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-10 h-10 rounded-full object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg shrink-0">
            👤
          </div>
        )}
        <span className="font-medium text-sm truncate">{user.displayName}</span>
      </Link>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
