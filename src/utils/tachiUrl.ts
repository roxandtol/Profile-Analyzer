export const KAMAITACHI_WEB_BASE = 'https://kamai.tachi.ac';
export const KAMAITACHI_CDN_BASE = 'https://cdn-kamai.tachi.ac';

/**
 * Returns the direct Kamaitachi web URL for a specific SDVX chart.
 */
export function getKamaiChartUrl(chartID: string): string {
  return `${KAMAITACHI_WEB_BASE}/games/sdvx/charts/${encodeURIComponent(chartID)}`;
}

/**
 * Returns the direct Kamaitachi web URL for a specific SDVX song.
 */
export function getKamaiSongUrl(songID: string): string {
  return `${KAMAITACHI_WEB_BASE}/games/sdvx/songs/${encodeURIComponent(songID)}`;
}

/**
 * Returns the direct Kamaitachi CDN web URL for a user's avatar / profile picture.
 * Uses the CDN directly to avoid same-origin CORP restrictions on the API redirect endpoint.
 */
export function getKamaiUserPfpUrl(
  userIDOrName: number | string,
  customPfpLocation?: string | null
): string {
  if (customPfpLocation) {
    return `${KAMAITACHI_CDN_BASE}/users/${encodeURIComponent(userIDOrName)}/pfp-${encodeURIComponent(customPfpLocation)}`;
  }
  return `${KAMAITACHI_CDN_BASE}/users/default/pfp`;
}

/**
 * Returns the direct Kamaitachi CDN web URL for a user's banner if set.
 */
export function getKamaiUserBannerUrl(
  userIDOrName: number | string,
  customBannerLocation?: string | null
): string | null {
  if (!customBannerLocation) return null;
  return `${KAMAITACHI_CDN_BASE}/users/${encodeURIComponent(userIDOrName)}/banner-${encodeURIComponent(customBannerLocation)}`;
}

/**
 * Returns the direct web URL for a user's Kamaitachi profile.
 */
export function getKamaiUserUrl(usernameOrID: string | number): string {
  return `${KAMAITACHI_WEB_BASE}/users/${encodeURIComponent(usernameOrID)}`;
}
