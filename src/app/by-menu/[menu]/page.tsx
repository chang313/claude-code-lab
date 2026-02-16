"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useRestaurantsByMenu } from "@/db/hooks";
import RestaurantCard from "@/components/RestaurantCard";

export default function MenuDetailPage({
  params,
}: {
  params: Promise<{ menu: string }>;
}) {
  const { menu } = use(params);
  const normalizedName = decodeURIComponent(menu);
  const { restaurants, isLoading } = useRestaurantsByMenu(normalizedName);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">Loading...</div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold capitalize">{normalizedName}</h1>
      <p className="text-sm text-gray-500">
        {restaurants.length} restaurant{restaurants.length !== 1 ? "s" : ""}
      </p>

      <div className="space-y-3">
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            variant="wishlist"
            onClick={() => router.push(`/restaurant/${restaurant.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
