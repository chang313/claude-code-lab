import { NextResponse } from "next/server";
import { validateShareId, parseNaverBookmarks, buildNaverApiUrl, isNaverShortUrl, resolveNaverShortUrl } from "@/lib/naver";

export async function POST(request: Request) {
  let body: { shareId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_SHARE_ID", message: "유효하지 않은 공유 링크입니다." },
      { status: 400 },
    );
  }

  const rawInput = body.shareId ?? "";
  let shareId = validateShareId(rawInput);
  if (!shareId) {
    return NextResponse.json(
      { error: "INVALID_SHARE_ID", message: "유효하지 않은 공유 링크입니다." },
      { status: 400 },
    );
  }

  // naver.me short URLs need redirect resolution to get the real folder ID
  if (isNaverShortUrl(rawInput)) {
    const resolvedId = await resolveNaverShortUrl(shareId);
    if (!resolvedId) {
      return NextResponse.json(
        {
          error: "NAVER_UNAVAILABLE",
          message: "네이버 단축 URL을 확인할 수 없습니다. 링크가 유효한지 확인해주세요.",
        },
        { status: 502 },
      );
    }
    shareId = resolvedId;
  }

  const url = buildNaverApiUrl(shareId);

  let naverRes: Response;
  try {
    naverRes = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://map.naver.com/",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "NAVER_UNAVAILABLE",
        message: "네이버 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 502 },
    );
  }

  if (naverRes.status === 403) {
    return NextResponse.json(
      {
        error: "PRIVATE_FOLDER",
        message: "비공개 폴더입니다. 공개 설정 후 다시 시도해주세요.",
      },
      { status: 403 },
    );
  }

  if (!naverRes.ok) {
    return NextResponse.json(
      {
        error: "NAVER_UNAVAILABLE",
        message: "네이버 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 502 },
    );
  }

  let data: unknown;
  try {
    data = await naverRes.json();
  } catch {
    return NextResponse.json(
      {
        error: "NAVER_UNAVAILABLE",
        message: "네이버 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 502 },
    );
  }

  const resp = data as Record<string, unknown>;
  if (!resp || !Array.isArray(resp.bookmarkList)) {
    return NextResponse.json(
      {
        error: "NAVER_UNAVAILABLE",
        message: "네이버 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 502 },
    );
  }

  const allBookmarks = parseNaverBookmarks(data);

  // Filter out closed places
  const openBookmarks = allBookmarks.filter((b) => !b.closed);
  const closedCount = allBookmarks.length - openBookmarks.length;
  if (closedCount > 0) {
    const closedNames = allBookmarks.filter((b) => b.closed).map((b) => b.displayname);
    console.log(`[Naver Import] Skipping ${closedCount} closed place(s):`, closedNames);
  }

  const folder = resp.folder as Record<string, unknown> | undefined;
  const folderName =
    typeof resp.folderName === "string" ? resp.folderName :
    (folder && typeof folder.name === "string") ? folder.name : null;

  return NextResponse.json({
    bookmarks: openBookmarks.map((b) => ({
      displayname: b.displayname,
      px: b.px,
      py: b.py,
      address: b.address,
    })),
    totalCount: openBookmarks.length,
    closedCount,
    folderName,
  });
}
