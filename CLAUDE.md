# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`claude-code-lab` is a mobile-first web app for managing restaurant wishlists with Kakao Maps integration. Built with Next.js 16 App Router, it uses Supabase for authentication (Kakao OAuth) and cloud-synced data storage.

**Key Features**: Viewport-based search ("Search this area" on pan/zoom, up to 300 results) with semantic expansion (e.g., "chicken" finds KFC) and distance sorting, integrated map view with markers + bottom sheet, wishlist with star ratings, per-user cloud sync.

## Claude Code Guide Usage

The claude-code-guide agent may sometimes give incorrect answers. When the user asks follow-up questions, refer to the markdown files from the official Claude Code documentation at https://code.claude.com/docs using curl to provide accurate answers. After that, use AskUserQuestion to quiz the user and guide them to try it hands-on.

## Active Technologies
- TypeScript 5.x (strict mode) + Next.js 16 (App Router), React 19, Tailwind CSS 4, Kakao Maps SDK, Kakao Local REST API, Supabase (Auth + Postgres), @supabase/ssr
- Supabase Kakao OAuth for authentication, Supabase Postgres with RLS for cloud-synced data

## Recent Changes
- 001-restaurant-wishlist: Migrated from Dexie.js (IndexedDB) to Supabase (Postgres + Kakao OAuth). Dropped offline/guest mode. All data is cloud-synced per user.
- 002-integrate-search-tabs: Merged Search & Map tabs into unified search+map page with bottom sheet, auto-fit bounds, marker interaction.
- 003-merge-wishlist-categories: Replaced flat wishlist with auto-categorized accordion view (grouped by Kakao subcategory). Removed By Menu tab. Improved auth callback error handling and login UX.
- 004-smart-search: Added semantic query expansion (12 food category dictionary) and distance-sorted results. Searching "chicken" now finds KFC, BBQ, etc. Results sorted nearest-first with distance labels. Uses Kakao API `sort=distance` + `radius=5000m`. Parallel queries via `Promise.allSettled` with dedup.
- 005-remove-map-tab: Removed standalone Map tab (redundant with unified search+map page). Added `/map` → `/search` permanent redirect. Cleaned up dead `searchByBounds` code.
- 006-viewport-search: Replaced fixed 5km-radius/45-result search with viewport-based search. "Search this area" button on pan/zoom, full pagination (up to 3 pages per term), 300-result cap. Error toast with retry on failure.
- 007-social-follow: Added social follow system — user search, follow/unfollow, profile pages (`/users`, `/users/[id]`), and public wishlist viewing. New DB tables: `profiles` and `follows`. `restaurants` RLS updated from per-user to all-authenticated-users. Requires manual Supabase SQL migrations (see `specs/007-social-follow/data-model.md`).
- 008-korean-localization: Replaced all English UI strings with Korean. "Wishlist" → "맛집" throughout. No i18n framework — direct string replacement.
- 009-fix-my-tab-redirect: Fixed MY tab — `/my` route now renders own profile inline instead of redirecting to `/users/{id}`. MY tab stays highlighted.
- 010-rename-my-tab: Renamed bottom nav "MY" tab to "내정보" for consistent Korean navigation (맛집, 검색, 사람, 내정보).
- 011-restaurant-sharing: Added mutual-follower restaurant recommendation system. Users can recommend restaurants from their own wishlist to mutual followers. New `recommendations` table with RLS, two Postgres functions (`get_mutual_followers`, `get_unread_recommendation_count`). New UI: TopBar with bell-icon badge, RecommendModal, RecommendationCard, `/recommendations` inbox page. Requires manual Supabase SQL migrations (see `specs/011-restaurant-sharing/data-model.md`).
