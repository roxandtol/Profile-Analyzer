import { describe, it, expect } from 'vitest';
import { getPucChartInfo, formatPucTierBadge, getPucTableUrl } from '../pucTable';
import { calculateExpectedVolforce, hasSufficientPUCDensity } from '../upscoreFeasibility';
import { generateRoadmap } from '../roadmap';
import { analyzeProfile } from '../analyzer';
import { KamaiChart, KamaiPB, KamaiSong } from '../types';

describe('PUC Tables Integration (sdvx.maya2silence.com/table)', () => {
  it('correctly retrieves official PUC metadata for Level 16, 17, 18, 19, and 20 charts', () => {
    // Level 18 - Easiest Tier 15: Akzeriyyuth MXM (ID: 16)
    const akzeriyyuth = getPucChartInfo(16, 'MXM');
    expect(akzeriyyuth).toBeDefined();
    expect(akzeriyyuth?.constant).toBe(18.0);
    expect(akzeriyyuth?.tierLabel).toBe('Tier 15');
    expect(akzeriyyuth?.tableSlug).toBe('18p');
    expect(akzeriyyuth?.easeScore).toBe(10);
    expect(formatPucTierBadge(akzeriyyuth!)).toBe('Tier 15 (18.0)');

    // Level 18 - Hardest Tier 1: Quaint Echo EXH (ID: 226)
    const quaintEcho = getPucChartInfo(226, 'EXH');
    expect(quaintEcho).toBeDefined();
    expect(quaintEcho?.constant).toBe(18.8);
    expect(quaintEcho?.tierLabel).toBe('Tier 1');
    expect(quaintEcho?.tableSlug).toBe('18p');
    expect(quaintEcho?.easeScore).toBe(1);

    // Level 19 - Easiest Tier 0 (label 0): Electronic Sports Complex MXM (ID: 2432)
    const esc = getPucChartInfo(2432, 'MXM');
    expect(esc).toBeDefined();
    expect(esc?.constant).toBe(19.0);
    expect(esc?.tierLabel).toBe('0');
    expect(esc?.tableSlug).toBe('19p');
    expect(esc?.easeScore).toBe(10);

    // Level 20: MAYHEM MXM (ID: 562)
    const mayhem = getPucChartInfo(562, 'MXM');
    expect(mayhem).toBeDefined();
    expect(mayhem?.constant).toBe(20.0);
    expect(mayhem?.tableSlug).toBe('20p');

    // Title fallback lookup
    const byTitle = getPucChartInfo(undefined, 'MXM', 'Akzeriyyuth');
    expect(byTitle).toBeDefined();
    expect(byTitle?.constant).toBe(18.0);

    // URL generator
    expect(getPucTableUrl('18p')).toBe('https://sdvx.maya2silence.com/table/18p/tier');
  });

  it('calculates lower expected Volforce threshold for easy PUC tiers compared to boss PUC tiers', () => {
    const easyChart: KamaiChart = {
      chartID: 'c-easy-18',
      difficulty: 'MXM',
      level: '18',
      levelNum: 18.0,
      data: {
        inGameID: 16, // Akzeriyyuth (Tier 15, 18.0 constant)
      },
    };

    const hardChart: KamaiChart = {
      chartID: 'c-hard-18',
      difficulty: 'EXH',
      level: '18',
      levelNum: 18.8,
      data: {
        inGameID: 226, // Quaint Echo (Tier 1, 18.8 constant)
      },
    };

    const expectedEasy = calculateExpectedVolforce(18.0, undefined, 'S', false, 'PERFECT ULTIMATE CHAIN', easyChart);
    const expectedHard = calculateExpectedVolforce(18.8, undefined, 'S', false, 'PERFECT ULTIMATE CHAIN', hardChart);

    // Easy Tier 15 PUC has significantly lower barrier than Tier 1 PUC
    expect(expectedEasy).toBeLessThan(expectedHard);
    expect(expectedHard - expectedEasy).toBeGreaterThanOrEqual(1.0);

    // A 19.5 VF player has sufficient PUC density for easy 18s but not hardest 18s
    expect(hasSufficientPUCDensity(19.5, easyChart)).toBe(true);
  });

  it('supports PERFECT ULTIMATE CHAIN as target lamp in roadmap generation', () => {
    const pucFarmable = {
      id: 'f-puc-18',
      chart: {
        chartID: 'c-puc-18',
        difficulty: 'MXM' as const,
        level: '18',
        levelNum: 18.0,
        data: { inGameID: 16 }, // Akzeriyyuth (Tier 15)
      },
      song: { id: 's-18', title: 'Akzeriyyuth', artist: 'Team Grimoire' },
      levelNum: 18.0,
      difficulty: 'MXM' as const,
      individualDifference: false,
      projectedScore: 10_000_000,
      projectedLamp: 'PERFECT ULTIMATE CHAIN' as const,
      projectedVF: 0.415, // 18 * 2 * 1.0 * 105 * 110 / 10000 = 0.4158 -> 0.415 VF
      netVFGain: 0.050,
      farmabilityScore: 300,
      isPlayed: false,
      primaryAdvantage: 'PUC 10m Goal',
      pucTier: { text: 'Tier 15 (18.0)', value: 18.0 },
      pucConstant: 18.0,
      feasibility: {
        expectedPlayerVF: 19.0,
        userVF: 19.5,
        vfFitDelta: 0.5,
        feasibilityPercent: 85,
        feasibilityTier: 'VERY_HIGH' as const,
        label: 'Very High',
        explanation: 'PUC goal',
      },
    };

    const roadmap = generateRoadmap(
      19.000,
      19.050,
      [],
      [pucFarmable],
      'vf6',
      'most-feasible',
      'PERFECT ULTIMATE CHAIN',
    );

    expect(roadmap.length).toBe(1);
    expect(roadmap[0].targetLamp).toBe('PERFECT ULTIMATE CHAIN');
    expect(roadmap[0].targetScore).toBe(10_000_000);
    expect(roadmap[0].chartVF).toBe(0.415);
    expect(roadmap[0].pucTierText).toBe('Tier 15 (18.0)');
  });

  it('generates PUC upgrade opportunities for profiles with near-PUC plays', () => {
    const mockPB: KamaiPB = {
      chartID: 'c-akzeri',
      songID: 's-akzeri',
      userID: 1,
      scoreData: {
        score: 9_960_000,
        lamp: 'ULTIMATE CHAIN',
        grade: 'S',
      },
      calculatedData: {
        VF6: 0.392,
      },
    };

    const mockChart: KamaiChart = {
      chartID: 'c-akzeri',
      difficulty: 'MXM',
      level: '18',
      levelNum: 18.0,
      data: {
        inGameID: 16,
      },
    };

    const mockSong: KamaiSong = {
      id: 's-akzeri',
      title: 'Akzeriyyuth',
      artist: 'Team Grimoire',
    };

    const result = analyzeProfile([mockPB], [mockChart], [mockSong], { version: 'vf6', enablePUC: true });
    const pucUpgrade = result.upscores.find((u) => u.targetLamp === 'PERFECT ULTIMATE CHAIN');

    expect(pucUpgrade).toBeDefined();
    expect(pucUpgrade?.targetScore).toBe(10_000_000);
    expect(pucUpgrade?.targetVF).toBe(0.415);
    expect(pucUpgrade?.pucTierText).toBe('Tier 15 (18.0)');

    // In legacy mode (enablePUC: false), PUC upgrades are omitted
    const legacyResult = analyzeProfile([mockPB], [mockChart], [mockSong], { version: 'vf6', enablePUC: false });
    const legacyPucUpgrade = legacyResult.upscores.find((u) => u.targetLamp === 'PERFECT ULTIMATE CHAIN');
    expect(legacyPucUpgrade).toBeUndefined();
  });
});
