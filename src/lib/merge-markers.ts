import type { Bounds, KakaoPlace, MarkerType, SavedMarkerData } from "@/types";

interface MergedMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  markerType: MarkerType;
  starRating?: number | null;
  category?: string;
}

export function isInViewport(
  point: { lat: number; lng: number },
  bounds: Bounds | null,
): boolean {
  if (!bounds) return true;
  return (
    point.lat >= bounds.sw.lat &&
    point.lat <= bounds.ne.lat &&
    point.lng >= bounds.sw.lng &&
    point.lng <= bounds.ne.lng
  );
}

export function mergeMarkers(
  searchResults: KakaoPlace[],
  savedMarkers: SavedMarkerData[],
  bounds: Bounds | null,
  showSavedMarkers: boolean,
): MergedMarker[] {
  const savedSet = new Map(savedMarkers.map((s) => [s.kakaoPlaceId, s]));

  // Map search results — apply saved style if match found
  const merged: MergedMarker[] = searchResults
    .filter((p) => p.x && p.y)
    .map((p) => {
      const saved = savedSet.get(p.id);
      if (saved) {
        return {
          id: p.id,
          lat: parseFloat(p.y),
          lng: parseFloat(p.x),
          name: p.place_name,
          markerType: (saved.starRating !== null ? "visited" : "wishlist") as MarkerType,
          starRating: saved.starRating,
          category: p.category_name,
        };
      }
      return {
        id: p.id,
        lat: parseFloat(p.y),
        lng: parseFloat(p.x),
        name: p.place_name,
        markerType: "search" as MarkerType,
      };
    });

  // Add saved markers not in search results (if toggle on)
  if (showSavedMarkers) {
    const searchIds = new Set(searchResults.map((r) => r.id));
    for (const s of savedMarkers) {
      if (searchIds.has(s.kakaoPlaceId)) continue;
      if (!isInViewport(s, bounds)) continue;
      merged.push({
        id: s.kakaoPlaceId,
        lat: s.lat,
        lng: s.lng,
        name: s.name,
        markerType: s.starRating !== null ? "visited" : "wishlist",
        starRating: s.starRating,
        category: s.category,
      });
    }
  }

  return merged;
}
