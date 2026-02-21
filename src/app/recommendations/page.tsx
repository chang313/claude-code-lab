"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RecommendationCard from "@/components/RecommendationCard";
import {
  useReceivedRecommendations,
  useMarkRecommendationsRead,
} from "@/db/recommendation-hooks";

export default function RecommendationsPage() {
  const router = useRouter();
  const { recommendations, isLoading } = useReceivedRecommendations();
  const { markAsRead } = useMarkRecommendationsRead();

  useEffect(() => {
    if (recommendations.length > 0) {
      markAsRead();
    }
  }, [recommendations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 pb-20">
      <button
        onClick={() => router.back()}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        ← 뒤로
      </button>
      <h1 className="text-2xl font-bold">받은 추천</h1>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">로딩 중...</div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">아직 받은 추천이 없습니다</p>
          <p className="text-sm mt-1">
            서로 팔로우한 친구가 맛집을 추천하면 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
