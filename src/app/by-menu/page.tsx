"use client";

import Link from "next/link";
import { useMenuGroups } from "@/db/hooks";

export default function ByMenuPage() {
  const { groups, isLoading } = useMenuGroups();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">By Menu</h1>
        <div className="text-center py-8 text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">By Menu</h1>

      {groups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No menu items saved yet</p>
          <p className="text-sm mt-1">
            Add menu items to restaurants in your wishlist
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Link
              key={group.normalizedName}
              href={`/by-menu/${encodeURIComponent(group.normalizedName)}`}
              className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">{group.displayName}</span>
              <span className="text-sm text-gray-500">
                {group.count} restaurant{group.count !== 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
