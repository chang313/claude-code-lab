# Quickstart: Social Follow & User Profiles

## Prerequisites

- Supabase project with Kakao OAuth configured
- Access to Supabase SQL Editor (for table creation)
- Local dev environment running (`pnpm dev`)

## Step 1: Create Database Tables

Run the following SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query):

```sql
-- 1. Create profiles table
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

-- 2. Create follows table
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

-- 3. Update restaurants RLS (allow cross-user reads)
-- IMPORTANT: Check the exact name of your existing SELECT policy first:
-- Run: SELECT policyname FROM pg_policies WHERE tablename = 'restaurants' AND cmd = 'SELECT';
-- Then replace the policy name below:
DROP POLICY IF EXISTS "Users can view own restaurants" ON restaurants;

CREATE POLICY "Restaurants are viewable by authenticated users"
  ON restaurants FOR SELECT TO authenticated USING (true);
```

## Step 2: Seed Test Profiles (for existing users)

If you have existing users without profiles, create profiles for them:

```sql
INSERT INTO profiles (id, display_name, avatar_url)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture')
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL;
```

## Step 3: Verify Setup

```sql
-- Check profiles exist
SELECT count(*) FROM profiles;

-- Check RLS on restaurants allows cross-user reads
-- (should return restaurants from ALL users, not just yours)
SELECT user_id, count(*) FROM restaurants GROUP BY user_id;

-- Check follows table is ready
SELECT * FROM follows LIMIT 1;  -- Should return empty, no error
```

## Step 4: Local Development

```bash
pnpm dev
# Navigate to /users to see the People tab
# Search for users, view profiles, follow/unfollow
```

## Troubleshooting

- **"permission denied for table profiles"**: RLS not enabled or policy missing. Re-run the CREATE POLICY statements.
- **Profile not created on login**: Check `/auth/callback/route.ts` has the upsert logic. Log in again to trigger.
- **Can't see other users' restaurants**: The old SELECT policy on `restaurants` wasn't dropped. Check with `SELECT * FROM pg_policies WHERE tablename = 'restaurants';`
