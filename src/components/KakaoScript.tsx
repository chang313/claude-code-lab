"use client";

import { useEffect } from "react";

export default function KakaoScript() {
  useEffect(() => {
    if (document.getElementById("kakao-sdk")) return;

    const script = document.createElement("script");
    script.id = "kakao-sdk";
    script.type = "text/javascript";
    const appkey = (process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "").trim();
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`;
    document.head.appendChild(script);
  }, []);

  return null;
}
