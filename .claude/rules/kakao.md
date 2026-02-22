# Kakao Integration Rules

## Maps SDK
- SDK does server-side domain validation; `http://localhost:3000` must be registered in Kakao Developer Console → Platform → Web → Site Domain.
- Diagnose domain issues: `curl -s -o /dev/null -w "%{http_code}" "https://dapi.kakao.com/v2/maps/sdk.js?appkey=KEY&autoload=false" -H "Referer: http://localhost:3000/"` — 401 means domain not registered.

## OAuth
- Each deployment domain needs its callback URL registered in BOTH Supabase Auth AND Kakao Developer Console.
- Missing Kakao redirect URI causes login to hang silently after the OAuth redirect.

## Share API
- Kakao JS SDK (`window.Kakao`, uppercase) is separate from Maps SDK (`window.kakao`, lowercase). Load from `developers.kakao.com/sdk/js/kakao.min.js`. Same app key as Maps SDK — safe to dual-load.
- Init in `onload` callback: `if (!window.Kakao.isInitialized()) window.Kakao.init(appkey)` — guards against HMR double-init.
- Share call: `Kakao.Share.sendDefault({ objectType: "feed", content: { title, description, imageUrl, link }, buttons })`.
- Guard before calling: `typeof window.Kakao !== "undefined" && typeof window.Kakao.Share !== "undefined"`.
- Fallback to `navigator.clipboard.writeText(url)` when SDK unavailable (non-Kakao browser, SSR, SDK not loaded yet).
