# Tasks: 한국어 용어 전환

**Input**: Design documents from `/specs/008-korean-localization/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: No unit tests for this feature — pure UI text replacement with no testable business logic. Verification via `pnpm build`.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: HTML metadata and foundational language settings

- [x] T001 [US1] Update HTML lang attribute and metadata in `src/app/layout.tsx` — change `lang="en"` to `lang="ko"`, title to "맛집 리스트", description to "맛집을 저장하고 관리하세요"

**Checkpoint**: Browser tab shows Korean title, HTML lang is "ko"

---

## Phase 2: User Story 1 — 모든 UI 텍스트 한국어 표시 (P1) 🎯 MVP

**Goal**: 핵심 화면(맛집 목록, 검색, 내비게이션)의 모든 영문 텍스트를 한국어로 교체

**Independent Test**: 맛집 목록, 검색, 내비게이션에서 영문이 없는지 시각 확인

### Implementation

- [x] T002 [P] [US1] Update bottom navigation labels in `src/components/BottomNav.tsx` — "Wishlist"→"맛집", "Search"→"검색", "My" stays "MY"; update aria-label "Main navigation"→"메인 내비게이션"
- [x] T003 [P] [US1] Update wishlist page in `src/app/page.tsx` — "My Wishlist"→"나의 맛집", "Loading..."→"로딩 중...", empty state "No restaurants saved yet"→"아직 저장된 맛집이 없습니다", "Search or browse the map to add restaurants"→"검색하거나 지도에서 맛집을 추가해 보세요"
- [x] T004 [P] [US1] Update search bar in `src/components/SearchBar.tsx` — placeholder "Search restaurants..."→"맛집 검색...", aria-labels to Korean
- [x] T005 [P] [US1] Update search area button in `src/components/SearchThisAreaButton.tsx` — "Search this area"→"이 지역 검색"
- [x] T006 [P] [US1] Update restaurant card in `src/components/RestaurantCard.tsx` — "✓ Saved"→"✓ 저장됨", "+ Wishlist"→"+ 맛집 추가", "Remove"→"삭제", aria-labels to Korean
- [x] T007 [P] [US1] Update map view in `src/components/MapView.tsx` — aria-label "Restaurant map"→"맛집 지도", info window "✓ Saved"→"✓ 저장됨"
- [x] T008 [P] [US1] Update star rating in `src/components/StarRating.tsx` — aria-label "Star rating"→"별점"
- [x] T009 [US1] Update search page error toast in `src/app/search/page.tsx` — "Search failed. Tap to try again."→"검색에 실패했습니다. 탭하여 다시 시도하세요."

**Checkpoint**: 맛집 목록, 검색, 내비게이션 모두 한국어. `pnpm build` 통과.

---

## Phase 3: User Story 2 — 로그인 화면 한국어 표시 (P1)

**Goal**: 로그인 페이지의 모든 텍스트를 한국어로 교체

**Independent Test**: 로그인 페이지에서 모든 텍스트가 한국어인지 확인

### Implementation

- [x] T010 [US2] Update login page in `src/app/login/page.tsx` — app name "Restaurant Wishlist"→"맛집 리스트", description→"카카오 로그인으로 맛집을 저장하고 동기화하세요", button "Log in with Kakao"→"카카오로 로그인", loading "Logging in..."→"로그인 중...", all error messages to Korean per research.md mapping table

**Checkpoint**: 로그인 페이지 완전 한국어화. 오류 시나리오도 한국어.

---

## Phase 4: User Story 3 — 음식점 상세 및 마이페이지 한국어 표시 (P2)

**Goal**: 상세 페이지와 마이페이지의 모든 텍스트를 한국어로 교체

**Independent Test**: 음식점 상세와 마이페이지에서 모든 텍스트가 한국어인지 확인

### Implementation

- [x] T011 [P] [US3] Update restaurant detail page in `src/app/restaurant/[id]/page.tsx` — "Loading..."→"로딩 중...", "Restaurant not found"→"음식점을 찾을 수 없습니다", "← Back"→"← 뒤로", "Rating:"→"평점:", "Remove from Wishlist"→"맛집에서 삭제", "View on Kakao Map"→"카카오맵에서 보기"
- [x] T012 [P] [US3] Update my info page in `src/app/my/page.tsx` — "My Info"→"내 정보", "Log out"→"로그아웃", "Loading..."→"로딩 중..."

**Checkpoint**: 모든 페이지 한국어화 완료.

---

## Phase 5: Polish & Validation

**Purpose**: 빌드 검증 및 최종 확인

- [x] T013 Run `pnpm build` to verify no TypeScript errors or broken imports
- [x] T014 Final review — grep codebase for remaining English UI strings in src/ (excluding code identifiers, imports, and technical terms)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1)**: Depends on Phase 1 (layout.tsx metadata set)
- **Phase 3 (US2)**: Can run in parallel with Phase 2 (different files)
- **Phase 4 (US3)**: Can run in parallel with Phase 2 and 3 (different files)
- **Phase 5 (Polish)**: Depends on all previous phases

### Parallel Opportunities

- T002–T009: All marked [P] within Phase 2 can run in parallel (different component files)
- T011–T012: Can run in parallel (different page files)
- Phase 2, 3, 4 can run in parallel (all modify different files)

---

## Notes

- All translations follow the canonical mapping in research.md §4
- "MY" tab label intentionally kept in English (Korean app convention)
- Code identifiers (variable names, function names) stay in English
- Dynamic data from Kakao API already in Korean — no changes needed
