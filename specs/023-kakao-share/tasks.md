# Tasks: KakaoTalk Share Feature

**Input**: Design documents from `/specs/023-kakao-share/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks grouped by user story. No new database or API routes — all work is client-side.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (SDK Loading)

**Purpose**: Load the Kakao JS SDK alongside the existing Maps SDK. This is a prerequisite for all stories.

- [ ] T001 Modify `src/components/KakaoScript.tsx` to also load Kakao JS SDK (`developers.kakao.com/sdk/js/kakao.min.js`) and call `Kakao.init(NEXT_PUBLIC_KAKAO_JS_KEY)` after load, guarded by `Kakao.isInitialized()`

**Checkpoint**: `window.Kakao.Share` is available after page load in the browser.

---

## Phase 2: Foundational (Core Utility + Component)

**Purpose**: Shared infrastructure required by both User Stories. MUST be complete before US1 or US2.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Write unit tests (RED phase) for `src/lib/kakao-share.ts` in `tests/unit/kakao-share.test.ts` — test `isKakaoShareAvailable()` returns false when `window.Kakao` is undefined; test `shareService()` calls `Kakao.Share.sendDefault()` with correct Korean content when available; test `shareService()` falls back to `navigator.clipboard.writeText(SERVICE_URL)` when SDK unavailable; test `shareProfile()` constructs correct dynamic title/description; test `shareProfile()` fallback uses correct profile URL
- [ ] T003 Implement `src/lib/kakao-share.ts` to make T002 tests pass: export `isKakaoShareAvailable()`, `shareService()`, `shareProfile(userId, displayName, wishlistCount)`, `SERVICE_URL` constant, share message constants in Korean
- [ ] T004 Create `src/components/ShareButton.tsx`: props `{ type, userId?, displayName?, wishlistCount?, onResult }` — on click check auth via `createClient().auth.getUser()`, redirect to `/login` if no session, else call `shareService()`/`shareProfile()`, show loading state (`pointer-events-none opacity-50`) during in-flight, call `onResult` with Korean toast message on completion

**Checkpoint**: `pnpm test` passes for `kakao-share.test.ts`. `ShareButton` renders and responds to clicks.

---

## Phase 3: User Story 1 — Header Service Share (Priority: P1) 🎯 MVP

**Goal**: Share button in main app header triggers KakaoTalk share of service homepage from any screen.

**Independent Test**: Log in → tap share icon in header → KakaoTalk dialog opens (mobile) OR clipboard toast appears (desktop). Guest taps share → redirected to `/login`.

- [ ] T005 [US1] Modify `src/components/TopBar.tsx`: add `<ShareButton type="service" onResult={...} />` as an icon button between the title and the notification bell; add local toast state `[toast, setToast]`; render `<Toast>` when toast is set; use an SVG share icon matching the existing bell icon style
- [ ] T006 [US1] Verify guest redirect flow in `TopBar.tsx`: confirm the auth check in `ShareButton` fires before share logic; no additional changes needed if `ShareButton` already handles this

**Checkpoint**: User Story 1 fully functional. Header share button visible on all screens, KakaoTalk dialog or clipboard fallback works, guest tap redirects to login.

---

## Phase 4: User Story 2 — Profile Share (Priority: P2)

**Goal**: Share button on own profile page triggers KakaoTalk share of the user's wishlist with dynamic name and count.

**Independent Test**: Log in → navigate to `/my` → tap share button → KakaoTalk message includes Korean title with name and restaurant count. Navigate to `/users/[other-id]` → no share button visible.

- [ ] T007 [US2] Inspect `src/components/ProfileHeader.tsx` to confirm whether `wishlistCount` is available in props; if not, trace `UserProfileWithCounts.wishlist_count` through `UserProfileView.tsx` → `ProfileHeader.tsx` prop chain and add the prop
- [ ] T008 [US2] Modify `src/components/ProfileHeader.tsx`: when `isOwnProfile === true`, render `<ShareButton type="profile" userId={...} displayName={...} wishlistCount={...} onResult={...} />`; add local toast state and `<Toast>` rendering; button NOT rendered when `isOwnProfile === false`

**Checkpoint**: User Stories 1 AND 2 both fully functional. Profile share shows dynamic Korean message with correct name and count.

---

## Phase 5: Polish & Verification

- [ ] T009 [P] Run `pnpm test` and confirm all tests in `tests/unit/kakao-share.test.ts` pass
- [ ] T010 [P] Run `pnpm build` to confirm no TypeScript errors and no unexpected bundle warnings
- [ ] T011 Manual verification per `quickstart.md` checklist: header share on mobile, clipboard fallback on desktop, guest redirect, profile share content accuracy, share button absent on other users' profiles

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS Phase 3 and Phase 4
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2 (can run in parallel with Phase 3)
- **Phase 5 (Polish)**: Depends on Phase 3 + Phase 4

### Task Dependencies Within Phases

```
T001 → T002 → T003 → T004 → T005 → T009, T010, T011
                           ↘ T006 ↗
                           ↘ T007 → T008 ↗
```

### Parallel Opportunities

- T005 and T007 can run in parallel (different files: TopBar.tsx vs ProfileHeader.tsx)
- T009 and T010 can run in parallel (independent checks)

---

## Implementation Strategy

### MVP First (User Story 1 Only — Phases 1–3)

1. T001: Load Kakao JS SDK
2. T002–T004: Core utility + ShareButton (foundational)
3. T005–T006: Header integration
4. **VALIDATE**: Test User Story 1 end-to-end
5. Proceed to Phase 4 if MVP confirmed

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (share utility works, ShareButton renders)
2. Phase 3 → MVP: header share from any screen
3. Phase 4 → Profile share on own page
4. Phase 5 → Full verification

---

## Notes

- No database migration required
- No new API routes required
- No new environment variables required (`NEXT_PUBLIC_KAKAO_JS_KEY` already set)
- Bundle size impact: ~25KB gzipped (Kakao JS SDK) — justify in PR description per constitution
- Toast messages must be in Korean: `"링크가 복사되었습니다"` (clipboard success), `"링크 복사에 실패했습니다"` (error)
