# API Contract: Profiles

All operations use Supabase client queries (no custom API routes). RLS enforces authorization.

## Read Profile

**Hook**: `useProfile(userId: string)`
**Supabase Query**:
```
profiles.select('*').eq('id', userId).single()
```
**Returns**: `UserProfile | null`
**Cache Key**: `profile:${userId}`

---

## Read Profile with Counts

**Hook**: `useProfileWithCounts(userId: string)`
**Supabase Queries** (parallel):
```
profiles.select('*').eq('id', userId).single()
follows.select('*', { count: 'exact', head: true }).eq('followed_id', userId)
follows.select('*', { count: 'exact', head: true }).eq('follower_id', userId)
```
**Returns**: `UserProfileWithCounts | null`
**Cache Key**: `profile-counts:${userId}`

---

## Create/Update Profile (Upsert)

**Location**: `/auth/callback/route.ts` (server-side, after OAuth)
**Supabase Query**:
```
profiles.upsert({
  id: user.id,
  display_name: user.user_metadata.name || user.user_metadata.full_name || 'User',
  avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || null,
  updated_at: new Date().toISOString()
}, { onConflict: 'id' })
```
**Returns**: void (fire-and-forget, non-blocking to login flow)

---

## Read User's Restaurants (Cross-User)

**Hook**: `useUserRestaurants(userId: string)`
**Supabase Query**:
```
restaurants.select('*')
  .eq('user_id', userId)
  .order('star_rating', { ascending: false })
  .order('created_at', { ascending: false })
```
**Returns**: `Restaurant[]`
**Cache Key**: `restaurants:${userId}`
**Note**: Requires updated RLS policy allowing authenticated SELECT on all restaurants.
