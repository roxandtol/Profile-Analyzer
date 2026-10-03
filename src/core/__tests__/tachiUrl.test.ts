import { describe, it, expect } from 'vitest';
import {
  getKamaiChartUrl,
  getKamaiSongUrl,
  getKamaiUserPfpUrl,
  getKamaiUserUrl,
} from '../../utils/tachiUrl';

describe('Kamaitachi URL Generator', () => {
  it('generates correct Kamaitachi chart URLs', () => {
    const url = getKamaiChartUrl('C19d35e11aa412da5c77', 'kamai');
    expect(url).toBe('https://kamai.tachi.ac/games/sdvx/charts/C19d35e11aa412da5c77');
  });

  it('generates correct Bokutachi chart URLs', () => {
    const url = getKamaiChartUrl('C19d35e11aa412da5c77', 'boku');
    expect(url).toBe('https://boku.tachi.ac/games/sdvx/charts/C19d35e11aa412da5c77');
  });

  it('generates correct song URLs', () => {
    const url = getKamaiSongUrl('S19d35e0df253ce24a2a', 'kamai');
    expect(url).toBe('https://kamai.tachi.ac/games/sdvx/songs/S19d35e0df253ce24a2a');
  });

  it('generates correct user pfp URLs', () => {
    const defaultPfp = getKamaiUserPfpUrl(1136, null, 'kamai');
    expect(defaultPfp).toBe('https://cdn-kamai.tachi.ac/users/default/pfp');

    const customPfp = getKamaiUserPfpUrl(1136, 'a2d1db9d9f1b', 'kamai');
    expect(customPfp).toBe('https://cdn-kamai.tachi.ac/users/1136/pfp-a2d1db9d9f1b');

    const bokuCustomPfp = getKamaiUserPfpUrl('roxandtol', 'hash123', 'boku');
    expect(bokuCustomPfp).toBe('https://cdn-boku.tachi.ac/users/roxandtol/pfp-hash123');
  });

  it('generates correct user profile web URLs', () => {
    const userUrl = getKamaiUserUrl('roxandtol', 'kamai');
    expect(userUrl).toBe('https://kamai.tachi.ac/users/roxandtol');
  });
});
