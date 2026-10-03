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
