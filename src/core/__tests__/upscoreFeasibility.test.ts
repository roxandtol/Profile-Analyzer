import { describe, it, expect } from 'vitest';
import {
  calculateExpectedVolforce,
  calculateUpscoreFeasibility,
  hasSufficientUCDensity,
} from '../upscoreFeasibility';
import { isChartInVersion } from '../versionFilter';
import { KamaiChart } from '../types';

describe('Volforce-Calibrated Upscore Feasibility (Tachi Datasets)', () => {
  it('calculates expected player Volforce adjusting for community tiers', () => {
    // Level 18 with T10 (very easy S) reduces expected VF
    const expectedT10 = calculateExpectedVolforce(18.0, 'T10', 'S', false);
    // Level 18 with T1 (very hard S) increases expected VF
    const expectedT1 = calculateExpectedVolforce(18.0, 'T1', 'S', false);

    expect(expectedT10).toBeLessThan(18.5);
    expect(expectedT1).toBeGreaterThan(18.5);
    expect(expectedT1).toBeGreaterThan(expectedT10);
  });

  it('rates high feasibility for an upscore within user Volforce bracket', () => {
    const chart: KamaiChart = {
      chartID: 'c-easy',
      difficulty: 'EXH',
      level: '18',
      levelNum: 18.0,
      data: { sTier: { text: 'T9', value: 18.0 } },
    };

    // User is 18.5 VF (Eldora III), currently has 9,885,000 (only 15k away from S)
    const result = calculateUpscoreFeasibility(18.5, chart, 9_885_000, 9_900_000, 'S');

    expect(result.feasibilityTier).toBe('VERY_HIGH');
    expect(result.feasibilityPercent).toBeGreaterThanOrEqual(80);
    expect(result.vfFitDelta).toBeGreaterThan(0);
  });

  it('rates hard/stretch feasibility when chart difficulty significantly exceeds user Volforce', () => {
    const chart: KamaiChart = {
      chartID: 'c-hard',
      difficulty: 'MXM',
      level: '19',
      levelNum: 19.5,
      data: { sTier: { text: 'T1', value: 19.8 } },
    };

    // User is only 16.0 VF (Coral I), trying to S-rank a 19.5 T1 boss chart
    const result = calculateUpscoreFeasibility(16.0, chart, 9_700_000, 9_900_000, 'S');

    expect(result.feasibilityTier).toBe('HARD');
    expect(result.feasibilityPercent).toBeLessThan(45);
    expect(result.vfFitDelta).toBeLessThan(0);
  });

  it('determines sufficient UC density based on chart level and user Volforce', () => {
    const chart18: KamaiChart = {
      chartID: 'c18',
      difficulty: 'EXH',
      level: '18',
      levelNum: 18.0,
      data: { sTier: { text: 'T8', value: 18.0 } },
    };

    const chart19: KamaiChart = {
      chartID: 'c19',
      difficulty: 'MXM',
      level: '19',
      levelNum: 19.5,
      data: { sTier: { text: 'T3', value: 19.5 } },
    };

    // User at ~19.9 VF (Crimson IV / close to Imperial I)
    // In Tachi dataset, players around 19.9 frequently have UCs on 18s, but almost none on 19.5s
    expect(hasSufficientUCDensity(19.9, chart18)).toBe(true);
    expect(hasSufficientUCDensity(19.9, chart19)).toBe(false);

    // High Imperial player (20.7 VF) has sufficient UC density for the 19.5
    expect(hasSufficientUCDensity(20.7, chart19)).toBe(true);
  });
});

describe('Version Filtering (Exceed Gear & Konaste)', () => {
  const chartExceedAndKonaste: KamaiChart = {
    chartID: 'c1',
    difficulty: 'MXM',
    level: '18',
    levelNum: 18.0,
    versions: ['booth', 'exceed', 'konaste'],
  };

  const chartExceedOnly: KamaiChart = {
    chartID: 'c2',
    difficulty: 'MXM',
    level: '18',
    levelNum: 18.0,
    versions: ['exceed'],
  };

  const chartNablaOnly: KamaiChart = {
    chartID: 'c3',
    difficulty: 'MXM',
    level: '18',
    levelNum: 18.0,
    versions: ['nabla'],
  };

  it('filters charts by Exceed Gear version', () => {
    expect(isChartInVersion(chartExceedAndKonaste, 'exceed')).toBe(true);
    expect(isChartInVersion(chartExceedOnly, 'exceed')).toBe(true);
    expect(isChartInVersion(chartNablaOnly, 'exceed')).toBe(false);
  });

  it('filters charts by Konaste version', () => {
    expect(isChartInVersion(chartExceedAndKonaste, 'konaste')).toBe(true);
    expect(isChartInVersion(chartExceedOnly, 'konaste')).toBe(false);
    expect(isChartInVersion(chartNablaOnly, 'konaste')).toBe(false);
  });

  it('allows all charts when version filter is all', () => {
    expect(isChartInVersion(chartNablaOnly, 'all')).toBe(true);
  });
});
