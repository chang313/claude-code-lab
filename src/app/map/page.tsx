"use client";

import { useState, useCallback, useEffect } from "react";
import MapView from "@/components/MapView";
import RestaurantCard from "@/components/RestaurantCard";
import { searchByBounds } from "@/lib/kakao";
import { useAddRestaurant, useIsWishlistedSet } from "@/db/search-hooks";
import type { KakaoPlace } from "@/types";

interface Bounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

export default function MapPage() {
  const [places, setPlaces] = useState<KakaoPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>();
  const { addRestaurant } = useAddRestaurant();
  const wishlistedIds = useIsWishlistedSet(places.map((p) => p.id));

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, // Fallback to default (Seoul) handled by MapView
      );
    }
  }, []);

  const handleBoundsChange = useCallback(async (bounds: Bounds) => {
    try {
      const rect = `${bounds.sw.lng},${bounds.sw.lat},${bounds.ne.lng},${bounds.ne.lat}`;
      const response = await searchByBounds({ rect, size: 15 });
      setPlaces(response.documents);
    } catch {
      // Silently fail — map still shows existing markers
    }
  }, []);

  const handleMarkerClick = useCallback(
    (id: string) => {
      const place = places.find((p) => p.id === id);
      setSelectedPlace(place ?? null);
    },
    [places],
  );

  const handleAdd = async (place: KakaoPlace) => {
    await addRestaurant(place);
    setSelectedPlace(null);
  };

  const markers = places.map((p) => ({
    id: p.id,
    lat: parseFloat(p.y),
    lng: parseFloat(p.x),
    name: p.place_name,
    isWishlisted: wishlistedIds.has(p.id),
  }));

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Discover on Map</h1>

      <MapView
        center={center}
        markers={markers}
        onMarkerClick={handleMarkerClick}
        onBoundsChange={handleBoundsChange}
      />

      {selectedPlace && (
        <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto z-30">
          <RestaurantCard
            restaurant={{
              id: selectedPlace.id,
              name: selectedPlace.place_name,
              address:
                selectedPlace.road_address_name || selectedPlace.address_name,
              category: selectedPlace.category_name,
              starRating: 1,
            }}
            variant="search-result"
            isWishlisted={wishlistedIds.has(selectedPlace.id)}
            onAddToWishlist={() => handleAdd(selectedPlace)}
          />
        </div>
      )}
    </div>
  );
}
