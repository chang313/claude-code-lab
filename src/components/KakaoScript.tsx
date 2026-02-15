"use client";

import { useEffect } from "react";

export default function KakaoScript() {
  useEffect(() => {
    if (document.getElementById("kakao-sdk")) return;

    const script = document.createElement("script");
    script.id = "kakao-sdk";
    script.type = "text/javascript";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}`;
    document.head.appendChild(script);
  }, []);

  return null;
}
