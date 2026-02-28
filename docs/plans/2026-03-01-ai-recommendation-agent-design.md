# AI Restaurant Recommendation Agent — Design

## Overview

AI-powered restaurant discovery page that suggests restaurants based on social signals (friends' wishlists) and personal patterns (user's saved categories/areas). Uses Groq (LLaMA 3.1 8B) for ranking and Korean explanation generation, with SQL-only fallback.

## Architecture: SQL Candidates → LLM Ranker

```
User opens /discover
        │
        ▼
POST /api/recommendations/generate
        │
        ├─── SQL: get_social_candidates()
        │    (friends' restaurants user hasn't saved)
        │
        ├─── SQL: analyze user's top categories + geo center
        │    → Kakao Local API: keyword search for similar nearby
        │
        ▼
 ~20-50 candidates merged & deduped
        │
        ▼
 Groq API (llama-3.1-8b-instant, JSON mode)
  - Input: user profile summary + candidates
  - Output: top 10 ranked with Korean reason
        │
        ▼
 JSON response → render DiscoverCard list
```

## Candidate Generation

### Social Pool (Postgres function)

`get_social_candidates(target_user_id UUID)` returns restaurants saved by mutual followers that the target user hasn't saved.

Fields per candidate:
- `kakao_place_id`, `name`, `category`, `address`, `lat`, `lng`, `place_url`
- `saved_by_count` (how many mutual followers saved it)
- `saved_by_names` (array of profile nicknames, for LLM context)

### Personal Pool (Kakao API)

1. Analyze user's `restaurants` table: top 3 categories by COUNT
2. Compute geographic center of user's saved restaurants
3. Kakao Local API keyword search for each top category near that center
4. Filter out places user already has

### Merge

- Deduplicate by `kakao_place_id` (social wins if both)
- Tag each with `source: "social" | "discovery"`
- Cap at 50 candidates

## LLM Integration

### Provider

- **Groq** with `llama-3.1-8b-instant`
- Env var: `GROQ_API_KEY` (server-only)
- JSON mode for structured output

### Prompt

```
System: You are a Korean restaurant recommendation assistant.
Given a user's dining profile and candidate restaurants,
select the top 10 most relevant and explain each choice
in one short Korean sentence.
Return JSON: { recommendations: [{ kakao_place_id, reason }] }

User: {profile_summary}\n\nCandidates:\n{candidates_json}
```

### Fallback

On Groq failure (429 rate limit, timeout >5s, parse error):
- Rank candidates by `saved_by_count` DESC, then discovery pool
- Template explanations: "친구 N명이 저장했어요" / "자주 가는 {category} 근처 맛집"

## Frontend

### Navigation

Add 5th tab to BottomNav: 맛집 → 검색 → **추천** → 사람 → 내정보

### `/discover` Page

States:
- **Loading**: Skeleton cards with shimmer
- **Results**: 10 DiscoverCards in vertical scroll
- **Empty**: "추천을 생성하려면 맛집을 더 저장해보세요" (min 3 saved)
- **Error**: Toast with retry

### DiscoverCard Component

- Restaurant name + category badge + address
- AI reason in subtle callout style
- Source indicator: 👥 social / 🧭 discovery
- Action: "추가" button → add to wishlist (optimistic UI, reuse existing patterns)
- Tap card → Kakao place_url or restaurant detail

### Refresh

"새로고침" button in header → re-calls API, replaces results

## API Route

`POST /api/recommendations/generate`

- Auth required (Supabase session)
- No request body needed (uses auth user)
- Response: `{ recommendations: DiscoverItem[], fallback: boolean }`
- `fallback: true` when LLM failed and SQL-only ranking was used

## Database Changes

### New Postgres Function

`get_social_candidates(target_user_id UUID)` — SECURITY DEFINER function joining `restaurants`, `follows`, `profiles`.

### No New Tables

Recommendations are generated on-the-fly, not persisted. No new tables for MVP.

## File Plan

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/recommendations/generate/route.ts` | Create | API route: candidate generation + Groq call |
| `src/lib/groq.ts` | Create | Groq client wrapper with timeout/retry |
| `src/lib/recommendation-engine.ts` | Create | Candidate generation, profile analysis, merge logic |
| `src/app/discover/page.tsx` | Create | Discovery page with loading/empty/results states |
| `src/components/DiscoverCard.tsx` | Create | Recommendation card with AI reason |
| `src/components/BottomNav.tsx` | Modify | Add 5th "추천" tab |
| `src/types/index.ts` | Modify | Add DiscoverItem, GroqResponse types |
| `tests/unit/recommendation-engine.test.ts` | Create | Candidate gen + merge logic tests |
| `tests/unit/discover-page.test.ts` | Create | Page component tests |
| DB migration SQL | Create | `get_social_candidates` function |

## Testing Strategy

- Unit tests for candidate generation (mock Supabase)
- Unit tests for Groq prompt building and response parsing
- Unit tests for fallback behavior (rate limit, timeout, parse error)
- Unit tests for DiscoverCard and page states (loading/empty/results/error)

## Dependencies

- `groq-sdk` npm package (official Groq TypeScript SDK)
- `GROQ_API_KEY` env var in Vercel settings

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LLM provider | Groq (free tier) | Fast, generous rate limits, no cost |
| Model | llama-3.1-8b-instant | Fast enough for on-demand, good Korean |
| Generation timing | On-demand | Simpler than cron, no new infra |
| Storage | None (stateless) | MVP simplicity, cache later if needed |
| Fallback | SQL-only ranking + templates | Graceful degradation, never blank page |
