const EARTH_RADIUS_M = 6_371_000; // meters

/** Haversine distance between two WGS84 points, in meters. */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Check if two points are within the given radius (meters). */
export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMeters: number,
): boolean {
  return haversineDistance(lat1, lng1, lat2, lng2) <= radiusMeters;
}

/** Bounding box pre-filter for DB query optimization. */
export function getBoundingBox(
  lat: number,
  lng: number,
  radiusMeters: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusMeters / EARTH_RADIUS_M * (180 / Math.PI);
  const lngDelta =
    (radiusMeters / (EARTH_RADIUS_M * Math.cos((lat * Math.PI) / 180))) *
    (180 / Math.PI);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
