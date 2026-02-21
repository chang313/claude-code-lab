# Research: 014-visited-wishlist

**Date**: 2026-02-21

## Decision 1: Data Model Strategy for List Type

**Decision**: Use nullable `star_rating` column to determine list membership.

**Rationale**:
- `star_rating IS NULL` → "위시 리스트" (wishlist, not yet visited)
- `star_rating IN (1, 2, 3)` → "맛집 리스트" (visited, rated)
- No new column needed — the rating value itself is the single source of truth
- No invalid states possible (unlike a separate `visited` boolean where `visited=true` + `star_rating=null` would be inconsistent)
- All existing rows have `star_rating` 1-3, so they automatically classify as "visited" with zero data migration
- Follows YAGNI: simplest solution that satisfies the spec

**Alternatives considered**:
1. **Boolean `visited` column**: Adds redundant state that must stay in sync with `star_rating`. Risk of inconsistency. Rejected.
2. **Enum `status` column** (`"wishlist"` / `"visited"`): Same redundancy problem as boolean, plus adds migration complexity. Rejected.
3. **Separate tables** (`wishlisted_restaurants` / `visited_restaurants`): Over-engineered, breaks existing queries, doubles RLS policies. Rejected.

## Decision 2: Search Result Add UX (Dual Button)

**Decision**: Single "+" button (→ wishlist) + adjacent ★ icon (→ visited with rating picker).

**Rationale**:
- Primary action (add to wishlist) stays one-tap — no modal friction
- Secondary action (add as visited) is discoverable but doesn't clutter the common flow
- Rating picker appears inline (not a full modal) to keep the interaction lightweight
- Consistent with existing UI patterns — the "+" button already exists; we're adding a companion

**Alternatives considered**:
1. **Bottom sheet chooser**: Adds friction to every add. Rejected for the common case.
2. **Two separate buttons per card**: Takes too much horizontal space on mobile. Rejected.
3. **No direct-add-as-visited**: Possible but reduces flexibility per spec FR-007. Rejected.

## Decision 3: Saved Indicator Differentiation

**Decision**: ♡ for wishlisted, ★ for visited on search results.

**Rationale**:
- Users need to know their relationship with each restaurant at a glance
- ♡ (heart) naturally maps to "want to try" / saved
- ★ (star) naturally maps to "rated" / visited
- Both are compact enough for mobile card layouts
- Current "✓ 저장됨" indicator becomes two distinct states

**Alternatives considered**:
1. **Generic indicator**: Loses the two-list context. Rejected.
2. **Text labels** ("위시" / "맛집"): Takes more space. Rejected.

## Decision 4: Wishlist Card "Mark as Visited" Interaction

**Decision**: Tapping the star rating area on a wishlist card auto-promotes it.

**Rationale**:
- Stars are the visual differentiator — tapping them on a wishlist item is the most intuitive way to say "I'm rating this = I've been there"
- No extra button needed, reducing UI clutter
- Consistent mental model: "give it stars → it moves to visited"
- Wishlist cards show empty/gray star area as an affordance

**Alternatives considered**:
1. **Dedicated button**: Adds clutter. Rejected.
2. **Swipe gesture**: Not discoverable. Rejected.
3. **Long-press context menu**: Hidden interaction. Rejected.

## Decision 5: Migration Strategy for Existing Data

**Decision**: Zero-migration approach — only schema change (make `star_rating` nullable with default `NULL`).

**Rationale**:
- All existing rows have `star_rating` 1-3 → automatically "visited"
- New rows default to `NULL` → automatically "wishlist"
- No UPDATE statement needed on existing data
- No downtime, no data loss risk

**Alternatives considered**:
1. **Backfill `visited` column**: Requires UPDATE on all rows + new column. Over-engineered for this case. Rejected.
