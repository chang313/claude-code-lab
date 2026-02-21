# Data Model: Restaurant Sharing

**Feature**: 011-restaurant-sharing | **Date**: 2026-02-18

## New Tables

### `recommendations`

A directed restaurant recommendation from one user to another.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Auto-generated |
| `sender_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | The user who sends the recommendation |
| `recipient_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | The user who receives it |
| `kakao_place_id` | `text` | NOT NULL | Kakao place ID for dedup checking |
| `restaurant_name` | `text` | NOT NULL | Snapshot: restaurant name at send time |
| `restaurant_category` | `text` | NOT NULL | Snapshot: category at send time |
| `restaurant_address` | `text` | NOT NULL | Snapshot: address at send time |
| `restaurant_lat` | `double precision` | NOT NULL, DEFAULT `0` | Snapshot: latitude at send time |
| `restaurant_lng` | `double precision` | NOT NULL, DEFAULT `0` | Snapshot: longitude at send time |
| `restaurant_place_url` | `text` | NULLABLE | Snapshot: Kakao place URL at send time |
| `status` | `text` | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'accepted'`, `'ignored'`) | Recommendation lifecycle state |
| `is_read` | `boolean` | NOT NULL, DEFAULT `false` | Whether recipient has viewed this recommendation |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | When the recommendation was sent |
| `resolved_at` | `timestamptz` | NULLABLE | When the recommendation was accepted/ignored |

**Constraints**:
- `recommendations_pkey` — PK on `id`
- `recommendations_no_self_recommend` — CHECK: `sender_id != recipient_id`
- `recommendations_unique_pending` — UNIQUE on `(sender_id, recipient_id, kakao_place_id)` WHERE `status = 'pending'` (partial unique index to prevent duplicate pending recommendations)

**Indexes**:
- `recommendations_pkey` — PK on `id`
- `recommendations_recipient_pending_idx` — btree on `(recipient_id, status)` WHERE `status = 'pending'` (fast inbox query)
- `recommendations_sender_idx` — btree on `sender_id` (for sent history)
- `recommendations_unique_pending_idx` — unique partial index on `(sender_id, recipient_id, kakao_place_id)` WHERE `status = 'pending'`

**RLS Policies**:
- SELECT: Authenticated users can read recommendations where they are the sender OR the recipient
- INSERT: Authenticated users can only insert rows where `sender_id = auth.uid()`
- UPDATE: Authenticated users can only update rows where `recipient_id = auth.uid()` (recipient resolves)
- DELETE: Not allowed (recommendations are resolved, not deleted)

---

## New Functions

### `get_mutual_followers(user_id uuid)`

Returns profiles of users who are mutual followers of the given user.

```sql
-- Users where: I follow them AND they follow me
SELECT p.*
FROM follows f1
JOIN follows f2
  ON f1.follower_id = f2.followed_id
  AND f1.followed_id = f2.follower_id
JOIN profiles p ON p.id = f1.followed_id
WHERE f1.follower_id = user_id;
```

### `get_unread_recommendation_count()`

Returns the count of unread pending recommendations for the current user.

```sql
SELECT count(*)
FROM recommendations
WHERE recipient_id = auth.uid()
  AND status = 'pending'
  AND is_read = false;
```

---

## Modified Tables

None. No schema changes to existing tables.

---

## Entity Relationships

```text
profiles (sender_id) ──── (many) recommendations (many) ──── profiles (recipient_id)
                                       │
                                       └── kakao_place_id (snapshot, not FK)

follows (existing) ──── used to compute mutual followers (no schema change)
restaurants (existing) ──── used for "already in wishlist" check via kakao_place_id
```

## TypeScript Types

```typescript
// New types in src/types/index.ts

export interface Recommendation {
  id: string;
  senderId: string;
  recipientId: string;
  kakaoPlaceId: string;
  restaurantName: string;
  restaurantCategory: string;
  restaurantAddress: string;
  restaurantLat: number;
  restaurantLng: number;
  restaurantPlaceUrl: string | null;
  status: 'pending' | 'accepted' | 'ignored';
  isRead: boolean;
  createdAt: string;       // ISO 8601
  resolvedAt: string | null;
}

export interface RecommendationWithSender extends Recommendation {
  sender: UserProfile;
}

export interface DbRecommendation {
  id: string;
  sender_id: string;
  recipient_id: string;
  kakao_place_id: string;
  restaurant_name: string;
  restaurant_category: string;
  restaurant_address: string;
  restaurant_lat: number;
  restaurant_lng: number;
  restaurant_place_url: string | null;
  status: string;
  is_read: boolean;
  created_at: string;
  resolved_at: string | null;
}
```

## Migration SQL

```sql
-- 001_create_recommendations.sql

CREATE TABLE recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kakao_place_id text NOT NULL,
  restaurant_name text NOT NULL,
  restaurant_category text NOT NULL,
  restaurant_address text NOT NULL,
  restaurant_lat double precision NOT NULL DEFAULT 0,
  restaurant_lng double precision NOT NULL DEFAULT 0,
  restaurant_place_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'ignored')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (sender_id != recipient_id)
);

-- Partial unique index: one pending recommendation per sender-recipient-restaurant
CREATE UNIQUE INDEX recommendations_unique_pending_idx
  ON recommendations (sender_id, recipient_id, kakao_place_id)
  WHERE status = 'pending';

-- Fast inbox query: pending recommendations for a recipient
CREATE INDEX recommendations_recipient_pending_idx
  ON recommendations (recipient_id, status)
  WHERE status = 'pending';

-- Sent history lookup
CREATE INDEX recommendations_sender_idx
  ON recommendations (sender_id);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Users can see recommendations they sent or received
CREATE POLICY "Users can view own recommendations"
  ON recommendations FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can only send recommendations as themselves
CREATE POLICY "Users can send recommendations"
  ON recommendations FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Only recipients can resolve (accept/ignore) recommendations
CREATE POLICY "Recipients can resolve recommendations"
  ON recommendations FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

-- 002_mutual_followers_function.sql

CREATE OR REPLACE FUNCTION get_mutual_followers(target_user_id uuid)
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT p.*
  FROM follows f1
  JOIN follows f2
    ON f1.follower_id = f2.followed_id
    AND f1.followed_id = f2.follower_id
  JOIN profiles p ON p.id = f1.followed_id
  WHERE f1.follower_id = target_user_id;
$$;

-- 003_unread_count_function.sql

CREATE OR REPLACE FUNCTION get_unread_recommendation_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT count(*)
  FROM recommendations
  WHERE recipient_id = auth.uid()
    AND status = 'pending'
    AND is_read = false;
$$;

-- 004_add_lat_lng_to_recommendations.sql
-- Run this if the recommendations table already exists (from 001)

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS restaurant_lat double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS restaurant_lng double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS restaurant_place_url text;
```
