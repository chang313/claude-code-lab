# Full Feature Review Checklist: Naver Map Import

**Purpose**: Validate requirement quality, completeness, and consistency across all feature domains before implementation
**Created**: 2026-02-22
**Depth**: Standard (PR reviewer)
**Focus**: All domains + resilience & degradation
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [data-model.md](../data-model.md) | [contracts/api.md](../contracts/api.md)

---

## Requirement Completeness

- [ ] CHK001 - Are requirements defined for how the user navigates TO the import screen (entry point from profile/settings)? [Gap]
- [ ] CHK002 - Is the shareId extraction logic specified for all known Naver share URL formats (short URLs via naver.me, full URLs, raw shareId)? [Completeness, Spec §FR-001]
- [ ] CHK003 - Are requirements defined for what data is shown in the import result summary after completion (imported count, skipped count, category breakdown)? [Gap]
- [ ] CHK004 - Is the synthetic `kakao_place_id` generation strategy for Naver imports fully specified (format, uniqueness guarantees, collision prevention)? [Completeness, Data Model §Key Constraints]
- [ ] CHK005 - Are authentication requirements specified for ALL five API endpoints, not just `/save`? [Coverage, Contracts §/api/import/*]
- [ ] CHK006 - Are requirements defined for the Kakao enrichment name-matching algorithm ("close match" / "name similarity")? [Completeness, Spec §FR-010]
- [ ] CHK007 - Is the `sourceName` field documented — where does it come from (Naver folder name from API response, or user-provided label)? [Gap, Contracts §/api/import/save]
- [ ] CHK008 - Are requirements defined for how enriched categories appear in the existing UI (wishlist grouping, category accordion)? [Gap]

## Requirement Clarity

- [ ] CHK009 - Is "close match" for name similarity quantified with a specific threshold or algorithm (e.g., Levenshtein distance, substring match, exact match)? [Ambiguity, Spec §FR-010]
- [ ] CHK010 - Is the 50m duplicate detection radius justified, and is it clear whether this is Haversine great-circle distance or simple Euclidean? [Clarity, Spec §FR-004]
- [ ] CHK011 - Is "progress feedback" specified as real-time (streaming) or batch-updated (after each DB insert)? [Ambiguity, Spec §FR-006]
- [ ] CHK012 - Is "asynchronous enrichment" specified with enough detail — does it mean a background job within the same request, a separate scheduled process, or a client-triggered follow-up call? [Clarity, Spec §Clarifications]
- [ ] CHK013 - Is "visual flag" for closed/폐업 places defined with specific UI treatment (strikethrough, badge, dimmed)? [Ambiguity, Spec §Edge Cases]
- [ ] CHK014 - Are Kakao rate limit thresholds specified consistently (contracts say ~10 req/s, research says ~30 req/s free tier)? [Clarity, Contracts §/api/import/enrich vs Research §R-003]

## Requirement Consistency

- [ ] CHK015 - Does the `Restaurant` type's `id` field (currently mapped to `kakao_place_id`) remain consistent when synthetic IDs are introduced for Naver imports? [Consistency, Spec §Key Entities vs hooks.ts §mapDbRestaurant]
- [ ] CHK016 - Are the `import_batches.source_name` and the Naver proxy response's `folderName` field aligned — is one derived from the other? [Consistency, Data Model vs Contracts §/api/import/naver]
- [ ] CHK017 - Is the batch undo behavior consistent between spec ("unless the user has since rated them") and data model ("WHERE star_rating IS NULL")? [Consistency, Spec §US4 vs Data Model §Key Constraints]
- [ ] CHK018 - Does the `restaurants` table uniqueness constraint (`kakao_place_id` per user) accommodate Naver imports with synthetic IDs without conflict? [Consistency, Data Model vs hooks.ts §useAddRestaurant]
- [ ] CHK019 - Are error code strings consistent between API contracts and what the client UI is expected to handle? [Consistency, Contracts §Error Responses]

## Acceptance Criteria Quality

- [ ] CHK020 - Is SC-004 ("70% enrichment match rate") measurable in practice — how is this verified without manual inspection? [Measurability, Spec §SC-004]
- [ ] CHK021 - Is SC-005 ("80% of users can produce a valid share link") measurable without user research — is this an implementation-time metric or a post-launch metric? [Measurability, Spec §SC-005]
- [ ] CHK022 - Is SC-001 ("under 60 seconds for 100 bookmarks") defined under specific conditions (network speed, server load, DB size)? [Measurability, Spec §SC-001]
- [ ] CHK023 - Are acceptance scenarios for US3 (enrichment) testable given that enrichment is async — how does the test know when enrichment has completed? [Measurability, Spec §US3 Scenarios]

## Scenario Coverage

- [ ] CHK024 - Are requirements defined for what the user sees DURING async enrichment (do categories update in real-time, on page refresh, or only after enrichment finishes)? [Coverage, Gap]
- [ ] CHK025 - Is the scenario where a user imports from multiple different Naver folders addressed (separate batches? merged?)? [Coverage, Gap]
- [ ] CHK026 - Are requirements defined for the import page when the user is NOT logged in (redirect to login, or show disabled state)? [Coverage, Gap]
- [ ] CHK027 - Is the scenario where enrichment finds a Kakao match but for a DIFFERENT type of business (e.g., name collision — "Seoul Kitchen" the restaurant vs "Seoul Kitchen" the hotel) addressed? [Coverage, Spec §FR-010]
- [ ] CHK028 - Are requirements defined for concurrent imports (user starts a second import while the first is still processing)? [Coverage, Gap]

## Edge Case Coverage

- [ ] CHK029 - Is the behavior specified when Naver returns bookmarks with missing or null `displayname`, `px`, `py`, or `address` fields? [Edge Case, Spec §FR-003]
- [ ] CHK030 - Are requirements defined for bookmarks with coordinates outside South Korea (user may have saved international restaurants)? [Edge Case, Gap]
- [ ] CHK031 - Is the behavior specified when the `bookmarkList` array exists but contains malformed entries (e.g., px/py as strings instead of numbers)? [Edge Case, Gap]
- [ ] CHK032 - Are requirements defined for extremely long place names or addresses that may exceed DB column limits? [Edge Case, Gap]
- [ ] CHK033 - Is the behavior specified when duplicate detection finds a near-match (e.g., same coordinates but slightly different name like "스타벅스" vs "스타벅스 강남역점")? [Edge Case, Spec §FR-004]

## Non-Functional Requirements

- [ ] CHK034 - Are timeout requirements specified for the Naver proxy fetch (what if Naver responds slowly or hangs)? [Gap, Contracts §/api/import/naver]
- [ ] CHK035 - Is the maximum payload size for the `/api/import/save` endpoint specified (1000 bookmarks × ~200 bytes each)? [Gap, Contracts §/api/import/save]
- [ ] CHK036 - Are CORS requirements for the new API routes documented (same-origin only, or cross-origin allowed)? [Gap, Plan §Architecture]
- [ ] CHK037 - Are logging/observability requirements defined for import operations (success/failure counts, enrichment progress, error rates)? [Gap]
- [ ] CHK038 - Is the `ON DELETE SET NULL` cascade behavior for import_batch_id explicitly documented as the intended behavior when a batch record is deleted? [Clarity, Data Model §Migration SQL]

## Resilience & Degradation

- [ ] CHK039 - Are requirements defined for graceful degradation when Naver's API changes response format (fields renamed, removed, or restructured)? [Gap, Spec §Risks]
- [ ] CHK040 - Is the retry strategy specified for transient Naver API failures (how many retries, backoff strategy, user-facing feedback during retries)? [Gap, Spec §Edge Cases]
- [ ] CHK041 - Are requirements defined for what happens when Kakao enrichment fails partway through a batch (e.g., 30/100 enriched, then rate-limited)? [Gap, Spec §US3]
- [ ] CHK042 - Is the behavior specified when the `/api/import/enrich` background process crashes — are partially enriched restaurants left as-is, or is there a recovery mechanism? [Gap]
- [ ] CHK043 - Are requirements defined for the scenario where Naver deprecates or removes the share bookmark endpoint entirely — should the import feature be hidden/disabled? [Gap, Spec §Risks]
- [ ] CHK044 - Is the fallback behavior specified when the step-by-step guide's instructions become outdated (Naver changes their UI)? [Gap, Spec §US2]
- [ ] CHK045 - Are requirements defined for handling Naver API responses that succeed but return an empty `bookmarkList` for a previously non-empty folder (possible API change signal)? [Edge Case, Gap]

## Dependencies & Assumptions

- [ ] CHK046 - Is the assumption that Naver coordinates use WGS84 validated against actual API responses? [Assumption, Spec §Assumptions]
- [ ] CHK047 - Is the assumption about `bookmarkList` as the response key validated (vs. `bookmarks` or other variations)? [Assumption, Spec §Assumptions]
- [ ] CHK048 - Is the dependency on Naver's undocumented API documented with a monitoring/alerting strategy for when it breaks? [Dependency, Spec §Risks]

---

**Total items**: 48
**Coverage**: API & Integration (12), Data Model & Logic (10), UX & Flow (8), Resilience (7), Non-Functional (5), Assumptions (3), Acceptance Criteria (3)
