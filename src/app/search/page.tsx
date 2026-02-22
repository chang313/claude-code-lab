"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import SearchBar from "@/components/SearchBar";
import MapView from "@/components/MapView";
import BottomSheet from "@/components/BottomSheet";
import RestaurantCard from "@/components/RestaurantCard";
import SearchThisAreaButton from "@/components/SearchThisAreaButton";
import ErrorToast from "@/components/ErrorToast";
import { smartSearch, viewportSearch, boundsEqual } from "@/lib/kakao";
import { formatDistance } from "@/lib/format-distance";
import { useAddRestaurant } from "@/db/hooks";
import { useRestaurantStatusMap } from "@/db/search-hooks";
import type { Bounds, KakaoPlace } from "@/types";

type SheetState = "hidden" | "peek" | "expanded";

export default function SearchPage() {
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("hidden");
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>();

  // Viewport search state
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);
  const [currentBounds, setCurrentBounds] = useState<Bounds | null>(null);
  const [lastSearchedBounds, setLastSearchedBounds] = useState<Bounds | null>(null);
  const [isViewportLoading, setIsViewportLoading] = useState(false);
  const [viewportError, setViewportError] = useState<string | null>(null);

  const { addRestaurant } = useAddRestaurant();
  const statusMap = useRestaurantStatusMap(results.map((r) => r.id));

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

  // Initial search — uses smartSearch for semantic expansion + relevance sorting
  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setSelectedPlace(null);
    setCurrentQuery(query);
    setLastSearchedBounds(null);
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
  useEffect(() => {
    if (currentQuery && !lastSearchedBounds && currentBounds && hasSearched && !isLoading) {
      setLastSearchedBounds(currentBounds);
    }
  }, [currentQuery, lastSearchedBounds, currentBounds, hasSearched, isLoading]);

  // Viewport re-search
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

  const handleMarkerClick = useCallback(
    (id: string) => {
      const place = results.find((p) => p.id === id);
      setSelectedPlace(place ?? null);
      if (sheetState === "expanded") setSheetState("peek");
    },
    [results, sheetState],
  );

  // Add to wishlist (default, star_rating = null)
  const handleAddToWishlist = async (place: KakaoPlace) => {
    await addRestaurant(place);
    setSelectedPlace(null);
  };

  // Add as visited (star_rating = rating)
  const handleAddAsVisited = async (place: KakaoPlace, rating: 1 | 2 | 3) => {
    await addRestaurant(place, rating);
    setSelectedPlace(null);
  };

  // Map markers
  const markers = useMemo(
    () =>
      results
        .filter((p) => p.x && p.y)
        .map((p) => ({
          id: p.id,
          lat: parseFloat(p.y),
          lng: parseFloat(p.x),
          name: p.place_name,
          isWishlisted: statusMap.has(p.id),
        })),
    [results, statusMap],
  );

  const fitBounds = useMemo(() => {
    if (!hasSearched || markers.length === 0 || lastSearchedBounds !== null) return undefined;
    return markers.map((m) => ({ lat: m.lat, lng: m.lng }));
  }, [hasSearched, markers, lastSearchedBounds]);

  const renderCard = (place: KakaoPlace) => {
    const status = statusMap.get(place.id) ?? null;
    return (
      <RestaurantCard
        key={place.id}
        restaurant={{
          id: place.id,
          name: place.place_name,
          address: place.road_address_name || place.address_name,
          category: place.category_name,
          starRating: null,
        }}
        variant="search-result"
        distance={formatDistance(place.distance)}
        savedStatus={status}
        onAddToWishlist={() => handleAddToWishlist(place)}
        onAddAsVisited={(rating) => handleAddAsVisited(place, rating)}
      />
    );
  };

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      <div className="absolute top-16 left-0 right-0 z-20 flex justify-center">
        <SearchThisAreaButton
          visible={showSearchButton}
          isLoading={isViewportLoading}
          onClick={handleViewportSearch}
        />
      </div>

      <MapView
        center={center}
        markers={markers}
        fitBounds={fitBounds}
        onMarkerClick={handleMarkerClick}
        onBoundsChange={handleBoundsChange}
        className="w-full h-full"
      />

      {viewportError && (
        <ErrorToast
          message={viewportError}
          onDismiss={() => setViewportError(null)}
        />
      )}

      {selectedPlace && (
        <div className="absolute bottom-20 left-4 right-4 z-30">
          {renderCard(selectedPlace)}
        </div>
      )}

      {hasSearched && (
        <BottomSheet state={sheetState} onStateChange={setSheetState}>
          {isLoading || isViewportLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">검색 결과가 없습니다</p>
              <p className="text-sm mt-1">
                다른 검색어를 입력해 보세요
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{results.length}개 결과</p>
              {results.map((place) => renderCard(place))}
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  );
}
