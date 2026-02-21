# Tasks: Restaurant Sharing (Mutual Follower Recommendations)

**Input**: Design documents from `/specs/011-restaurant-sharing/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md
**Status**: Retrospective — all tasks completed

**Tests**: Vitest unit tests planned for hooks; Playwright E2E for recommend flow. Not yet written.

**Organization**: Tasks grouped by implementation phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Database & Types

**Purpose**: Schema, migration SQL, and TypeScript types

- [x] T001 [US1] Create `recommendations` table migration SQL in `data-model.md` — includes RLS policies, partial unique index, indexes
- [x] T002 [US1] Create `get_mutual_followers(uuid)` Postgres function — self-join on `follows` table, `SECURITY DEFINER`
- [x] T003 [US2] Create `get_unread_recommendation_count()` Postgres function — count pending unread for `auth.uid()`
- [x] T004 [P] Add `Recommendation`, `RecommendationWithSender`, `DbRecommendation` types to `src/types/index.ts`
- [x] T005 [P] Add `mapDbRecommendation()` mapper function to `src/types/index.ts`

**Checkpoint**: Migration SQL ready, TypeScript types compile

---

## Phase 2: Hooks (Data Layer)

**Purpose**: Supabase query/mutation hooks following existing `db/hooks.ts` pattern

- [x] T006 [US1] Create `useMutualFollowers()` hook — calls `get_mutual_followers` RPC
- [x] T007 [US1] Create `useSendRecommendation()` hook — inserts recommendation with restaurant snapshot, handles `23505` duplicate
- [x] T008 [US2] Create `useReceivedRecommendations()` hook — fetches pending recommendations with sender profile join
- [x] T009 [US2] Create `useUnreadRecommendationCount()` hook — calls `get_unread_recommendation_count` RPC for badge
- [x] T010 [US3] Create `useAcceptRecommendation()` hook — marks accepted, inserts restaurant to wishlist, auto-dismisses duplicates
- [x] T011 [US3] Create `useIgnoreRecommendation()` hook — marks as ignored
- [x] T012 [US2] Create `useMarkRecommendationsRead()` hook — bulk marks pending as read
- [x] T013 [US4] Create `useSentRecommendations()` hook — fetches sent recommendations with recipient profile join
- [x] T014 [US3] Create `useIsAlreadyWishlisted()` hook — checks if kakao_place_id exists in user's restaurants

**Checkpoint**: All hooks compile, `pnpm build` passes

---

## Phase 3: Components (UI Layer)

**Purpose**: New UI components for the recommendation flow

- [x] T015 [US2] Create `TopBar.tsx` — app bar with bell icon + unread badge count, links to `/recommendations`
- [x] T016 [US1] Create `RecommendModal.tsx` — mutual follower picker modal, triggered from wishlist cards
- [x] T017 [US2,US3] Create `RecommendationCard.tsx` — shows sender, restaurant info, accept/ignore buttons, "already wishlisted" indicator
- [x] T018 [US1] Add "추천" button to wishlist restaurant cards — opens `RecommendModal`

**Checkpoint**: Components render correctly, interactions work

---

## Phase 4: Pages & Layout Integration

**Purpose**: Wire components into app layout and create inbox page

- [x] T019 [US2] Create `/recommendations/page.tsx` — inbox page listing received recommendations with empty state
- [x] T020 [P] Add `TopBar` to `AuthLayoutShell` — renders above `<main>` on all authenticated pages
- [x] T021 [US2] Auto-mark recommendations as read on inbox page mount

**Checkpoint**: Full flow works end-to-end: send → badge → inbox → accept/ignore

---

## Phase 5: Bug Fixes & Polish

- [x] T022 [US3] Fix `lat: 0, lng: 0` bug — store `restaurant_lat`, `restaurant_lng`, `restaurant_place_url` in recommendations table at send time, use stored values at accept time
- [x] T023 [P] Add migration SQL `004_add_lat_lng_to_recommendations.sql` for existing tables

**Checkpoint**: Accepted restaurants appear at correct map coordinates

---

## Deferred

- [ ] T024 [US4] Create sent recommendations history UI — `useSentRecommendations()` hook is ready, no page yet (P3)
- [ ] T025 [P] Add Vitest unit tests for recommendation hooks (P2)
- [ ] T026 [P] Add Playwright E2E tests for recommend flow (P2)
