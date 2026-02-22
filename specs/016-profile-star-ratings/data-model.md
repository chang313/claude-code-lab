# Data Model: Profile Star Ratings

**Date**: 2026-02-22 | **Branch**: `016-profile-star-ratings`

## Schema Changes

None. This feature is a UI-only change that reads existing data.

## Existing Entities Used

### restaurants (no changes)

| Column | Type | Notes |
|--------|------|-------|
| star_rating | integer (1-3) or null | Already queried by `useUserVisitedGrouped`; null = wishlist, non-null = visited |

## Migration SQL

No migration needed.
