# Quickstart: Restaurant Sharing

**Feature**: 011-restaurant-sharing | **Date**: 2026-02-18

## Prerequisites

1. Supabase project with existing tables: `profiles`, `follows`, `restaurants`
2. Feature 007 (social-follow) migrations applied
3. Local development environment running (`pnpm dev`)

## Setup Steps

### 1. Apply Database Migrations

Run these SQL statements in **Supabase Dashboard > SQL Editor** (in order):

1. `001_create_recommendations.sql` — Creates the `recommendations` table with RLS
2. `002_mutual_followers_function.sql` — Creates `get_mutual_followers()` RPC function
3. `003_unread_count_function.sql` — Creates `get_unread_recommendation_count()` RPC function

All SQL is in [`data-model.md`](data-model.md) under "Migration SQL".

### 2. No New Environment Variables

This feature uses the same Supabase credentials as the existing app. No new env vars needed.

### 3. No New Dependencies

All implementation uses existing packages (React, Next.js, @supabase/ssr, Tailwind). No `pnpm add` needed.

### 4. Development

```bash
# In the feature worktree
pnpm dev
```

### 5. Testing

```bash
pnpm test          # Vitest unit tests
pnpm test:e2e      # Playwright E2E
```

## Key Files to Create

| File | Purpose |
|------|---------|
| `src/db/recommendation-hooks.ts` | All recommendation CRUD hooks |
| `src/components/TopBar.tsx` | App bar with bell icon + badge |
| `src/components/RecommendButton.tsx` | "Recommend" trigger button |
| `src/components/RecommendModal.tsx` | Mutual follower picker |
| `src/components/RecommendationCard.tsx` | Inbox card (accept/ignore) |
| `src/app/recommendations/page.tsx` | Recommendations inbox page |

## Key Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `Recommendation`, `RecommendationWithSender`, `DbRecommendation` types |
| `src/components/AuthLayoutShell.tsx` | Add `TopBar` to layout |
| `src/components/RestaurantCard.tsx` | Add "Recommend" button for wishlist variant |
| `src/app/page.tsx` | Possibly pass recommend handler to cards |

## Verification

After implementation, verify:
1. Bell icon shows in top bar on all pages
2. Badge count shows correct unread count
3. "Recommend" button appears on wishlist restaurant cards
4. Tapping recommend shows mutual followers list
5. Sending recommendation creates a row in `recommendations` table
6. Recipient sees the recommendation in inbox
7. Accept adds restaurant to recipient's wishlist
8. Ignore dismisses the recommendation
9. Badge count decrements after accept/ignore
