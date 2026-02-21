# Kakao Integration Rules

## Maps SDK
- SDK does server-side domain validation; `http://localhost:3000` must be registered in Kakao Developer Console → Platform → Web → Site Domain.
- Diagnose domain issues: `curl -s -o /dev/null -w "%{http_code}" "https://dapi.kakao.com/v2/maps/sdk.js?appkey=KEY&autoload=false" -H "Referer: http://localhost:3000/"` — 401 means domain not registered.

## OAuth
- Each deployment domain needs its callback URL registered in BOTH Supabase Auth AND Kakao Developer Console.
- Missing Kakao redirect URI causes login to hang silently after the OAuth redirect.
