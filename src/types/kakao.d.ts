// Type declarations for the Kakao JS SDK (window.Kakao, uppercase K)
// Separate from Kakao Maps SDK (window.kakao, lowercase k)

interface KakaoShareLink {
  webUrl: string;
  mobileWebUrl: string;
}

interface KakaoShareButton {
  title: string;
  link: KakaoShareLink;
}

interface KakaoFeedMessage {
  objectType: "feed";
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: KakaoShareLink;
  };
  buttons?: KakaoShareButton[];
}

interface KakaoShare {
  sendDefault(message: KakaoFeedMessage): void;
}

interface KakaoStatic {
  init(appKey: string): void;
  isInitialized(): boolean;
  Share: KakaoShare;
}

declare global {
  interface Window {
    Kakao: KakaoStatic;
  }
}

export {};
