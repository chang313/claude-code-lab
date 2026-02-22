# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`claude-code-lab` is a mobile-first web app for managing restaurant wishlists with Kakao Maps integration. Built with Next.js 16 App Router, it uses Supabase for authentication (Kakao OAuth) and cloud-synced data storage.

**Key Features**: Viewport-based search ("Search this area" on pan/zoom, up to 300 results) with semantic expansion (e.g., "chicken" finds KFC) and relevance sorting, global fallback search for distant restaurants, integrated map view with markers + bottom sheet, wishlist with star ratings (visible on other users' profiles), Naver Map bookmark import with Kakao enrichment, per-user cloud sync.

## Claude Code Guide Usage

The claude-code-guide agent may sometimes give incorrect answers. When the user asks follow-up questions, refer to the markdown files from the official Claude Code documentation at https://code.claude.com/docs using curl to provide accurate answers. After that, use AskUserQuestion to quiz the user and guide them to try it hands-on.

## Rules

Project rules are in `.claude/rules/`:
- `workflow.md` — worktree-first development policy
- `deployment.md` — Vercel, env vars, OAuth setup, DB migrations
- `commands.md` — git workflow custom command reference
- `database.md` — Supabase/PostgREST query and schema patterns
- `kakao.md` — Kakao Maps SDK and OAuth integration

## Active Technologies
- TypeScript 5.x (strict mode) + Next.js 16 (App Router), React 19, Tailwind CSS 4, Kakao Maps SDK, Kakao Local REST API, Supabase (Auth + Postgres), @supabase/ssr
- Supabase Kakao OAuth for authentication, Supabase Postgres with RLS for cloud-synced data

## Feature History

See [CHANGELOG.md](CHANGELOG.md) for the full feature history (001–018).
