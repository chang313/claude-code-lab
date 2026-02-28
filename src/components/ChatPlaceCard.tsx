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

export function buildKakaoNavUrl(name: string, lat: number, lng: number): string {
  return `https://map.kakao.com/link/to/${name},${lat},${lng}`;
}

export default function ChatPlaceCard({ place }: ChatPlaceCardProps) {
  const navUrl = buildKakaoNavUrl(place.name, place.lat, place.lng);

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
        <div className="shrink-0 flex items-center gap-2">
          {place.starRating !== null ? (
            <span className="text-xs text-yellow-500">
              {renderStars(place.starRating)}
            </span>
          ) : (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              위시리스트
            </span>
          )}
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-500 hover:text-blue-700 p-1"
            aria-label="길찾기"
            title="길찾기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
            </svg>
          </a>
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
