# Feature Specification: Rename MY Tab to Korean "내정보"

**Feature Branch**: `010-rename-my-tab`
**Created**: 2026-02-18
**Status**: Draft
**Input**: User description: "Change 'My' tab to Korean '내정보'"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Korean-consistent navigation label (Priority: P1)

As a Korean-speaking user, I see "MY" as the only non-Korean label in the bottom navigation. All other tabs display Korean text (맛집, 검색, 사람), creating an inconsistent experience. The "MY" tab should read "내정보" to match the rest of the UI.

**Why this priority**: This is the sole change in the feature — consistent Korean labeling across all navigation tabs.

**Independent Test**: Navigate to any page, observe the bottom navigation bar. The fourth tab should display "내정보" instead of "MY".

**Acceptance Scenarios**:

1. **Given** the app is loaded on any page, **When** the user views the bottom navigation, **Then** the fourth tab displays "내정보" with the 👤 icon
2. **Given** the user taps the "내정보" tab, **When** the page loads, **Then** the /my route renders correctly as before

---

### Edge Cases

- No edge cases — this is a label-only change with no behavioral impact.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The bottom navigation tab currently labeled "MY" MUST display "내정보" instead
- **FR-002**: The tab MUST retain its existing icon (👤), route (/my), and active state behavior
- **FR-003**: No other tabs, pages, or functionality MUST be affected by this change

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All four bottom navigation tabs display Korean text (맛집, 검색, 사람, 내정보)
- **SC-002**: The renamed tab navigates to /my and highlights correctly when active
- **SC-003**: No visual regression in tab layout, spacing, or styling
