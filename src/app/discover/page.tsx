"use client";

import { useState, useEffect, useCallback } from "react";
import DiscoverCard from "@/components/DiscoverCard";
import Toast from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { invalidate, invalidateByPrefix } from "@/lib/supabase/invalidate";
import type { DiscoverItem, DiscoverResponse } from "@/types";

export default function DiscoverPage() {
  const [recommendations, setRecommendations] = useState<DiscoverItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recommendations/generate", {
        method: "POST",
      });

      if (!res.ok) {
        setError("추천 생성에 실패했습니다");
        return;
      }

      const data: DiscoverResponse = await res.json();
      setRecommendations(data.recommendations);
    } catch {
      setError("추천 생성에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleAdd = async (item: DiscoverItem) => {
    if (addingId) return;
    setAddingId(item.kakaoPlaceId);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("restaurants").insert({
        user_id: user.id,
        kakao_place_id: item.kakaoPlaceId,
        name: item.name,
        address: item.address,
        category: item.category,
        lat: item.lat,
        lng: item.lng,
        place_url: item.placeUrl,
        star_rating: null,
      });

      if (error) {
        if (error.code === "23505") {
          setToast({ message: "이미 저장된 맛집입니다", type: "error" });
          return;
        }
        throw error;
      }

      setToast({
        message: `${item.name} 위시리스트에 추가됨`,
        type: "success",
      });
      invalidate("restaurants");
      invalidateByPrefix("restaurant-status:");
      invalidateByPrefix("wishlisted-set:");

      // Remove from list
      setRecommendations((prev) =>
        prev.filter((r) => r.kakaoPlaceId !== item.kakaoPlaceId),
      );
    } catch {
      setToast({ message: "추가에 실패했습니다", type: "error" });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">맛집 추천</h1>
        <button
          onClick={fetchRecommendations}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          새로고침
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-xl h-28 animate-pulse"
            />
          ))}
          <p className="text-center text-sm text-gray-400">
            추천 맛집 찾는 중...
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{error}</p>
          <button
            onClick={fetchRecommendations}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800"
          >
            다시 시도
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">추천을 생성하려면 맛집을 더 저장해보세요</p>
          <p className="text-sm mt-1">
            최소 3개 이상의 맛집을 저장하면 AI가 추천해드려요
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((item) => (
            <DiscoverCard
              key={item.kakaoPlaceId}
              item={item}
              onAdd={handleAdd}
              isAdding={addingId === item.kakaoPlaceId}
            />
          ))}
        </div>
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
