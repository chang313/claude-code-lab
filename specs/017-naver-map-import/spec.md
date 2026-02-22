# Feature Specification: Naver Map Import

**Feature Branch**: `017-naver-map-import`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Import restaurants from Naver Map's 찜 리스트 (favorites/bookmarks) into the app's wishlist. Users share their Naver Map bookmark folder (공개 설정), paste the share URL into the app, and the system fetches the public bookmark data, maps it to the app's Restaurant model, and bulk-inserts into Supabase. Optionally cross-references with Kakao Local API to fill in category and kakao_place_id."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Naver Map Favorites (Priority: P1)

A user who has been saving restaurants on Naver Map wants to migrate their 찜 리스트 into the app without re-adding each place manually. They navigate to an import screen, follow a brief guide on how to get their Naver Map share link, paste the link, and the system imports all bookmarked restaurants as wishlist entries.

**Why this priority**: This is the core feature — without import, the feature has no value. Users with hundreds of Naver Map bookmarks need a fast way to bring them into the app.

**Independent Test**: Can be fully tested by pasting a valid Naver Map share link and verifying that restaurants appear in the user's wishlist with correct names, addresses, and map coordinates.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the import screen, **When** they paste a valid Naver Map public share link and tap "가져오기" (Import), **Then** the system fetches the bookmark data and adds each place to the user's wishlist with name, address, and coordinates.
2. **Given** the import is in progress, **When** the system is fetching and processing bookmarks, **Then** a progress indicator shows the user how many places have been imported (e.g., "32/128 장소 가져오는 중...").
3. **Given** a bookmark already exists in the user's wishlist (same name + coordinates within 50m), **When** the import encounters it, **Then** the system skips the duplicate and continues importing the rest.
4. **Given** a user pastes an invalid or expired share link, **When** the system tries to fetch data, **Then** the user sees a clear error message explaining the link is invalid and how to get a correct one.

---

### User Story 2 - In-App Step-by-Step Guide (Priority: P1)

A user who doesn't know how to get their Naver Map share link needs guidance. The import screen includes a visual step-by-step guide (with illustrations or screenshots) explaining how to make a Naver Map bookmark folder public and copy the share link.

**Why this priority**: Without clear instructions, most users won't be able to complete the import. This is essential for usability.

**Independent Test**: Can be tested by presenting the guide to a non-technical user and confirming they can follow the steps to produce a valid share link.

**Acceptance Scenarios**:

1. **Given** a user taps the import button, **When** the import screen opens, **Then** a collapsible guide section is visible explaining how to get the Naver Map share link in 3-4 steps with visual aids.
2. **Given** a user is viewing the guide, **When** they follow the steps on their Naver Map app, **Then** they can successfully produce a share link and paste it into the input field.

---

### User Story 3 - Category Enrichment via Cross-Reference (Priority: P2)

After import, restaurants lack category information (Naver's bookmark API doesn't include it). The system runs enrichment asynchronously in the background — the user sees their imported restaurants immediately with "미분류" labels, and categories fill in progressively as each place is matched against Kakao Local API using name + coordinates.

**Why this priority**: Category data powers the app's grouping and filtering features. Without it, imported restaurants appear as "미분류" (uncategorized), reducing the app's usefulness. However, the import still works without this — it's an enhancement.

**Independent Test**: Can be tested by importing a set of Naver bookmarks and verifying that the majority receive correct category labels after enrichment.

**Acceptance Scenarios**:

1. **Given** restaurants have been imported from Naver, **When** the import completes, **Then** the user sees all imported restaurants immediately in their wishlist with "미분류" category, and enrichment begins running in the background.
2. **Given** a Kakao match is found within 100m of the Naver coordinates and the name is a close match, **When** the enrichment applies, **Then** the restaurant's category, Kakao place ID, and Kakao place URL are updated.
3. **Given** no Kakao match is found for a restaurant, **When** enrichment completes, **Then** the restaurant remains in the wishlist with an empty category ("미분류") and no Kakao link.
4. **Given** the user navigates to their wishlist while enrichment is in progress, **When** categories are being updated in the background, **Then** previously "미분류" restaurants show their updated category on the next page load or data refresh — real-time streaming is not required.
5. **Given** enrichment is interrupted partway through (e.g., Kakao rate limit hit, server error), **When** the failure occurs, **Then** already-enriched restaurants keep their category data, unenriched restaurants remain as "미분류", and the system does NOT retry automatically — the user can re-trigger enrichment from import history if needed.

---

### User Story 4 - Import History and Batch Undo (Priority: P3)

A user who has imported before wants to see what was imported and manage it. They can view a summary of past imports (date, count, source folder name) and undo a full import batch if needed.

**Why this priority**: Nice-to-have for power users. Most users will import once and be done.

**Independent Test**: Can be tested by performing an import, viewing the import history, and undoing the import to verify all imported restaurants are removed.

**Acceptance Scenarios**:

1. **Given** a user has completed one or more imports, **When** they visit the import history screen, **Then** they see a list of past imports with date, source name, and count of imported places.
2. **Given** a user wants to undo an import, **When** they tap "되돌리기" (Undo) on a past import, **Then** all restaurants from that import batch are removed from their wishlist (unless the user has since rated them).

---

### Edge Cases

- What happens when the Naver share link points to a folder with 0 bookmarks? → Show "이 폴더에 저장된 장소가 없습니다" message.
- What happens when the Naver API is unreachable or returns an error? → Show a retry option with an explanation that Naver's service may be temporarily unavailable.
- What happens when a user imports the same folder twice? → Duplicate detection (name + coordinates) skips already-imported places and reports how many were skipped.
- What happens when a bookmarked place has been permanently closed (폐업)? → Import it anyway but visually flag it if the data indicates closure status.
- What happens when the share link is for a private (비공개) folder? → Show an error explaining that the folder must be set to 공개 and link back to the guide.
- What happens when the bookmark count exceeds 1,000? → Import up to 1,000 and inform the user that Naver limits folders to 1,000 bookmarks.
- What happens when the user is offline during import? → Show an offline error and suggest retrying with a network connection.
- What happens when the import is interrupted mid-way (network drop, app crash)? → Already-inserted restaurants are kept. User can retry the same link and duplicate detection skips previously imported places.
- What happens when Naver returns bookmark entries with missing or malformed fields? → Entries without `displayname`, `px`, or `py` are silently skipped. The import summary shows a count of skipped invalid entries.
- What happens when enrichment is interrupted (Kakao rate limit, server error)? → Already-enriched restaurants keep their data. Unenriched restaurants remain as "미분류". No automatic retry — user can re-trigger from import history.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a Naver Map public share link as input and extract the shareId from the URL.
- **FR-002**: System MUST fetch bookmark data from the Naver public share endpoint using the extracted shareId.
- **FR-003**: System MUST parse each bookmark entry and map it to the app's restaurant data model (name from `displayname`, latitude from `py`, longitude from `px`, address from `address`). All place types are imported — no filtering by category. Each imported restaurant receives a synthetic `kakao_place_id` in the format `naver_{py}_{px}` (latitude_longitude, truncated to 6 decimal places) to avoid collision with real Kakao place IDs (which are numeric strings). If enrichment later finds a Kakao match, the synthetic ID is replaced with the real Kakao place ID.
- **FR-004**: System MUST perform duplicate detection before inserting — skip any restaurant where an existing wishlist entry has the same name AND coordinates within a 50m radius.
- **FR-005**: System MUST bulk-insert imported restaurants into the user's wishlist with unvisited status (no star rating). Partial imports are preserved — if interrupted, already-inserted restaurants remain and the user can retry safely.
- **FR-006**: System MUST show progress feedback during import (count of processed items out of total).
- **FR-007**: System MUST display clear error messages for invalid links, private folders, empty folders, and network failures.
- **FR-008**: System MUST provide an in-app step-by-step guide explaining how to get the Naver Map share link.
- **FR-009**: System SHOULD attempt to enrich imported restaurants with category data by cross-referencing each place against Kakao Local API using name and coordinates.
- **FR-010**: System SHOULD update matched restaurants with Kakao place ID, category, and Kakao place URL when a confident match is found. A "confident match" requires BOTH: (a) the Kakao result is within 100m Haversine distance of Naver coordinates, AND (b) a name match where either the Naver name contains the Kakao name or vice versa (substring match, case-insensitive, after stripping whitespace). If Kakao returns multiple results within 100m, pick the closest by distance. If no result passes both criteria, the restaurant remains unenriched.
- **FR-011**: System MUST tag imported restaurants with an import batch identifier so they can be managed as a group.
- **FR-012**: System SHOULD allow users to undo a full import batch (removing all restaurants from that batch that have not been rated).
- **FR-013**: System MUST validate the pasted URL against Naver's known domain pattern before making any server-side fetch request, to prevent misuse.
- **FR-014**: System MUST validate each bookmark entry in the Naver response before import. Entries missing `displayname`, `px`, or `py` are silently skipped. Entries with non-numeric `px`/`py` are skipped. The import summary reports how many entries were skipped due to invalid data.

### Key Entities

- **Import Batch**: Represents a single import action — contains a reference to the user, timestamp, source folder name, and count of imported restaurants. Used for history display and batch undo.
- **Naver Bookmark**: Raw bookmark data from Naver's API — contains place name, coordinates (px/py), address, and closure status. Transformed into a Restaurant upon import.
- **Restaurant** (existing): The app's core entity — extended with an optional import batch reference to track which places came from external import.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a full import (paste link → see restaurants in wishlist) in under 60 seconds for folders with up to 100 bookmarks.
- **SC-002**: At least 95% of Naver bookmarks with valid data (name + coordinates) are successfully imported without data loss.
- **SC-003**: Duplicate detection correctly identifies and skips at least 90% of already-imported restaurants on repeated imports.
- **SC-004**: Category enrichment successfully matches at least 70% of imported restaurants to their Kakao Local API equivalent.
- **SC-005**: Users who follow the in-app guide can produce a valid share link without external help at least 80% of the time.
- **SC-006**: Import of 500+ bookmarks completes without timeout or failure.

## Clarifications

### Session 2026-02-22

- Q: Should category enrichment run synchronously (user waits) or asynchronously (background)? → A: Asynchronous — import completes immediately with "미분류" labels, enrichment runs in background and updates categories progressively.
- Q: Should non-restaurant bookmarks (cafes, parks, museums) be filtered out or imported? → A: Import all place types regardless of category. Users manage their own list.
- Q: If import is interrupted mid-way, what happens to partially imported data? → A: Keep partial imports. Already-inserted restaurants stay; user can retry and duplicate detection skips them.
- Resolved (checklist): Synthetic kakao_place_id format → `naver_{py}_{px}` (coordinate-based, non-numeric prefix avoids collision with real Kakao IDs). Replaced by real ID upon enrichment.
- Resolved (checklist): Name matching algorithm → Substring match (case-insensitive, whitespace-stripped) + 100m proximity. Closest match wins.
- Resolved (checklist): Enrichment partial failure → Keep enriched data, leave rest as "미분류", no auto-retry. User can re-trigger.
- Resolved (checklist): Naver response validation → Skip entries missing displayname/px/py or with non-numeric coordinates. Report skip count.

## Assumptions

- Naver's undocumented public share bookmark endpoint will remain accessible for public folders without authentication. This is not guaranteed as it is an undocumented API.
- The share link URL format is predictable and contains a shareId that can be extracted via pattern matching.
- Naver's bookmark response uses `bookmarkList` as the array key with fields `displayname`, `px`, `py`, and `address` at minimum.
- Coordinates from Naver (WGS84) are directly compatible with Kakao Maps — no projection conversion is needed.
- Kakao Local API rate limits are sufficient for enrichment of a typical import batch when processed with appropriate throttling.
- The existing restaurants table can accommodate imported data, with a new import batch reference added.

## Risks

- **Undocumented API breakage**: Naver can change or remove the bookmark share endpoint at any time without notice. The feature should degrade gracefully with a clear user-facing message.
- **Category matching accuracy**: Name-based cross-referencing between Naver and Kakao may produce false positives (different branches of same chain) or false negatives (different naming conventions).
- **Rate limiting**: Bulk Kakao API calls for enrichment may hit rate limits for users with large bookmark collections. Enrichment should be throttled and fault-tolerant.

## Scope Boundaries

**In scope**:
- Import from Naver Map public share links
- Duplicate detection on import
- Category enrichment via Kakao Local API
- Import history and batch undo
- In-app guide for getting the share link

**Out of scope**:
- Import from private (non-shared) Naver Map folders
- Import from other map services (Google Maps, Kakao Map bookmarks)
- Two-way sync between Naver Map and this app
- Automatic periodic re-import
- Browser extension or bookmarklet for easier link extraction
