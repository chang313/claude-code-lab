# Tasks: 024-logout

## Task 1: Write unit tests for logout behavior (RED)

**Priority**: P1 | **Depends on**: None

Create `tests/unit/logout.test.tsx` with tests:
1. Logout button renders when `isOwnProfile` is true
2. Logout button does NOT render when `isOwnProfile` is false
3. Clicking logout and confirming calls `supabase.auth.signOut()`
4. After successful signOut, `router.push("/login")` is called
5. When signOut fails, error toast is shown and user stays logged in
6. Button is disabled during signOut to prevent double-taps

## Task 2: Implement logout in ProfileHeader (GREEN)

**Priority**: P1 | **Depends on**: Task 1

Modify `src/components/ProfileHeader.tsx`:
- Add logout button visible only when `isOwnProfile` is true
- On click: `window.confirm("로그아웃 하시겠습니까?")`
- On confirm: call `createClient().auth.signOut()`, then `router.push("/login")`
- On error: show Toast with error message
- Loading state: disable button + show spinner during signOut

## Task 3: Verify build and tests pass

**Priority**: P1 | **Depends on**: Task 2

Run `tsc --noEmit`, `pnpm build`, `pnpm test` — all must pass.
