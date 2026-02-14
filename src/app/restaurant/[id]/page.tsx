"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/index";
import {
  useMenuItems,
  useAddMenuItem,
  useRemoveMenuItem,
  useUpdateStarRating,
  useRemoveRestaurant,
} from "@/db/hooks";
import StarRating from "@/components/StarRating";
import MenuItemList from "@/components/MenuItemList";

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const restaurant = useLiveQuery(() => db.restaurants.get(id), [id]);
  const { menuItems, isLoading: menuLoading } = useMenuItems(id);
  const { addMenuItem } = useAddMenuItem();
  const { removeMenuItem } = useRemoveMenuItem();
  const { updateStarRating } = useUpdateStarRating();
  const { removeRestaurant } = useRemoveRestaurant();

  if (restaurant === undefined) {
    return (
      <div className="text-center py-8 text-gray-400">Loading...</div>
    );
  }

  if (restaurant === null) {
    return (
      <div className="text-center py-8 text-gray-500">
        Restaurant not found
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
        ← Back
      </button>

      <div>
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{restaurant.address}</p>
        <p className="text-xs text-gray-400 mt-0.5">{restaurant.category}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Rating:</span>
        <StarRating
          value={restaurant.starRating as 1 | 2 | 3}
          onChange={(rating) => updateStarRating(id, rating)}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Menu Items</h2>
        {menuLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <MenuItemList
            items={menuItems.map((m) => ({ id: m.id!, name: m.name }))}
            onAdd={(name) => addMenuItem(id, name)}
            onRemove={removeMenuItem}
          />
        )}
      </div>

      {restaurant.placeUrl && (
        <a
          href={restaurant.placeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-blue-600 hover:text-blue-800 underline"
        >
          View on Kakao Map
        </a>
      )}

      <button
        onClick={handleDelete}
        className="w-full py-2 text-red-600 text-sm font-medium border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
      >
        Remove from Wishlist
      </button>
    </div>
  );
}
