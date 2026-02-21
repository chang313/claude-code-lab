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
- Before deploying a feature that adds tables or functions, run the migration SQL from `specs/NNN-feature-name/data-model.md` in Supabase Dashboard > SQL Editor.

## Local Development
```bash
cp .env.example .env.local  # fill in values
pnpm install && pnpm dev
```
