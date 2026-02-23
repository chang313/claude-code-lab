# Feature Specification: Naver Import Category Auto-Enrichment

**Feature Branch**: `026-naver-category-enrichment`
**Created**: 2026-02-23
**Status**: Implemented
**Input**: User description: "Set naver map's imported restaurant's category automatically with kakao api. Currently, it's grouped to '기타'."

## Clarifications

### Session 2026-02-23

- Q: Should existing "기타" restaurants from past imports be retroactively re-enriched with the improved algorithm? → A: Yes — future imports + one-time retroactive re-enrichment for all existing restaurants with empty categories.
- Q: Should coordinate-based fallback update only the category, or also replace kakao_place_id and place_url? → A: Category-only — coordinate fallback sets only the `category` field; the synthetic `kakao_place_id` is preserved (lower confidence match should not link to a potentially wrong Kakao place).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Category Assignment on Import (Priority: P1)

When a user imports restaurants from Naver Map bookmarks, each restaurant should automatically receive a proper category (e.g., "한식", "카페", "분식") from the Kakao API enrichment process, instead of remaining as "기타" (uncategorized).

Currently, the enrichment only matches restaurants within a 100m radius with a strict substring name match. Many restaurants fail matching because:
- Naver and Kakao use different naming conventions (e.g., "스타벅스 강남역점" vs "스타벅스 강남대로점")
- The 100m search radius is too narrow for imprecise Naver coordinates
- Some restaurants exist in Kakao's DB but under a slightly different name

This story improves enrichment to maximize category assignment success rate.

**Why this priority**: Categories are the primary grouping mechanism in the wishlist. When most imports show as "기타", the grouping feature becomes useless and the user experience degrades significantly.

**Independent Test**: Import a Naver bookmark folder with 10+ restaurants and verify that at least 80% receive a proper category instead of "기타".

**Acceptance Scenarios**:

1. **Given** a user imports 20 Naver bookmarks, **When** enrichment completes, **Then** at least 80% of restaurants that exist in Kakao's database have a non-empty category assigned.
2. **Given** a restaurant's Naver name partially matches a Kakao result (e.g., "맘스터치 강남" vs "맘스터치 강남역점"), **When** enrichment runs, **Then** the category is correctly assigned from the Kakao match.
3. **Given** a restaurant has imprecise Naver coordinates (off by ~200m from Kakao's location), **When** enrichment runs, **Then** the system still finds the correct Kakao match by expanding its search area.
4. **Given** a restaurant has no match in Kakao's database at all, **When** enrichment completes, **Then** the restaurant remains as "기타" (graceful fallback, no errors).
5. **Given** the user has previously imported restaurants that are currently "기타", **When** the improved enrichment is deployed, **Then** a one-time background re-enrichment pass processes all existing restaurants with empty categories using the new algorithm.

---

### User Story 2 - Coordinate-Based Category Fallback (Priority: P2)

When name-based matching fails (no Kakao match found by name), the system should attempt to determine the category using the Kakao Local API's coordinate-based category search. Even without an exact place match, a coordinate lookup can return the category of the establishment at that location.

**Why this priority**: This is the safety net for restaurants that can't be matched by name. Coordinate-based lookup provides a reasonable category even when naming conventions diverge completely between platforms.

**Independent Test**: Import a restaurant with a name that doesn't exist in Kakao, but at coordinates where Kakao knows about a restaurant. Verify it receives a category from the coordinate-based lookup.

**Acceptance Scenarios**:

1. **Given** a restaurant where name-based enrichment found no match, **When** coordinate-based fallback runs, **Then** the system searches Kakao's category API using the restaurant's coordinates and assigns only the `category` field (the synthetic `kakao_place_id` and empty `place_url` are preserved).
2. **Given** multiple businesses exist at the same coordinates (e.g., a building with a cafe and a restaurant), **When** coordinate-based fallback runs, **Then** the system picks the result whose category best matches a food establishment (음식점 or 카페).
3. **Given** coordinate-based lookup also returns no relevant results, **When** fallback completes, **Then** the restaurant remains as "기타" without errors.

---

### User Story 3 - Enrichment Status Visibility (Priority: P3)

Users should be able to see how many of their imported restaurants were successfully categorized vs. how many remain as "기타", so they know the enrichment quality.

**Why this priority**: Transparency about enrichment results helps users understand their data quality and set expectations. Lower priority because the core value is in the automatic categorization itself.

**Independent Test**: Complete an import and verify the import history shows enrichment statistics (e.g., "18/20 categorized").

**Acceptance Scenarios**:

1. **Given** an import batch has completed enrichment, **When** the user views import history, **Then** they see the count of categorized vs. total restaurants (e.g., "18/20 categorized").
2. **Given** enrichment is still running, **When** the user views import history, **Then** they see an "enriching..." status indicator.

---

### Edge Cases

- What happens when the Kakao API rate limit is hit during batch enrichment? The system should retry with backoff, not silently skip remaining restaurants.
- What happens when a restaurant's coordinates are at (0, 0) or clearly invalid? The system should skip coordinate-based fallback for invalid coordinates.
- What happens when the Kakao API returns a category that's not food-related (e.g., "생활서비스 > 세탁소")? The system should still store the Kakao category as-is — the user bookmarked it intentionally.
- What happens when enrichment is re-triggered for a batch that already has some enriched restaurants? The system should only process restaurants that still have empty categories (idempotent re-enrichment).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expand the Kakao name-based search radius from 100m to 300m to account for imprecise Naver coordinates.
- **FR-002**: System MUST use relaxed name matching — normalize both names (strip whitespace, lowercase, remove common suffixes like "점", "역점", "지점") before comparing.
- **FR-003**: System MUST attempt a coordinate-based category lookup as a fallback when name-based matching yields no result. The fallback MUST only update the `category` field — it MUST NOT modify `kakao_place_id` or `place_url`.
- **FR-004**: System MUST prioritize food-related categories (음식점, 카페) in coordinate-based fallback results when multiple businesses exist at the same location.
- **FR-005**: System MUST track the number of successfully categorized restaurants per import batch.
- **FR-006**: System MUST support idempotent re-enrichment — only process restaurants with empty categories in repeated runs.
- **FR-007**: System MUST NOT overwrite a category that was already set by a previous successful enrichment.
- **FR-008**: System MUST perform a one-time retroactive re-enrichment of all existing restaurants with empty categories across all users, using the improved matching algorithm.

### Key Entities

- **Restaurant**: Existing entity. The `category` field transitions from `""` (empty) to a Kakao category string (e.g., "음식점 > 한식") upon successful enrichment.
- **Import Batch**: Existing entity. Extended with categorization statistics (categorized count vs. total count).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 80% of imported restaurants that exist in Kakao's database receive a non-empty category after enrichment (up from the current estimated ~50-60% match rate).
- **SC-002**: Enrichment processing time per restaurant does not increase by more than 50% compared to the current implementation (due to fallback lookups).
- **SC-003**: Zero restaurants lose an existing category during re-enrichment (no data regression).
- **SC-004**: Users can see categorization results in the import history within 1 minute of enrichment completion.

## Assumptions

- The Kakao Local API's keyword search (`/v2/local/search/keyword`) is the primary enrichment source, returning `category_name` in "대분류 > 중분류 > 소분류" format.
- The Kakao Local API's category search (`/v2/local/search/category`) can serve as coordinate-based fallback, using category group codes `FD6` (음식점) and `CE7` (카페).
- Naver bookmark coordinates are typically within 300m of the actual restaurant location in Kakao's database.
- The current enrichment infrastructure (fire-and-forget background job) is sufficient — no queue or job scheduler needed.
- Expanding search radius and adding fallback lookup will not exceed Kakao API rate limits for typical import sizes (up to 300 restaurants).
