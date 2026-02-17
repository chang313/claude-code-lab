# Implementation Plan: Rename MY Tab to Korean "내정보"

**Branch**: `010-rename-my-tab` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-rename-my-tab/spec.md`

## Summary

Change the bottom navigation tab label from "MY" to "내정보" in `src/components/BottomNav.tsx`. This is a single-line text change — no new files, no data model changes, no API changes.

## Technical Context

**Language/Version**: TypeScript 5.x strict
**Primary Dependencies**: Next.js 15 (App Router), React 19
**Storage**: N/A (no data changes)
**Testing**: Visual verification only (no existing test suite for this component)
**Target Platform**: Mobile-first web app
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: N/A (label change only)
**Constraints**: None
**Scale/Scope**: 1 file, 1 line change

## Project Structure

### Documentation (this feature)

```text
specs/010-rename-my-tab/
├── spec.md
├── plan.md              # This file
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/components/BottomNav.tsx   # Line 10: label "MY" → "내정보"
```

**Structure Decision**: Single file modification — no new files or directories needed.

## Implementation Steps

1. In `src/components/BottomNav.tsx`, change `label: "MY"` to `label: "내정보"` on line 10
2. Build verification: `pnpm build` to ensure no regressions
3. Visual verification: confirm all four tabs display Korean text
