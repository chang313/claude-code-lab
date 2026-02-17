"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  useRestaurant,
  useUpdateStarRating,
  useRemoveRestaurant,
} from "@/db/hooks";
import StarRating from "@/components/StarRating";

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { restaurant, isLoading } = useRestaurant(id);
  const { updateStarRating } = useUpdateStarRating();
  const { removeRestaurant } = useRemoveRestaurant();

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">로딩 중...</div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-8 text-gray-500">
        음식점을 찾을 수 없습니다
      </div>
    );
  }

  const handleDelete = async () => {
    await removeRestaurant(id);
    router.push("/");
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        ← 뒤로
      </button>

      <div>
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{restaurant.address}</p>
        <p className="text-xs text-gray-400 mt-0.5">{restaurant.category}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">평점:</span>
        <StarRating
          value={restaurant.starRating as 1 | 2 | 3}
          onChange={(rating) => updateStarRating(id, rating)}
        />
      </div>

      {restaurant.placeUrl && (
        <a
          href={restaurant.placeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-blue-600 hover:text-blue-800 underline"
        >
          카카오맵에서 보기
        </a>
      )}

      <button
        onClick={handleDelete}
        className="w-full py-2 text-red-600 text-sm font-medium border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
      >
        맛집에서 삭제
      </button>
    </div>
  );
}
