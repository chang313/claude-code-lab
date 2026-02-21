"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import SearchBar from "@/components/SearchBar";
import MapView from "@/components/MapView";
import BottomSheet from "@/components/BottomSheet";
import RestaurantCard from "@/components/RestaurantCard";
import SearchThisAreaButton from "@/components/SearchThisAreaButton";
import ErrorToast from "@/components/ErrorToast";
import StarRating from "@/components/StarRating";
import { smartSearch, viewportSearch, boundsEqual } from "@/lib/kakao";
import { formatDistance } from "@/lib/format-distance";
import { useAddRestaurant } from "@/db/hooks";
import { useIsWishlistedSet } from "@/db/search-hooks";
import type { Bounds, KakaoPlace } from "@/types";

type SheetState = "hidden" | "peek" | "expanded";

export default function SearchPage() {
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("hidden");
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>();
  const [selectedRating, setSelectedRating] = useState<1 | 2 | 3>(1);

  // Viewport search state
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);
  const [currentBounds, setCurrentBounds] = useState<Bounds | null>(null);
  const [lastSearchedBounds, setLastSearchedBounds] = useState<Bounds | null>(null);
  const [isViewportLoading, setIsViewportLoading] = useState(false);
  const [viewportError, setViewportError] = useState<string | null>(null);

  const { addRestaurant } = useAddRestaurant();
  const wishlistedIds = useIsWishlistedSet(results.map((r) => r.id));

  // Derive button visibility
  const showSearchButton =
    currentQuery !== null &&
    lastSearchedBounds !== null &&
    currentBounds !== null &&
    !boundsEqual(lastSearchedBounds, currentBounds);

  // Geolocation for initial map center
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
      );
    }
  }, []);

  // Bounds change handler from MapView
  const handleBoundsChange = useCallback((bounds: Bounds) => {
    setCurrentBounds(bounds);
  }, []);

  // Initial search — uses smartSearch for semantic expansion + distance sorting
  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setSelectedPlace(null);
    setCurrentQuery(query);
    setLastSearchedBounds(null); // Reset so button doesn't show during auto-fit
    setViewportError(null);
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

  // After initial search auto-fits, the map fires onBoundsChange.
  // We capture this as lastSearchedBounds so the button stays hidden until user moves.
  useEffect(() => {
    if (currentQuery && !lastSearchedBounds && currentBounds && hasSearched && !isLoading) {
      setLastSearchedBounds(currentBounds);
    }
  }, [currentQuery, lastSearchedBounds, currentBounds, hasSearched, isLoading]);

  // Viewport re-search — triggered by "Search this area" button
  const handleViewportSearch = useCallback(async () => {
    if (!currentQuery || !currentBounds) return;
    setIsViewportLoading(true);
    setSelectedPlace(null);
    setViewportError(null);
    try {
      const places = await viewportSearch({
        query: currentQuery,
        bounds: currentBounds,
        ...(center && { userLocation: center }),
      });
      setResults(places);
      setLastSearchedBounds(currentBounds);
      setSheetState("peek");
    } catch {
      setViewportError("검색에 실패했습니다. 탭하여 다시 시도하세요.");
    } finally {
      setIsViewportLoading(false);
    }
  }, [currentQuery, currentBounds, center]);

  // Reset star rating when selected place changes
  useEffect(() => {
    setSelectedRating(1);
  }, [selectedPlace]);

  // Marker click handler — collapse expanded sheet to peek
  const handleMarkerClick = useCallback(
    (id: string) => {
      const place = results.find((p) => p.id === id);
      setSelectedPlace(place ?? null);
      if (sheetState === "expanded") setSheetState("peek");
    },
    [results, sheetState],
  );

  // Wishlist action
  const handleAdd = async (place: KakaoPlace) => {
    await addRestaurant(place, selectedRating);
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

  // Auto-fit bounds from results (only for initial search, not viewport re-search)
  const fitBounds = useMemo(() => {
    if (!hasSearched || markers.length === 0 || lastSearchedBounds !== null) return undefined;
    return markers.map((m) => ({ lat: m.lat, lng: m.lng }));
  }, [hasSearched, markers, lastSearchedBounds]);

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Search bar floating over map */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* "Search this area" button */}
      <div className="absolute top-16 left-0 right-0 z-20 flex justify-center">
        <SearchThisAreaButton
          visible={showSearchButton}
          isLoading={isViewportLoading}
          onClick={handleViewportSearch}
        />
      </div>

      {/* Full-screen map */}
      <MapView
        center={center}
        markers={markers}
        fitBounds={fitBounds}
        onMarkerClick={handleMarkerClick}
        onBoundsChange={handleBoundsChange}
        className="w-full h-full"
      />

      {/* Error toast */}
      {viewportError && (
        <ErrorToast
          message={viewportError}
          onDismiss={() => setViewportError(null)}
        />
      )}

      {/* Selected place detail card */}
      {selectedPlace && (
        <div className="absolute bottom-20 left-4 right-4 z-30">
          <RestaurantCard
            restaurant={{
              id: selectedPlace.id,
              name: selectedPlace.place_name,
              address: selectedPlace.road_address_name || selectedPlace.address_name,
              category: selectedPlace.category_name,
              starRating: selectedRating,
            }}
            variant="search-result"
            distance={formatDistance(selectedPlace.distance)}
            isWishlisted={wishlistedIds.has(selectedPlace.id)}
            onAddToWishlist={() => handleAdd(selectedPlace)}
          />
          {!wishlistedIds.has(selectedPlace.id) && (
            <div className="mt-2 flex items-center justify-center gap-2 bg-white rounded-xl p-2 shadow-md">
              <span className="text-sm text-gray-500">별점</span>
              <StarRating
                value={selectedRating}
                onChange={setSelectedRating}
                size="md"
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom sheet with result list */}
      {hasSearched && (
        <BottomSheet state={sheetState} onStateChange={setSheetState}>
          {isLoading || isViewportLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">이 지역에서 음식점을 찾을 수 없습니다</p>
              <p className="text-sm mt-1">
                다른 검색어를 입력하거나 지도를 이동해 보세요
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{results.length}개 결과</p>
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
