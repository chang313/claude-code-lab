# Tasks: Social Follow & User Profiles

**Input**: Design documents from `/specs/007-social-follow/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec — test tasks omitted. Add tests per constitution principles as needed during implementation.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)

---

## Phase 1: Setup

**Purpose**: Database tables, types, and shared infrastructure

- [ ] T001 Create `profiles` table in Supabase SQL Editor per `data-model.md` migration SQL (001_create_profiles.sql)
- [ ] T002 Create `follows` table in Supabase SQL Editor per `data-model.md` migration SQL (002_create_follows.sql)
- [ ] T003 Update `restaurants` RLS SELECT policy to allow cross-user reads per `data-model.md` migration SQL (003_update_restaurants_rls.sql)
- [ ] T004 Seed profiles for existing users per `quickstart.md` Step 2 SQL
- [x] T005 [P] Add `UserProfile`, `UserProfileWithCounts`, `FollowRelationship`, `DbProfile`, `DbFollow` types in `src/types/index.ts`
- [x] T006 [P] Add `mapDbProfile` mapper function in `src/types/index.ts` (following existing `mapDbRestaurant` pattern)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Profile auto-creation and navigation changes that ALL stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Add profile upsert logic in `src/app/auth/callback/route.ts` — after `exchangeCodeForSession` succeeds, upsert into `profiles` using `user.user_metadata` (display_name, avatar_url) per `contracts/profiles.md`
- [x] T008 Add "People" tab to `src/components/BottomNav.tsx` — 4th tab with route `/users` and icon 👥, following existing tab pattern
- [x] T009 [P] Create `src/db/profile-hooks.ts` with `useProfile(userId)` and cache key `profile:${userId}` following existing `useSupabaseQuery` pattern in `src/db/hooks.ts`
- [x] T010 [P] Create `src/db/follow-hooks.ts` with full implementations: `useFollowUser`, `useUnfollowUser`, `useIsFollowing`, `useFollowers`, `useFollowing`
- [x] T011 [P] Register new cache keys (`profile:*`, `followers:*`, `following:*`, `is-following:*`, `user-search:*`, `profile-counts:*`) — used in hooks with dynamic key patterns

**Checkpoint**: Profile auto-creation on login works. People tab visible in nav. Hook stubs ready.

---

## Phase 3: User Story 1 — Search for Other Users (Priority: P1) MVP

**Goal**: Users can tap People tab, search by name, see matching user cards

**Independent Test**: Navigate to `/users`, type a name (≥2 chars), verify results appear with avatar + name. Verify own user excluded.

### Implementation for User Story 1

- [x] T012 [US1] Implement `useSearchUsers(query)` hook in `src/db/profile-hooks.ts` — Supabase `ilike` on `display_name`, exclude current user, debounce 300ms, min 2 chars, max 20 results per `contracts/user-search.md`
- [x] T013 [P] [US1] Create `src/components/UserCard.tsx` — displays avatar, display name, link to `/users/[id]`. Props: `user: UserProfile`, `action?: ReactNode`
- [x] T014 [P] [US1] Create `src/components/UserSearchBar.tsx` — text input with debounced onChange, loading spinner, min-length guard. Reuse visual style from existing `src/components/SearchBar.tsx`
- [x] T015 [US1] Create `src/app/users/page.tsx` — People tab page with `UserSearchBar` + search results list of `UserCard` components. Empty state: "검색 결과가 없습니다". Loading state: spinner.

**Checkpoint**: User search is fully functional. Navigate to `/users`, search by name, see results.

---

## Phase 4: User Story 2 — Follow / Unfollow a User (Priority: P1)

**Goal**: Users can follow/unfollow from profile pages. Button toggles state. Counts update.

**Independent Test**: Navigate to a user's profile, tap Follow, verify button changes to "Following". Tap again to unfollow. Counts update.

### Implementation for User Story 2

- [x] T016 [US2] Implement `useFollowUser()` hook in `src/db/follow-hooks.ts` — insert into `follows`, handle unique constraint (23505), invalidate relevant cache keys per `contracts/follows.md`
- [x] T017 [US2] Implement `useUnfollowUser()` hook in `src/db/follow-hooks.ts` — delete from `follows`, invalidate cache keys per `contracts/follows.md`
- [x] T018 [US2] Implement `useIsFollowing(followedId)` hook in `src/db/follow-hooks.ts` — check if current user follows target per `contracts/follows.md`
- [x] T019 [P] [US2] Create `src/components/FollowButton.tsx` — toggles between "팔로우" and "팔로잉" states, calls follow/unfollow hooks, pending state
- [x] T020 [US2] Implement `useProfileWithCounts(userId)` hook in `src/db/profile-hooks.ts` — parallel queries for profile + follower count + following count per `contracts/profiles.md`
- [x] T021 [P] [US2] Create `src/components/ProfileHeader.tsx` — displays avatar, display name, follower/following counts, `FollowButton` (conditional on `isOwnProfile`)
- [x] T022 [US2] Create `src/app/users/[id]/page.tsx` — unified profile page with `ProfileHeader`, wishlist, and FollowTabs

**Checkpoint**: Follow/unfollow works. Profile page shows header with counts and follow button.

---

## Phase 5: User Story 3 — View Another User's Profile & Wishlist (Priority: P2)

**Goal**: User profile page shows that user's restaurant wishlist in read-only accordion view

**Independent Test**: Navigate to `/users/[someUserId]`, verify their wishlist loads grouped by category. No edit/delete controls. Tap restaurant to see read-only detail.

### Implementation for User Story 3

- [x] T023 [US3] Implement `useUserRestaurants(userId)` hook in `src/db/profile-hooks.ts` — query `restaurants` table filtered by `user_id`, ordered by star_rating desc + created_at desc
- [x] T024 [US3] Implement `useUserWishlistGrouped(userId)` hook in `src/db/profile-hooks.ts` — wraps `useUserRestaurants` + groups by subcategory
- [x] T025 [US3] Add wishlist section to `src/app/users/[id]/page.tsx` — renders CategoryAccordion + RestaurantCard read-only via FollowTabs
- [x] T026 [US3] Update `src/app/restaurant/[id]/page.tsx` — added `readOnly` search param to hide edit/delete controls
- [x] T027 [US3] Update `src/app/my/page.tsx` — redirects to `/users/[currentUserId]` client-side

**Checkpoint**: Full profile viewing works. Another user's wishlist renders read-only. `/my` redirects to unified profile.

---

## Phase 6: User Story 4 — Followers & Following Lists (Priority: P3)

**Goal**: Inline tabs on profile page showing followers and following lists

**Independent Test**: Follow several users, navigate to own profile, tap "Following" tab to see list. Tap "Followers" tab.

### Implementation for User Story 4

- [x] T028 [US4] Implement `useFollowers(userId)` hook in `src/db/follow-hooks.ts` — join `follows` with `profiles` on `follower_id`, paginated
- [x] T029 [US4] Implement `useFollowing(userId)` hook in `src/db/follow-hooks.ts` — join `follows` with `profiles` on `followed_id`, paginated
- [x] T030 [P] [US4] Create `src/components/FollowTabs.tsx` — inline tab component with "맛집", "팔로워", "팔로잉" tabs with counts
- [x] T031 [US4] Integrate `FollowTabs` into `src/app/users/[id]/page.tsx` — default tab: Wishlist. Followers/Following tabs render UserCard + FollowButton
- [ ] T032 [US4] Add pagination (load more on scroll) to followers/following lists — deferred to polish, initial limit of 20 items

**Checkpoint**: All 4 user stories complete. Profile page has tabs for Wishlist, Followers, Following.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T033 [P] Add loading skeletons to People search page, profile page, and follow tabs in respective components
- [x] T034 [P] Add error handling with ErrorToast for failed search, follow/unfollow, and profile load operations
- [x] T035 Verify `pnpm build` passes with all new files
- [x] T036 Verify `pnpm test` passes (existing tests still work with RLS changes)
- [x] T037 Run `quickstart.md` validation — verify all SQL steps, seed data, troubleshooting scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately (requires Supabase SQL Editor access)
- **Foundational (Phase 2)**: Depends on Phase 1 (tables must exist for hooks/callback)
- **US1 Search (Phase 3)**: Depends on Phase 2 (needs profile hooks + People tab)
- **US2 Follow (Phase 4)**: Depends on Phase 2 (needs follow hooks + profile page)
- **US3 Wishlist (Phase 5)**: Depends on Phase 4 (needs profile page from US2)
- **US4 Tabs (Phase 6)**: Depends on Phase 5 (needs wishlist on profile from US3)
- **Polish (Phase 7)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (Search)** and **US2 (Follow)** can run in parallel after Phase 2
- **US3 (Wishlist View)** depends on US2 (profile page must exist)
- **US4 (Follow Lists)** depends on US3 (tabs replace direct wishlist rendering)

### Within Each User Story

- Hooks before components
- Components before page integration
- Core implementation before polish

### Parallel Opportunities

- T005 + T006 (types) can run in parallel
- T009 + T010 + T011 (hook files) can run in parallel
- T013 + T014 (UserCard + UserSearchBar) can run in parallel
- T019 + T021 (FollowButton + ProfileHeader) can run in parallel
- T033 + T034 (loading skeletons + error handling) can run in parallel
- US1 and US2 can run in parallel after Phase 2

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (DB tables)
2. Complete Phase 2: Foundational (auth callback, nav, hook stubs)
3. Complete Phase 3: User Story 1 (People search)
4. **STOP and VALIDATE**: Search users by name works
5. Deploy MVP

### Incremental Delivery

1. Setup + Foundational → DB and infrastructure ready
2. US1 (Search) → Users can find each other (MVP!)
3. US2 (Follow) → Users can follow + see profiles
4. US3 (Wishlist) → Profile shows read-only wishlist
5. US4 (Tabs) → Profile has Followers/Following tabs
6. Polish → Loading states, error handling, validation

---

## Notes

- Total tasks: **37**
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 5 tasks
- US1 (Search): 4 tasks
- US2 (Follow): 7 tasks
- US3 (Wishlist): 5 tasks
- US4 (Tabs): 5 tasks
- Polish: 5 tasks
- Parallel opportunities: 8 groups of parallel tasks
- Suggested MVP scope: Phases 1–3 (US1 Search, 15 tasks)
