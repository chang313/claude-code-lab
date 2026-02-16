# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`claude-code-lab` is a mobile-first web app for managing restaurant wishlists with Kakao Maps integration. Built with Next.js 15 App Router, it uses Supabase for authentication (Kakao OAuth) and cloud-synced data storage.

**Key Features**: Search restaurants (Kakao Local API), integrated map view with markers + bottom sheet, wishlist with star ratings, per-user cloud sync.

## Claude Code Guide Usage

The claude-code-guide agent may sometimes give incorrect answers. When the user asks follow-up questions, refer to the markdown files from the official Claude Code documentation at https://code.claude.com/docs using curl to provide accurate answers. After that, use AskUserQuestion to quiz the user and guide them to try it hands-on.

## Active Technologies
- TypeScript 5.x (strict mode) + Next.js 15 (App Router), React 19, Tailwind CSS 4, Kakao Maps SDK, Kakao Local REST API, Supabase (Auth + Postgres), @supabase/ssr
- Supabase Kakao OAuth for authentication, Supabase Postgres with RLS for cloud-synced data

## Recent Changes
- 001-restaurant-wishlist: Migrated from Dexie.js (IndexedDB) to Supabase (Postgres + Kakao OAuth). Dropped offline/guest mode. All data is cloud-synced per user.
- 002-integrate-search-tabs: Merged Search & Map tabs into unified search+map page with bottom sheet, auto-fit bounds, marker interaction.

## Deployment

### Vercel
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

### Local Development
```bash
cp .env.example .env.local  # fill in values
pnpm install && pnpm dev
```
