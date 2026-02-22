import { describe, it, expect } from "vitest";
import { haversineDistance, isWithinRadius, getBoundingBox } from "@/lib/haversine";

describe("haversineDistance", () => {
  it("returns 0 for the same point", () => {
    expect(haversineDistance(37.5665, 126.978, 37.5665, 126.978)).toBe(0);
  });

  it("calculates Seoul Station ↔ Gangnam Station ≈ 8.9km", () => {
    // Seoul Station: 37.5547, 126.9707
    // Gangnam Station: 37.4979, 127.0276
    const dist = haversineDistance(37.5547, 126.9707, 37.4979, 127.0276);
    expect(dist).toBeGreaterThan(8000);
    expect(dist).toBeLessThan(10000);
  });

  it("handles antipodal points (max distance ~20,000km)", () => {
    const dist = haversineDistance(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(20_000_000);
    expect(dist).toBeLessThan(20_100_000);
  });

  it("is symmetric", () => {
    const d1 = haversineDistance(37.5665, 126.978, 35.1796, 129.0756);
    const d2 = haversineDistance(35.1796, 129.0756, 37.5665, 126.978);
    expect(d1).toBeCloseTo(d2, 1);
  });
});

describe("isWithinRadius", () => {
  // Two points ~50m apart (approximate)
  const lat1 = 37.497900;
  const lng1 = 127.027600;
  // ~50m north
  const lat2 = 37.498350;
  const lng2 = 127.027600;

  it("returns true at boundary (50m radius for ~50m distance)", () => {
    const dist = haversineDistance(lat1, lng1, lat2, lng2);
    expect(isWithinRadius(lat1, lng1, lat2, lng2, dist + 1)).toBe(true);
  });

  it("returns false just beyond boundary", () => {
    const dist = haversineDistance(lat1, lng1, lat2, lng2);
    expect(isWithinRadius(lat1, lng1, lat2, lng2, dist - 1)).toBe(false);
  });

  it("returns true for same point with 0 radius", () => {
    expect(isWithinRadius(lat1, lng1, lat1, lng1, 0)).toBe(true);
  });
});

describe("getBoundingBox", () => {
  it("creates a symmetric bounding box around a point", () => {
    const box = getBoundingBox(37.5665, 126.978, 1000);
    expect(box.minLat).toBeLessThan(37.5665);
    expect(box.maxLat).toBeGreaterThan(37.5665);
    expect(box.minLng).toBeLessThan(126.978);
    expect(box.maxLng).toBeGreaterThan(126.978);
  });

  it("center point is within the bounding box", () => {
    const box = getBoundingBox(37.5665, 126.978, 500);
    expect(37.5665).toBeGreaterThan(box.minLat);
    expect(37.5665).toBeLessThan(box.maxLat);
    expect(126.978).toBeGreaterThan(box.minLng);
    expect(126.978).toBeLessThan(box.maxLng);
  });
});
