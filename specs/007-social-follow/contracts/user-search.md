# API Contract: User Search

## Search Users by Name

**Hook**: `useSearchUsers(query: string)`
**Precondition**: `query.length >= 2` (enforced client-side, no query fired otherwise)
**Supabase Query**:
```
profiles.select('*')
  .ilike('display_name', `%${query}%`)
  .neq('id', currentUserId)
  .order('display_name', { ascending: true })
  .range(0, 19)
```
**Returns**: `UserProfile[]` (max 20 results per page)
**Cache Key**: `user-search:${query}` (short TTL, debounced 300ms client-side)
**Behavior**:
- Debounced input: 300ms delay before firing query
- Minimum 2 characters
- Excludes current user from results (FR-002)
- Case-insensitive substring match on display_name
- Results ordered alphabetically
- Pagination: 20 results per page, load more on scroll

---

## Search Empty State

When no results match, return empty array. UI shows "No users found" message.

## Search Loading State

While query is in-flight, show loading spinner in results area. Do not clear previous results until new results arrive (prevents flash of empty state).
