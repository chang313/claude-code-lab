# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

This is a new project (`claude-code-lab`). No build system, dependencies, or source code have been added yet. Update this file as the project takes shape.

## Claude Code Guide Usage

The claude-code-guide agent may sometimes give incorrect answers. When the user asks follow-up questions, refer to the markdown files from the official Claude Code documentation at https://code.claude.com/docs using curl to provide accurate answers. After that, use AskUserQuestion to quiz the user and guide them to try it hands-on.

## Active Technologies
- TypeScript 5.x (strict mode) + Next.js 15 (App Router), React 19, Tailwind CSS 4, Kakao Maps SDK, Kakao Local REST API, Supabase (Auth + Postgres), @supabase/ssr
- Supabase Kakao OAuth for authentication, Supabase Postgres with RLS for cloud-synced data

## Recent Changes
- 001-restaurant-wishlist: Migrated from Dexie.js (IndexedDB) to Supabase (Postgres + Kakao OAuth). Dropped offline/guest mode. All data is cloud-synced per user.
- 002-integrate-search-tabs: Integrating Search & Map tabs into a unified search+map experience
