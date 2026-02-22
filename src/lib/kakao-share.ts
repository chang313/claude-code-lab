export const SERVICE_URL = "https://claude-code-lab.vercel.app";

export type ShareResult = {
  method: "kakao" | "clipboard" | "error";
  error?: string;
};

export function isKakaoShareAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.Kakao !== "undefined" &&
    typeof window.Kakao.Share !== "undefined"
  );
}

const SERVICE_IMAGE_URL = `${SERVICE_URL}/og-image.png`;

export async function shareService(): Promise<ShareResult> {
  if (isKakaoShareAvailable()) {
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: "맛집 리스트",
        description: "친구의 맛집을 함께 저장하고 공유해보세요!",
        imageUrl: SERVICE_IMAGE_URL,
        link: {
          webUrl: SERVICE_URL,
          mobileWebUrl: SERVICE_URL,
        },
      },
      buttons: [
        {
          title: "맛집 리스트 보기",
          link: {
            webUrl: SERVICE_URL,
            mobileWebUrl: SERVICE_URL,
          },
        },
      ],
    });
    return { method: "kakao" };
  }

  return copyToClipboard(SERVICE_URL);
}

export async function shareProfile(
  userId: string,
  displayName: string,
  wishlistCount: number,
): Promise<ShareResult> {
  const profileUrl = `${SERVICE_URL}/users/${userId}`;

  if (isKakaoShareAvailable()) {
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `${displayName}님의 맛집 리스트`,
        description: `저장된 맛집 ${wishlistCount}개 · 같이 둘러보세요!`,
        imageUrl: SERVICE_IMAGE_URL,
        link: {
          webUrl: profileUrl,
          mobileWebUrl: profileUrl,
        },
      },
      buttons: [
        {
          title: "맛집 리스트 보기",
          link: {
            webUrl: profileUrl,
            mobileWebUrl: profileUrl,
          },
        },
      ],
    });
    return { method: "kakao" };
  }

  return copyToClipboard(profileUrl);
}

async function copyToClipboard(url: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(url);
    return { method: "clipboard" };
  } catch (err) {
    return { method: "error", error: String(err) };
  }
}
