"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import SearchBar from "@/components/SearchBar";
import MapView from "@/components/MapView";
import BottomSheet from "@/components/BottomSheet";
import RestaurantCard from "@/components/RestaurantCard";
import { smartSearch } from "@/lib/kakao";
import { formatDistance } from "@/lib/format-distance";
import { useAddRestaurant } from "@/db/hooks";
import { useIsWishlistedSet } from "@/db/search-hooks";
import type { KakaoPlace } from "@/types";

type SheetState = "hidden" | "peek" | "expanded";

export default function SearchPage() {
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("hidden");
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>();
  const { addRestaurant } = useAddRestaurant();
  const wishlistedIds = useIsWishlistedSet(results.map((r) => r.id));

  // Geolocation for initial map center
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
      );
    }
  }, []);

  // Search flow — uses smartSearch for semantic expansion + distance sorting
  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setSelectedPlace(null);
    try {
      const places = await smartSearch({
        query,
        ...(center && {
          x: String(center.lng),
          y: String(center.lat),
        }),
      });
      setResults(places);
      setSheetState("peek");
    } catch {
      setResults([]);
      setSheetState("peek");
    } finally {
      setIsLoading(false);
    }
  }, [center]);

  // Marker click handler
  const handleMarkerClick = useCallback(
    (id: string) => {
      const place = results.find((p) => p.id === id);
      setSelectedPlace(place ?? null);
    },
    [results],
  );

  // Wishlist action
  const handleAdd = async (place: KakaoPlace) => {
    await addRestaurant(place);
    setSelectedPlace(null);
  };

  // Map markers derived from results
  const markers = useMemo(
    () =>
      results
        .filter((p) => p.x && p.y)
        .map((p) => ({
          id: p.id,
          lat: parseFloat(p.y),
          lng: parseFloat(p.x),
          name: p.place_name,
          isWishlisted: wishlistedIds.has(p.id),
        })),
    [results, wishlistedIds],
  );

  // Auto-fit bounds from results
  const fitBounds = useMemo(() => {
    if (!hasSearched || markers.length === 0) return undefined;
    return markers.map((m) => ({ lat: m.lat, lng: m.lng }));
  }, [hasSearched, markers]);

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Search bar floating over map */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* Full-screen map */}
      <MapView
        center={center}
        markers={markers}
        fitBounds={fitBounds}
        onMarkerClick={handleMarkerClick}
        className="w-full h-full"
      />

      {/* Selected place detail card */}
      {selectedPlace && (
        <div className="absolute bottom-20 left-4 right-4 z-30">
          <RestaurantCard
            restaurant={{
              id: selectedPlace.id,
              name: selectedPlace.place_name,
              address: selectedPlace.road_address_name || selectedPlace.address_name,
              category: selectedPlace.category_name,
              starRating: 1,
            }}
            variant="search-result"
            distance={formatDistance(selectedPlace.distance)}
            isWishlisted={wishlistedIds.has(selectedPlace.id)}
            onAddToWishlist={() => handleAdd(selectedPlace)}
          />
        </div>
      )}

      {/* Bottom sheet with result list */}
      {hasSearched && (
        <BottomSheet state={sheetState} onStateChange={setSheetState}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">No nearby restaurants found</p>
              <p className="text-sm mt-1">
                {center
                  ? "Try a different search term or broaden your area"
                  : "Enable location for better results, or try a different term"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{results.length} results</p>
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
                  distance={formatDistance(place.distance)}
                  isWishlisted={wishlistedIds.has(place.id)}
                  onAddToWishlist={() => handleAdd(place)}
                />
              ))}
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  );
}
