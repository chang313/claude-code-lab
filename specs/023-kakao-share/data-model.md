# Data Model: KakaoTalk Share Feature (023)

## Database Changes

**None.** Sharing is a stateless, client-side action. No new tables, columns, or migrations are required.

## Migration SQL

```sql
-- No migration required for this feature.
```

## Content Model (No Persistence)

These structures describe the shape of data passed to the Kakao Share SDK at runtime. They are not stored in the database.

### ServiceShareMessage

Constructed statically at build time / component mount. Content does not change per user.

| Field | Type | Value |
|-------|------|-------|
| `title` | `string` | `"맛집 리스트"` |
| `description` | `string` | `"친구의 맛집을 함께 저장하고 공유해보세요!"` |
| `imageUrl` | `string` | App OG image URL (static asset or hosted image) |
| `webUrl` | `string` | `https://claude-code-lab.vercel.app` |
| `mobileWebUrl` | `string` | `https://claude-code-lab.vercel.app` |

### ProfileShareMessage

Constructed dynamically from the currently-viewed profile's data.

| Field | Type | Source | Value Shape |
|-------|------|--------|-------------|
| `title` | `string` | `UserProfile.username` | `"${name}님의 맛집 리스트"` |
| `description` | `string` | wishlist count | `"저장된 맛집 ${count}개 · 같이 둘러보세요!"` |
| `imageUrl` | `string` | static asset | App OG image URL |
| `webUrl` | `string` | `UserProfile.id` | `https://claude-code-lab.vercel.app/users/${userId}` |
| `mobileWebUrl` | `string` | `UserProfile.id` | same as `webUrl` |

### Existing Types Used (No Changes)

- `UserProfile` (`src/types/index.ts`): `{ id, username, avatar_url, ... }` — provides `name` and `id` for profile share.
- `UserProfileWithCounts` (`src/types/index.ts`): `{ ...UserProfile, wishlist_count, visited_count }` — provides `wishlist_count` for description.

## Shared Link URL Patterns

| Share type | URL | Accessible without auth? |
|------------|-----|--------------------------|
| Service homepage | `https://claude-code-lab.vercel.app/` | No — redirects to `/login` |
| User profile | `https://claude-code-lab.vercel.app/users/${userId}` | Yes (feature 016) |

> **Note**: The service homepage (`/`) redirects unauthenticated visitors to `/login`. Recipients who are not logged in will need to create an account to access the wishlist. This is acceptable behavior for an invite-style share. The `/login` page is the natural entry point.
