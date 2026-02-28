"use client";

import type { DiscoverItem } from "@/types";

interface DiscoverCardProps {
  item: DiscoverItem;
  onAdd: (item: DiscoverItem) => void;
  isAdding?: boolean;
}

export default function DiscoverCard({
  item,
  onAdd,
  isAdding,
}: DiscoverCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm" aria-label={item.source === "social" ? "친구 추천" : "새로운 발견"}>
              {item.source === "social" ? "👥" : "🧭"}
            </span>
            <h3 className="font-semibold text-gray-900 truncate">
              {item.name}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mb-1">{item.category}</p>
          <p className="text-xs text-gray-400 truncate">{item.address}</p>
          <div className="mt-2 bg-blue-50 rounded-lg px-3 py-1.5">
            <p className="text-xs text-blue-700">{item.reason}</p>
          </div>
        </div>
        <button
          onClick={() => onAdd(item)}
          disabled={isAdding}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium ${
            isAdding
              ? "bg-gray-100 text-gray-400"
              : "bg-blue-600 text-white active:bg-blue-700"
          }`}
        >
          {isAdding ? "…" : "추가"}
        </button>
      </div>
    </div>
  );
}
