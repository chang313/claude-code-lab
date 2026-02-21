# Quickstart: 008-korean-localization

## What This Feature Does

앱의 모든 사용자 대면 영문 텍스트를 한국어로 교체한다. "Wishlist" → "맛집" 용어 전환 포함.

## Implementation Approach

1. **HTML 메타데이터**: `layout.tsx`에서 `lang="ko"`, title, description 한국어화
2. **내비게이션**: `BottomNav.tsx`에서 탭 라벨 변경 (Wishlist→맛집, Search→검색)
3. **페이지별 텍스트**: 각 페이지 컴포넌트의 하드코딩 문자열 교체
4. **컴포넌트별 텍스트**: 카드, 검색바, 버튼 등 공통 컴포넌트의 문자열 교체
5. **접근성 라벨**: aria-label 속성값 한국어 변경
6. **빌드 검증**: `pnpm build` 통과 확인

## Key Files

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | lang, title, description |
| `src/app/page.tsx` | 제목, 빈 상태 텍스트 |
| `src/app/login/page.tsx` | 앱 이름, 설명, 버튼, 오류 메시지 |
| `src/app/my/page.tsx` | 제목, 로그아웃 버튼 |
| `src/app/restaurant/[id]/page.tsx` | 뒤로, 평점, 삭제, 맵 링크 |
| `src/app/search/page.tsx` | 에러 토스트 |
| `src/components/BottomNav.tsx` | 탭 라벨 |
| `src/components/SearchBar.tsx` | placeholder, aria-label |
| `src/components/SearchThisAreaButton.tsx` | 버튼 텍스트 |
| `src/components/RestaurantCard.tsx` | 저장/삭제 상태 |
| `src/components/MapView.tsx` | aria-label, 정보창 |
| `src/components/StarRating.tsx` | aria-label |

## Verification

```bash
pnpm build          # 빌드 성공 확인
pnpm dev            # 로컬에서 시각 검증
```
