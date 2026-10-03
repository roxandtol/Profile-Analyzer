import {
  KamaiChart,
  KamaiFolderResponse,
  KamaiPBsResponse,
  KamaiSong,
  KamaiUserProfileResponse,
} from '../core/types';

export type TachiServer = 'kamai' | 'boku';

export interface TachiClientConfig {
  server?: TachiServer;
  apiKey?: string;
}

const SERVER_BASE_URLS: Record<TachiServer, string> = {
  kamai: 'https://kamai.tachi.ac/api/v1',
  boku: 'https://boku.tachi.ac/api/v1',
};

// Memory cache fallback for CLI or browser
const MEMORY_CACHE = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string): T | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = localStorage.getItem(`tachi_cache_${key}`);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expiry) {
        localStorage.removeItem(`tachi_cache_${key}`);
        return null;
      }
      return parsed.data as T;
    }
  } catch {
    // ignore
  }

  const mem = MEMORY_CACHE.get(key);
  if (mem && Date.now() < mem.expiry) {
    return mem.data as T;
  }
  return null;
}

function setCached(key: string, data: any, ttlMs: number): void {
  const expiry = Date.now() + ttlMs;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(
        `tachi_cache_${key}`,
        JSON.stringify({ data, expiry }),
      );
      return;
    }
  } catch {
    // ignore storage quota issues
  }
  MEMORY_CACHE.set(key, { data, expiry });
}

export class TachiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: TachiClientConfig = {}) {
    const server = config.server || 'kamai';
    this.baseUrl = SERVER_BASE_URLS[server] || SERVER_BASE_URLS.kamai;
    this.apiKey = config.apiKey;
  }

  private async fetchApi<T>(path: string, options: { useCache?: boolean; cacheTtlMs?: number } = {}): Promise<T> {
    const cacheKey = `${this.baseUrl}${path}`;
    if (options.useCache) {
      const cached = getCached<T>(cacheKey);
      if (cached) return cached;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { headers });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Resource not found (404) at ${path}. Please check the username/id.`);
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Unauthorized (403/401). If this profile is private, please provide a Kamaitachi API token.`,
        );
      }
      throw new Error(`API error HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.description || 'Kamaitachi API request failed.');
    }

    const body = json.body as T;

    if (options.useCache && options.cacheTtlMs) {
      setCached(cacheKey, body, options.cacheTtlMs);
    }

    return body;
  }

  /**
   * Fetch a user's general SDVX statistics and ratings.
   */
  async getUserProfile(usernameOrId: string): Promise<KamaiUserProfileResponse> {
    return this.fetchApi<KamaiUserProfileResponse>(
      `/users/${encodeURIComponent(usernameOrId)}/games/sdvx`,
      { useCache: true, cacheTtlMs: 2 * 60 * 1000 }, // 2 minutes
    );
  }

  /**
   * Fetch all personal bests for this user on SDVX.
   */
  async getUserAllPBs(usernameOrId: string): Promise<KamaiPBsResponse> {
    return this.fetchApi<KamaiPBsResponse>(
      `/users/${encodeURIComponent(usernameOrId)}/games/sdvx/pbs/all`,
      { useCache: true, cacheTtlMs: 5 * 60 * 1000 }, // 5 minutes
    );
  }

  /**
   * Fetch a user's best 100 personal bests sorted by VF.
   */
  async getUserBestPBs(usernameOrId: string, alg: 'VF6' | 'VF7' = 'VF6'): Promise<KamaiPBsResponse> {
    return this.fetchApi<KamaiPBsResponse>(
      `/users/${encodeURIComponent(usernameOrId)}/games/sdvx/pbs/best?alg=${alg}`,
      { useCache: true, cacheTtlMs: 5 * 60 * 1000 },
    );
  }

  /**
   * Fetch charts in a level folder (e.g. '18-nabla', '17-nabla', '19-nabla').
   */
  async getLevelFolder(usernameOrId: string, folderSlug: string): Promise<KamaiFolderResponse> {
    return this.fetchApi<KamaiFolderResponse>(
      `/users/${encodeURIComponent(usernameOrId)}/games/sdvx/folders/${encodeURIComponent(folderSlug)}`,
      { useCache: true, cacheTtlMs: 24 * 60 * 60 * 1000 }, // 24 hours
    );
  }

  /**
   * Fetch all charts across viable level folders (e.g. 17, 18, 19).
   */
  async getMultiLevelCharts(
    usernameOrId: string,
    levels: number[],
  ): Promise<{ charts: KamaiChart[]; songs: KamaiSong[] }> {
    const allCharts: KamaiChart[] = [];
    const allSongs: KamaiSong[] = [];
    const seenChartIDs = new Set<string>();
    const seenSongIDs = new Set<string>();

    for (const lvl of levels) {
      // Try nabla first, fallback to exceed
      try {
        const folder = await this.getLevelFolder(usernameOrId, `${lvl}-nabla`);
        for (const c of folder.charts) {
          if (!seenChartIDs.has(c.chartID)) {
            seenChartIDs.add(c.chartID);
            allCharts.push(c);
          }
        }
        for (const s of folder.songs) {
          if (!seenSongIDs.has(s.id)) {
            seenSongIDs.add(s.id);
            allSongs.push(s);
          }
        }
      } catch (err) {
        console.warn(`Could not load ${lvl}-nabla folder, trying ${lvl}-exceed`, err);
        try {
          const folder = await this.getLevelFolder(usernameOrId, `${lvl}-exceed`);
          for (const c of folder.charts) {
            if (!seenChartIDs.has(c.chartID)) {
              seenChartIDs.add(c.chartID);
              allCharts.push(c);
            }
          }
          for (const s of folder.songs) {
            if (!seenSongIDs.has(s.id)) {
              seenSongIDs.add(s.id);
              allSongs.push(s);
            }
          }
        } catch {
          // ignore if level folder fails
        }
      }
    }

    return { charts: allCharts, songs: allSongs };
  }
}
