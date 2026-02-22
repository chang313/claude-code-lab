"use client";

import StarRating from "./StarRating";

interface RestaurantCardProps {
  restaurant: {
    id: string;
    name: string;
    address: string;
    category: string;
    starRating: number | null;
  };
  variant: "search-result" | "wishlist" | "visited";
  distance?: string;
  isWishlisted?: boolean;
  savedStatus?: "wishlist" | "visited" | null;
  isAdding?: boolean;
  onAddToWishlist?: () => void;
  onAddAsVisited?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  onRemove?: () => void;
  onStarChange?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  onClick?: () => void;
  onRecommend?: () => void;
  onMoveToWishlist?: () => void;
}

export default function RestaurantCard({
  restaurant,
  variant,
  distance,
  isWishlisted,
  savedStatus,
  isAdding,
  onAddToWishlist,
  onAddAsVisited,
  onRemove,
  onStarChange,
  onClick,
  onRecommend,
  onMoveToWishlist,
}: RestaurantCardProps) {
  const isSaved = savedStatus != null || isWishlisted;

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
        {/* Visited cards: editable stars if handler provided, readonly otherwise */}
        {variant === "visited" && onStarChange && (
          <StarRating
            value={restaurant.starRating as 1 | 2 | 3 | 4 | 5}
            onChange={onStarChange}
            size="sm"
          />
        )}
        {variant === "visited" && !onStarChange && restaurant.starRating != null && (
          <StarRating
            value={restaurant.starRating as 1 | 2 | 3 | 4 | 5}
            readonly
            size="sm"
          />
        )}

        {/* Wishlist cards: gray tappable stars (tap to promote) */}
        {variant === "wishlist" && onStarChange && (
          <StarRating
            value={null}
            onChange={onStarChange}
            size="sm"
          />
        )}

        {/* Search result: saved indicators or add buttons */}
        {variant === "search-result" && (
          <>
            {isSaved ? (
              <span className="text-sm font-medium">
                {savedStatus === "visited" ? (
                  <span className="text-yellow-500">★ 저장됨</span>
                ) : (
                  <span className="text-pink-500">♡ 저장됨</span>
                )}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                {onAddAsVisited && (
                  <button
                    onClick={() => onAddAsVisited(1)}
                    disabled={isAdding}
                    className={`px-3 py-1.5 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 active:bg-yellow-700 transition-colors${isAdding ? " opacity-50 pointer-events-none" : ""}`}
                    aria-label={`${restaurant.name} 방문 추가`}
                  >
                    ★
                  </button>
                )}
                <button
                  onClick={onAddToWishlist}
                  disabled={isAdding}
                  className={`px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors${isAdding ? " opacity-50 pointer-events-none" : ""}`}
                  aria-label={`${restaurant.name} 위시리스트 추가`}
                >
                  {isAdding ? "…" : "+ 추가"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Visited card actions */}
        {variant === "visited" && (
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
            {onMoveToWishlist && (
              <button
                onClick={onMoveToWishlist}
                className="text-sm text-orange-500 hover:text-orange-700"
                aria-label={`${restaurant.name} 위시리스트로`}
              >
                위시리스트로
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

        {/* Wishlist card actions */}
        {variant === "wishlist" && (
          <div className="flex items-center gap-3">
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
