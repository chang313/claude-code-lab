"use client";

import { useState, useCallback } from "react";
import SearchBar from "@/components/SearchBar";
import RestaurantCard from "@/components/RestaurantCard";
import { searchByKeyword } from "@/lib/kakao";
import { useAddRestaurant, useIsWishlistedSet } from "@/db/search-hooks";
import type { KakaoPlace } from "@/types";

export default function SearchPage() {
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { addRestaurant } = useAddRestaurant();
  const wishlistedIds = useIsWishlistedSet(results.map((r) => r.id));

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await searchByKeyword({ query, size: 15 });
      setResults(response.documents);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAdd = async (place: KakaoPlace) => {
    const added = await addRestaurant(place);
    if (!added) {
      // Already wishlisted — UI will update reactively
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Search Restaurants</h1>
      <SearchBar onSearch={handleSearch} isLoading={isLoading} />

      {hasSearched && !isLoading && results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">No restaurants found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((place) => (
          <RestaurantCard
            key={place.id}
            restaurant={{
              id: place.id,
              name: place.place_name,
              address: place.road_address_name || place.address_name,
              category: place.category_name,
              starRating: 1,
            }}
            variant="search-result"
            isWishlisted={wishlistedIds.has(place.id)}
            onAddToWishlist={() => handleAdd(place)}
          />
        ))}
      </div>
    </div>
  );
}
