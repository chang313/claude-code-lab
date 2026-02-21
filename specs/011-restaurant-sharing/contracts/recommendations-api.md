# API Contracts: Recommendations

**Feature**: 011-restaurant-sharing | **Date**: 2026-02-18

All operations use Supabase client-side SDK (no custom API routes needed). Authenticated via Supabase session. RLS enforces authorization.

## Operations

### 1. Get Mutual Followers

**Hook**: `useMutualFollowers()`
**Supabase call**: `.rpc('get_mutual_followers', { target_user_id: currentUserId })`

**Response**: `UserProfile[]`

```typescript
[
  { id: "uuid", displayName: "김철수", avatarUrl: "https://...", createdAt: "2026-..." },
  ...
]
```

**Error cases**:
- Not authenticated → empty array (RLS blocks)

---

### 2. Send Recommendation

**Hook**: `useSendRecommendation()`
**Supabase call**: `.from('recommendations').insert({...})`

**Input**:
```typescript
{
  sender_id: string;        // auth.uid()
  recipient_id: string;     // selected mutual follower
  kakao_place_id: string;   // from restaurant
  restaurant_name: string;
  restaurant_category: string;
  restaurant_address: string;
}
```

**Success**: Returns `true`
**Error cases**:
- Duplicate pending (error code `23505`): Return `false`, show "이미 추천한 맛집입니다"
- Not authenticated: RLS blocks insert

---

### 3. Get Received Recommendations (Inbox)

**Hook**: `useReceivedRecommendations()`
**Supabase call**: `.from('recommendations').select('*, profiles!recommendations_sender_id_fkey(*)').eq('recipient_id', userId).eq('status', 'pending').order('created_at', { ascending: false })`

**Response**: `RecommendationWithSender[]`

```typescript
[
  {
    id: "uuid",
    senderId: "uuid",
    recipientId: "uuid",
    kakaoPlaceId: "12345",
    restaurantName: "맛있는 치킨",
    restaurantCategory: "음식점 > 치킨",
    restaurantAddress: "서울 강남구...",
    status: "pending",
    isRead: false,
    createdAt: "2026-...",
    resolvedAt: null,
    sender: { id: "uuid", displayName: "김철수", avatarUrl: "...", createdAt: "..." }
  }
]
```

---

### 4. Get Unread Count (Badge)

**Hook**: `useUnreadRecommendationCount()`
**Supabase call**: `.rpc('get_unread_recommendation_count')`

**Response**: `number`

---

### 5. Accept Recommendation

**Hook**: `useAcceptRecommendation()`
**Steps**:
1. Update recommendation: `.from('recommendations').update({ status: 'accepted', resolved_at: new Date().toISOString() }).eq('id', recommendationId)`
2. Add restaurant to wishlist using existing `useAddRestaurant` pattern (construct `KakaoPlace` from snapshot)
3. Auto-dismiss other pending recommendations for same `kakao_place_id`: `.from('recommendations').update({ status: 'ignored', resolved_at: ... }).eq('recipient_id', userId).eq('kakao_place_id', placeId).eq('status', 'pending').neq('id', recommendationId)`
4. Invalidate: `recommendations:received`, `recommendations:unread-count`, `restaurants`

---

### 6. Ignore Recommendation

**Hook**: `useIgnoreRecommendation()`
**Supabase call**: `.from('recommendations').update({ status: 'ignored', resolved_at: new Date().toISOString() }).eq('id', recommendationId)`

**Invalidate**: `recommendations:received`, `recommendations:unread-count`

---

### 7. Mark as Read

**Hook**: `useMarkRecommendationsRead()`
**Supabase call**: `.from('recommendations').update({ is_read: true }).eq('recipient_id', userId).eq('status', 'pending').eq('is_read', false)`

**Trigger**: Called when user opens the recommendations inbox page.
**Invalidate**: `recommendations:unread-count`

---

### 8. Get Sent Recommendations (P3 — History)

**Hook**: `useSentRecommendations()`
**Supabase call**: `.from('recommendations').select('*, profiles!recommendations_recipient_id_fkey(*)').eq('sender_id', userId).order('created_at', { ascending: false })`

**Response**: `RecommendationWithRecipient[]`

---

### 9. Check If Restaurant Already Wishlisted (by recipient)

**Reuse existing**: `useIsWishlisted(kakaoPlaceId)` — already exists in `db/hooks.ts`. No new API needed.
