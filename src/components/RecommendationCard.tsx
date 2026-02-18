"use client";

import { useState } from "react";
import type { RecommendationWithSender } from "@/types";
import {
  useAcceptRecommendation,
  useIgnoreRecommendation,
  useIsAlreadyWishlisted,
} from "@/db/recommendation-hooks";

interface RecommendationCardProps {
  recommendation: RecommendationWithSender;
}

export default function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  const { acceptRecommendation } = useAcceptRecommendation();
  const { ignoreRecommendation } = useIgnoreRecommendation();
  const isAlreadyWishlisted = useIsAlreadyWishlisted(
    recommendation.kakaoPlaceId,
  );
  const [acting, setActing] = useState(false);

  const handleAccept = async () => {
    setActing(true);
    try {
      await acceptRecommendation(recommendation);
    } finally {
      setActing(false);
    }
  };

  const handleIgnore = async () => {
    setActing(true);
    try {
      await ignoreRecommendation(recommendation.id);
    } finally {
      setActing(false);
    }
  };

  const timeAgo = getTimeAgo(recommendation.createdAt);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        {recommendation.sender.avatarUrl ? (
          <img
            src={recommendation.sender.avatarUrl}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
            {recommendation.sender.displayName[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">
            {recommendation.sender.displayName}
          </span>
          <span className="text-xs text-gray-400 ml-1">
            님의 추천 · {timeAgo}
          </span>
        </div>
        {!recommendation.isRead && (
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        )}
      </div>

      <div className="mb-3">
        <h3 className="font-semibold text-base">
          {recommendation.restaurantName}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {recommendation.restaurantAddress}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {recommendation.restaurantCategory}
        </p>
      </div>

      <div className="flex gap-2">
        {isAlreadyWishlisted ? (
          <span className="flex-1 text-center py-2 text-sm text-gray-400 bg-gray-100 rounded-lg">
            이미 저장된 맛집입니다
          </span>
        ) : (
          <button
            onClick={handleAccept}
            disabled={acting}
            className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {acting ? "추가 중..." : "내 맛집에 추가"}
          </button>
        )}
        <button
          onClick={handleIgnore}
          disabled={acting}
          className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          무시
        </button>
      </div>
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return new Date(dateString).toLocaleDateString("ko-KR");
}
