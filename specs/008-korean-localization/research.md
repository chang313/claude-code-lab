# Research: 한국어 용어 전환

**Feature**: 008-korean-localization
**Date**: 2026-02-18

## Summary

이 기능은 기술적 불확실성이 없는 단순 텍스트 교체 작업이다. 별도의 연구가 필요한 미해결 항목(NEEDS CLARIFICATION)이 없다.

## Decisions

### 1. 한국어화 접근 방식

- **Decision**: 하드코딩 문자열 직접 교체 (i18n 프레임워크 미도입)
- **Rationale**: 단일 로케일(한국어) 전용 앱이므로 i18n 프레임워크는 불필요한 복잡성. Principle V (Simplicity) 준수.
- **Alternatives considered**: next-intl, react-i18next → 단일 언어 앱에 과도한 추상화

### 2. HTML lang 속성

- **Decision**: `<html lang="en">` → `<html lang="ko">`로 변경
- **Rationale**: 스크린 리더가 올바른 언어로 텍스트를 읽도록 하고, SEO에서 올바른 언어를 인식하게 함
- **Alternatives considered**: 없음 — 한국어 콘텐츠에 `lang="ko"`는 필수

### 3. "MY" 탭 라벨 유지

- **Decision**: "MY" 탭 라벨은 영문 그대로 유지
- **Rationale**: 배민, 쿠팡, 카카오톡 등 한국 앱에서 관례적으로 사용하는 표현
- **Alternatives considered**: "마이", "나" → 한국 앱 컨벤션에 맞지 않음

### 4. 용어 매핑 테이블

| English | Korean | Context |
|---------|--------|---------|
| Wishlist | 맛집 | 앱 전반 핵심 용어 |
| My Wishlist | 나의 맛집 | 메인 페이지 제목 |
| Restaurant Wishlist | 맛집 리스트 | 앱 이름 (title, 로그인 페이지) |
| Search | 검색 | 내비게이션 탭 |
| Search restaurants... | 맛집 검색... | 검색창 placeholder |
| Search this area | 이 지역 검색 | 지도 검색 버튼 |
| My Info | 내 정보 | 마이페이지 제목 |
| Log out | 로그아웃 | 마이페이지 버튼 |
| Log in with Kakao | 카카오로 로그인 | 로그인 버튼 |
| Logging in... | 로그인 중... | 로그인 로딩 상태 |
| Loading... | 로딩 중... | 공통 로딩 상태 |
| ← Back | ← 뒤로 | 상세 페이지 뒤로가기 |
| Rating: | 평점: | 상세 페이지 별점 |
| Remove from Wishlist | 맛집에서 삭제 | 상세 페이지 삭제 버튼 |
| View on Kakao Map | 카카오맵에서 보기 | 상세 페이지 링크 |
| Restaurant not found | 음식점을 찾을 수 없습니다 | 상세 페이지 에러 |
| ✓ Saved | ✓ 저장됨 | 카드/마커 상태 |
| + Wishlist | + 맛집 추가 | 카드 저장 버튼 |
| Remove | 삭제 | 카드 삭제 버튼 |
| No restaurants saved yet | 아직 저장된 맛집이 없습니다 | 빈 상태 제목 |
| Search or browse the map to add restaurants | 검색하거나 지도에서 맛집을 추가해 보세요 | 빈 상태 설명 |
| Login failed. Please try again. | 로그인에 실패했습니다. 다시 시도해 주세요. | 로그인 오류 |
| Authentication was denied or failed. | 인증이 거부되었거나 실패했습니다. | 로그인 오류 |
| An unexpected error occurred. | 예기치 않은 오류가 발생했습니다. | 로그인 오류 |
| Failed to connect. Please check your network. | 연결에 실패했습니다. 네트워크를 확인해 주세요. | 로그인 오류 |
| Search failed. Tap to try again. | 검색에 실패했습니다. 탭하여 다시 시도하세요. | 검색 에러 토스트 |
| Save and organize your restaurant wishlist by menu items | 맛집을 저장하고 관리하세요 | 메타 description |
