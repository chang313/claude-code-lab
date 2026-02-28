# Data Model — AI Recommendation Agent

## Migration SQL

Run this in Supabase Dashboard > SQL Editor before deploying.

```sql
-- Function: get_social_candidates
-- Returns restaurants saved by mutual followers that the target user hasn't saved.
-- Used by the AI recommendation engine to generate social-pool candidates.

CREATE OR REPLACE FUNCTION get_social_candidates(target_user_id UUID)
RETURNS TABLE (
  kakao_place_id TEXT,
  name TEXT,
  category TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  place_url TEXT,
  saved_by_count BIGINT,
  saved_by_names TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH mutual AS (
    SELECT f1.followed_id AS friend_id
    FROM follows f1
    JOIN follows f2
      ON f1.followed_id = f2.follower_id
      AND f2.followed_id = f1.follower_id
    WHERE f1.follower_id = target_user_id
  ),
  friend_restaurants AS (
    SELECT
      r.kakao_place_id,
      r.name,
      r.category,
      r.address,
      r.lat,
      r.lng,
      r.place_url,
      p.nickname
    FROM restaurants r
    JOIN mutual m ON r.user_id = m.friend_id
    JOIN profiles p ON r.user_id = p.id
    WHERE r.kakao_place_id NOT IN (
      SELECT kakao_place_id FROM restaurants WHERE user_id = target_user_id
    )
  )
  SELECT
    fr.kakao_place_id,
    fr.name,
    fr.category,
    fr.address,
    fr.lat,
    fr.lng,
    fr.place_url,
    COUNT(*)::BIGINT AS saved_by_count,
    ARRAY_AGG(DISTINCT fr.nickname) AS saved_by_names
  FROM friend_restaurants fr
  GROUP BY fr.kakao_place_id, fr.name, fr.category, fr.address, fr.lat, fr.lng, fr.place_url
  ORDER BY saved_by_count DESC
  LIMIT 30;
$$;
```

## No New Tables

This feature uses only existing tables (`restaurants`, `follows`, `profiles`) and generates recommendations on-the-fly.
