"use client";

import { useState } from "react";
import Link from "next/link";
import { useUnreadRecommendationCount } from "@/db/recommendation-hooks";
import ShareButton from "./ShareButton";
import Toast from "./Toast";

export default function TopBar() {
  const { count } = useUnreadRecommendationCount();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
        <span className="font-bold text-lg">맛집 리스트</span>
        <div className="flex items-center">
          <ShareButton
            type="service"
            onResult={(result) => setToast(result)}
          />
          <Link
            href="/recommendations"
            className="relative p-2 -mr-2 text-gray-600 hover:text-gray-900"
            aria-label={`추천 알림${count > 0 ? `, ${count}개 안읽음` : ""}`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {count > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </header>
  );
}
