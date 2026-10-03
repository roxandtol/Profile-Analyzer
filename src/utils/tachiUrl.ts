import { TachiServer } from '../api/tachiClient';

/**
 * Returns the direct Kamaitachi / Bokutachi web URL for a specific SDVX chart.
 */
export function getKamaiChartUrl(chartID: string, server: TachiServer = 'kamai'): string {
  const base = server === 'boku' ? 'https://boku.tachi.ac' : 'https://kamai.tachi.ac';
  return `${base}/games/sdvx/charts/${encodeURIComponent(chartID)}`;
}

/**
 * Returns the direct Kamaitachi / Bokutachi web URL for a specific SDVX song.
 */
export function getKamaiSongUrl(songID: string, server: TachiServer = 'kamai'): string {
  const base = server === 'boku' ? 'https://boku.tachi.ac' : 'https://kamai.tachi.ac';
  return `${base}/games/sdvx/songs/${encodeURIComponent(songID)}`;
}

/**
 * Returns the direct Kamaitachi / Bokutachi CDN web URL for a user's avatar / profile picture.
 * Uses the CDN directly to avoid same-origin CORP restrictions on the API redirect endpoint.
 */
export function getKamaiUserPfpUrl(
  userIDOrName: number | string,
  customPfpLocation?: string | null,
  server: TachiServer = 'kamai'
): string {
  const cdn = server === 'boku' ? 'https://cdn-boku.tachi.ac' : 'https://cdn-kamai.tachi.ac';
  if (customPfpLocation) {
    return `${cdn}/users/${encodeURIComponent(userIDOrName)}/pfp-${encodeURIComponent(customPfpLocation)}`;
  }
  return `${cdn}/users/default/pfp`;
}

/**
 * Returns the direct Kamaitachi / Bokutachi CDN web URL for a user's banner if set.
 */
export function getKamaiUserBannerUrl(
  userIDOrName: number | string,
  customBannerLocation?: string | null,
  server: TachiServer = 'kamai'
): string | null {
  if (!customBannerLocation) return null;
  const cdn = server === 'boku' ? 'https://cdn-boku.tachi.ac' : 'https://cdn-kamai.tachi.ac';
  return `${cdn}/users/${encodeURIComponent(userIDOrName)}/banner-${encodeURIComponent(customBannerLocation)}`;
}

/**
 * Returns the direct web URL for a user's Kamaitachi / Bokutachi profile.
 */
export function getKamaiUserUrl(usernameOrID: string | number, server: TachiServer = 'kamai'): string {
  const base = server === 'boku' ? 'https://boku.tachi.ac' : 'https://kamai.tachi.ac';
  return `${base}/users/${encodeURIComponent(usernameOrID)}`;
}
