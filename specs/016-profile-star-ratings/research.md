# Research: Profile Star Ratings

**Date**: 2026-02-22 | **Branch**: `016-profile-star-ratings`

## Summary

No critical unknowns identified. All required infrastructure already exists.

## Findings

### 1. StarRating Component Readiness

- **Decision**: Reuse existing `StarRating` component with `readonly={true}` and `size="sm"`
- **Rationale**: Component already supports both props; no modifications needed
- **Alternatives considered**: Creating a separate `ReadOnlyStarRating` component — rejected for violating DRY principle

### 2. RestaurantCard Rendering Gap

- **Decision**: Add a new conditional render path in `RestaurantCard` that shows readonly `StarRating` when `variant === "visited"` and `onStarChange` is NOT provided
- **Rationale**: Current logic requires `onStarChange` to render stars, which is correct for editable contexts but prevents display on profile pages where no handler is passed
- **Alternatives considered**:
  - Passing a no-op `onStarChange` from `UserProfileView` — rejected because it falsely implies editability and makes the stars interactive
  - Adding a new `showStarRating` boolean prop — rejected as unnecessary complexity; the `variant` + star data presence is sufficient

### 3. Data Availability

- **Decision**: No database or API changes needed
- **Rationale**: `useUserVisitedGrouped` already queries `star_rating` and includes it in the returned `Restaurant` objects. The data flows through to `RestaurantCard` via the `restaurant` prop.
- **Alternatives considered**: None — data is already available
