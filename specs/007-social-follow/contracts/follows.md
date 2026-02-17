# API Contract: Follows

All operations use Supabase client queries. RLS enforces `follower_id = auth.uid()` for mutations.

## Follow User

**Hook**: `useFollowUser()`
**Method**: `followUser(followedId: string) => Promise<boolean>`
**Supabase Query**:
```
follows.insert({ follower_id: currentUserId, followed_id: followedId })
```
**Returns**: `true` on success, `false` on duplicate (error code 23505)
**Invalidates**: `followers:${followedId}`, `following:${currentUserId}`, `profile-counts:${followedId}`, `profile-counts:${currentUserId}`

---

## Unfollow User

**Hook**: `useUnfollowUser()`
**Method**: `unfollowUser(followedId: string) => Promise<boolean>`
**Supabase Query**:
```
follows.delete().eq('follower_id', currentUserId).eq('followed_id', followedId)
```
**Returns**: `true` on success, `false` if not following
**Invalidates**: Same as follow

---

## Check if Following

**Hook**: `useIsFollowing(followedId: string)`
**Supabase Query**:
```
follows.select('follower_id')
  .eq('follower_id', currentUserId)
  .eq('followed_id', followedId)
  .maybeSingle()
```
**Returns**: `boolean`
**Cache Key**: `is-following:${currentUserId}:${followedId}`

---

## List Following (users I follow)

**Hook**: `useFollowing(userId: string)`
**Supabase Query**:
```
follows.select('followed_id, created_at, profiles!follows_followed_id_fkey(*)')
  .eq('follower_id', userId)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1)
```
**Returns**: `{ user: UserProfile; followedAt: string }[]`
**Cache Key**: `following:${userId}`

---

## List Followers (users who follow me)

**Hook**: `useFollowers(userId: string)`
**Supabase Query**:
```
follows.select('follower_id, created_at, profiles!follows_follower_id_fkey(*)')
  .eq('followed_id', userId)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1)
```
**Returns**: `{ user: UserProfile; followedAt: string }[]`
**Cache Key**: `followers:${userId}`
