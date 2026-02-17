import { describe, it, expect } from "vitest";
import { boundsEqual } from "@/lib/kakao";
import type { Bounds } from "@/types";

/**
 * Tests for the "Search this area" button visibility logic.
 *
 * Visibility rule:
 *   visible = currentQuery !== null
 *          && lastSearchedBounds !== null
 *          && currentBounds !== null
 *          && !boundsEqual(lastSearchedBounds, currentBounds)
 */

const boundsA: Bounds = {
  sw: { lat: 37.4, lng: 126.9 },
  ne: { lat: 37.6, lng: 127.1 },
};

const boundsB: Bounds = {
  sw: { lat: 37.45, lng: 126.95 },
  ne: { lat: 37.65, lng: 127.15 },
};

function shouldShowButton(
  currentQuery: string | null,
  lastSearchedBounds: Bounds | null,
  currentBounds: Bounds | null,
): boolean {
  return (
    currentQuery !== null &&
    lastSearchedBounds !== null &&
    currentBounds !== null &&
    !boundsEqual(lastSearchedBounds, currentBounds)
  );
}

describe("Search this area button visibility", () => {
  it("should be hidden when no query is active", () => {
    expect(shouldShowButton(null, boundsA, boundsB)).toBe(false);
  });

  it("should be hidden when lastSearchedBounds is null (initial search auto-fitting)", () => {
    expect(shouldShowButton("chicken", null, boundsA)).toBe(false);
  });

  it("should be hidden when currentBounds is null (map not ready)", () => {
    expect(shouldShowButton("chicken", boundsA, null)).toBe(false);
  });

  it("should be hidden when bounds are equal (user hasn't moved map)", () => {
    expect(shouldShowButton("chicken", boundsA, boundsA)).toBe(false);
  });

  it("should be visible when query active and bounds differ", () => {
    expect(shouldShowButton("chicken", boundsA, boundsB)).toBe(true);
  });

  it("should be hidden after re-search updates lastSearchedBounds to match currentBounds", () => {
    // Simulate: user panned to boundsB, tapped "Search this area", now lastSearched = boundsB
    expect(shouldShowButton("chicken", boundsB, boundsB)).toBe(false);
  });
});
