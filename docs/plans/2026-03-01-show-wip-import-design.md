# Global Import WIP Banner

## Problem

When users import Naver places, the import completes quickly but enrichment (Kakao category matching) runs asynchronously. Users see "complete" on the import page but have no visibility into the background enrichment — especially after navigating away.

## Decision

A global top banner visible on all pages, powered by a React Context with polling.

## State Machine

```
idle -> fetching -> saving -> enriching -> completed | failed
                                               |          |
                                            (dismiss)  (dismiss)
                                               v          v
                                              idle       idle
```

### ImportPhase type

```ts
type ImportPhase =
  | { status: "idle" }
  | { status: "fetching" }
  | { status: "saving"; total: number }
  | { status: "enriching"; batchId: string }
  | { status: "completed"; importedCount: number }
  | { status: "failed"; message: string }
```

## Architecture

### ImportStatusContext

- Wraps the app inside `AuthLayoutShell`
- Exposes `importPhase` and setter functions (`startImport`, `setSaving`, `startEnrichment`, `dismiss`)
- Polling: only active when `status === "enriching"` — hits `/api/import/history` every 5s
- Recovery on mount: checks for any batch with `enrichment_status === "running"` and auto-enters `enriching` state

### ImportBanner component

- Renders between `TopBar` and `<main>` in `AuthLayoutShell`
- z-30 (below TopBar z-40, below OfflineBanner z-50)
- Color-coded: blue (WIP), green (completed), red (failed)
- Spinner on WIP states, dismiss X on completed/failed
- Simple show/hide (no animation)

## Banner States

| Phase | Color | Text | Action |
|-------|-------|------|--------|
| idle | hidden | — | — |
| fetching | blue | "네이버에서 가져오는 중..." | spinner |
| saving | blue | "N개 장소 저장 중..." | spinner |
| enriching | blue | "카테고리 매칭 중..." | spinner |
| completed | green | "가져오기 완료! N개 추가됨" | dismiss X |
| failed | red | "가져오기 실패" | dismiss X |

## Files

### New
- `src/contexts/ImportStatusContext.tsx` — Context provider, hook, polling logic
- `src/components/ImportBanner.tsx` — Banner UI component

### Modified
- `src/components/AuthLayoutShell.tsx` — Add provider + banner
- `src/db/import-hooks.ts` — `useNaverImport` calls context setters during import
- `src/app/my/import/page.tsx` — Connect import flow to context

### Unchanged
- All API routes (no backend changes)
- `ImportProgress.tsx` (keeps its existing local-state behavior)
- `ImportHistory.tsx` (unchanged)

## Error Handling

- Polling network failure: stay in "enriching" state, retry next poll
- User closes app during enrichment: enrichment runs server-side; ImportHistory shows result on next visit
- Page refresh during enrichment: context mount detects running batch, resumes polling

## Edge Cases

- Multiple imports: only one banner at a time. New import overrides previous state.
- Dismiss before enrichment completes: polling stops, banner hidden. ImportHistory still shows the result.
