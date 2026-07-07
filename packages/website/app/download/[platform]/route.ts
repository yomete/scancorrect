import { NextResponse } from "next/server";

const RELEASE_API = "https://api.github.com/repos/yomete/scancorrect/releases/latest";
const FALLBACK_URL = "https://github.com/yomete/scancorrect/releases/latest";

const DOWNLOADS = {
  mac: [/\.dmg$/],
  win: [/^ScanCorrect\.Setup\..*\.exe$/],
  linux: [/\.AppImage$/],
};

type Platform = keyof typeof DOWNLOADS;
type Release = {
  html_url?: string;
  assets?: { name: string; browser_download_url: string }[];
};

const isPlatform = (platform: string): platform is Platform =>
  platform in DOWNLOADS;

const findDownload = (release: Release, platform: Platform) =>
  release.assets?.find((asset) =>
    DOWNLOADS[platform].some((pattern) => pattern.test(asset.name))
  )?.browser_download_url;

export async function GET(
  _request: Request,
  context: { params: Promise<{ platform: string }> }
) {
  const { platform } = await context.params;

  if (!isPlatform(platform)) {
    return NextResponse.redirect(FALLBACK_URL);
  }

  try {
    const response = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.redirect(FALLBACK_URL);
    }

    const release = (await response.json()) as Release;
    return NextResponse.redirect(
      findDownload(release, platform) || release.html_url || FALLBACK_URL
    );
  } catch {
    return NextResponse.redirect(FALLBACK_URL);
  }
}
