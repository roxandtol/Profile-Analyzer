import { describe, it, expect } from 'vitest';
import { getKamaiChartUrl, getKamaiSongUrl } from '../../utils/tachiUrl';

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
});
