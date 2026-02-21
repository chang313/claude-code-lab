# Deployment

## Vercel
Deployed on Vercel. Package manager: pnpm.

**Required Environment Variables** (set in Vercel project settings):
- `NEXT_PUBLIC_KAKAO_JS_KEY` - Kakao JavaScript key (Maps SDK)
- `NEXT_PUBLIC_KAKAO_REST_KEY` - Kakao REST API key (Local API)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**OAuth Callback Setup** (required per deployment domain):
1. Supabase Dashboard > Auth > URL Configuration > Add `https://<domain>/auth/callback`
2. Kakao Developer Console > App Settings > Add redirect URI
3. Missing env vars = `MIDDLEWARE_INVOCATION_FAILED`; missing callback URL = login hangs after redirect

**Database Migrations** (manual — Supabase does not auto-apply):
- Run migration SQL from `specs/NNN-feature-name/data-model.md` in Supabase Dashboard > SQL Editor before deploying features that add tables.
- Feature 007 requires: `profiles` table, `follows` table, updated `restaurants` RLS policy (see `specs/007-social-follow/data-model.md`).
- Feature 011 requires: `recommendations` table, `get_mutual_followers()` function, `get_unread_recommendation_count()` function (see `specs/011-restaurant-sharing/data-model.md`).
- Feature 014 requires: `restaurants.star_rating` column altered to nullable with CHECK constraint (see `specs/014-visited-wishlist/data-model.md`).

## Local Development
```bash
cp .env.example .env.local  # fill in values
pnpm install && pnpm dev
```
