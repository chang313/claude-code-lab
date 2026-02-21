# Data Model: Social Follow & User Profiles

**Feature**: 007-social-follow | **Date**: 2026-02-18

## New Tables

### `profiles`

Public-facing user profile, auto-created from Kakao OAuth metadata.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | Same as Supabase auth user ID |
| `display_name` | `text` | NOT NULL | From Kakao `user_metadata.name` or fallback chain |
| `avatar_url` | `text` | NULLABLE | From Kakao `user_metadata.avatar_url` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Profile creation time |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last metadata sync |

**Indexes**:
- `profiles_pkey` — PK on `id`
- `profiles_display_name_idx` — btree on `lower(display_name)` for search

**RLS Policies**:
- SELECT: All authenticated users can read any profile
- INSERT: Users can only insert their own profile (`id = auth.uid()`)
- UPDATE: Users can only update their own profile (`id = auth.uid()`)
- DELETE: Users can only delete their own profile (`id = auth.uid()`)

---

### `follows`

Directed follow relationship between two users.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `follower_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | The user who follows |
| `followed_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | The user being followed |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | When the follow happened |

**Constraints**:
- `follows_pkey` — composite PK on `(follower_id, followed_id)` (prevents duplicate follows)
- `follows_no_self_follow` — CHECK constraint: `follower_id != followed_id`

**Indexes**:
- `follows_pkey` — composite PK covers follower_id lookups (for "who do I follow")
- `follows_followed_id_idx` — btree on `followed_id` for "who follows me" queries

**RLS Policies**:
- SELECT: All authenticated users can read any follow relationship
- INSERT: Users can only insert rows where `follower_id = auth.uid()`
- DELETE: Users can only delete rows where `follower_id = auth.uid()`

---

## Modified Tables

### `restaurants` (existing)

**RLS Policy Change Only** — no schema changes.

Current SELECT policy: `user_id = auth.uid()` (users can only see own restaurants)

New SELECT policy: `true` (all authenticated users can see all restaurants)

INSERT/UPDATE/DELETE policies remain unchanged: `user_id = auth.uid()`

---

## Entity Relationships

```text
auth.users (1) ──── (1) profiles
    │                    │
    │                    ├── follows (follower_id) ──── (many) profiles (followed_id)
    │                    │
    └── restaurants (user_id) ──── readable by all authenticated users via profile
```

## TypeScript Types

```typescript
// New types in src/types/index.ts

export interface UserProfile {
  id: string;           // UUID, matches auth user ID
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;    // ISO 8601
}

export interface UserProfileWithCounts extends UserProfile {
  followerCount: number;
  followingCount: number;
}

export interface FollowRelationship {
  followerId: string;
  followedId: string;
  createdAt: string;
}

// Database row types (snake_case, matching Postgres columns)

interface DbProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface DbFollow {
  follower_id: string;
  followed_id: string;
  created_at: string;
}
```

## Migration SQL

```sql
-- 001_create_profiles.sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_display_name_idx ON profiles (lower(display_name));

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE TO authenticated USING (id = auth.uid());

-- 002_create_follows.sql
CREATE TABLE follows (
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id != followed_id)
);

CREATE INDEX follows_followed_id_idx ON follows (followed_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by authenticated users"
  ON follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

-- 003_update_restaurants_rls.sql
-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own restaurants" ON restaurants;

-- Create new permissive SELECT policy
CREATE POLICY "Restaurants are viewable by authenticated users"
  ON restaurants FOR SELECT TO authenticated USING (true);
```
