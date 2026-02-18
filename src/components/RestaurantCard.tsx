"use client";

import StarRating from "./StarRating";

interface RestaurantCardProps {
  restaurant: {
    id: string;
    name: string;
    address: string;
    category: string;
    starRating: number;
  };
  variant: "search-result" | "wishlist";
  distance?: string;
  isWishlisted?: boolean;
  onAddToWishlist?: () => void;
  onRemove?: () => void;
  onStarChange?: (rating: 1 | 2 | 3) => void;
  onClick?: () => void;
  onRecommend?: () => void;
}

export default function RestaurantCard({
  restaurant,
  variant,
  distance,
  isWishlisted,
  onAddToWishlist,
  onRemove,
  onStarChange,
  onClick,
  onRecommend,
}: RestaurantCardProps) {
  return (
    <div
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      role="article"
      aria-label={restaurant.name}
      data-testid="restaurant-card"
    >
      <div
        className={onClick ? "cursor-pointer" : ""}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? "button" : undefined}
      >
        <h3 className="font-semibold text-lg leading-tight">
          {restaurant.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1">{restaurant.address}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400">{restaurant.category}</p>
          {distance && (
            <span className="text-xs font-medium text-blue-600">{distance}</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        {variant === "wishlist" && onStarChange && (
          <StarRating
            value={restaurant.starRating as 1 | 2 | 3}
            onChange={onStarChange}
            size="sm"
          />
        )}

        {variant === "search-result" && (
          <>
            {isWishlisted ? (
              <span className="text-sm text-green-600 font-medium">
                ✓ 저장됨
              </span>
            ) : (
              <button
                onClick={onAddToWishlist}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
                aria-label={`${restaurant.name} 맛집 추가`}
              >
                + 맛집 추가
              </button>
            )}
          </>
        )}

        {variant === "wishlist" && (
          <div className="flex items-center gap-3">
            {onRecommend && (
              <button
                onClick={onRecommend}
                className="text-sm text-blue-500 hover:text-blue-700"
                aria-label={`${restaurant.name} 추천`}
              >
                추천
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="text-sm text-red-500 hover:text-red-700"
                aria-label={`${restaurant.name} 삭제`}
              >
                삭제
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
