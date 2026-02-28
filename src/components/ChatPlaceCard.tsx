"use client";

import type { Restaurant } from "@/types";

interface ChatPlaceCardProps {
  place: Restaurant;
}

function getSubcategory(category: string): string {
  const parts = category.split(" > ");
  return parts[parts.length - 1] || category;
}

function renderStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export default function ChatPlaceCard({ place }: ChatPlaceCardProps) {
  const card = (
    <div className="my-2 bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 truncate">
            {place.name}
          </h4>
          <p className="text-xs text-gray-500">{getSubcategory(place.category)}</p>
          <p className="text-xs text-gray-400 truncate">{place.address}</p>
        </div>
        <div className="shrink-0 text-right">
          {place.starRating !== null ? (
            <span className="text-xs text-yellow-500">
              {renderStars(place.starRating)}
            </span>
          ) : (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              위시리스트
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (place.placeUrl) {
    return (
      <a href={place.placeUrl} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }

  return card;
}
