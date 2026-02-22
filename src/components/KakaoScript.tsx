"use client";

import { useEffect } from "react";

export default function KakaoScript() {
  useEffect(() => {
    const appkey = (process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "").trim();

    // Load Kakao Maps SDK (uses window.kakao, lowercase)
    if (!document.getElementById("kakao-maps-sdk")) {
      const mapsScript = document.createElement("script");
      mapsScript.id = "kakao-maps-sdk";
      mapsScript.type = "text/javascript";
      mapsScript.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`;
      document.head.appendChild(mapsScript);
    }

    // Load Kakao JS SDK (uses window.Kakao, uppercase) for Share API
    if (!document.getElementById("kakao-js-sdk")) {
      const jsScript = document.createElement("script");
      jsScript.id = "kakao-js-sdk";
      jsScript.src = "https://developers.kakao.com/sdk/js/kakao.min.js";
      jsScript.onload = () => {
        if (
          typeof window.Kakao !== "undefined" &&
          !window.Kakao.isInitialized()
        ) {
          window.Kakao.init(appkey);
        }
      };
      document.head.appendChild(jsScript);
    }
  }, []);

  return null;
}
