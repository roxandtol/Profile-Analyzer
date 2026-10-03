import { describe, it, expect } from 'vitest';
import { findFarmables } from '../farmable';
import { KamaiChart, KamaiSong } from '../types';

describe('Farmable Recommendations (VF7 vs VF6 Prioritization)', () => {
  const songsMap = new Map<string, KamaiSong>();
  songsMap.set('s1', { id: 's1', title: 'High Decimal Song', artist: 'Artist A' });
  songsMap.set('s2', { id: 's2', title: 'Low Decimal Song', artist: 'Artist B' });

  const chartHighDecimal: KamaiChart = {
    chartID: 'c1',
    songID: 's1',
    difficulty: 'MXM',
    level: '18',
    levelNum: 18.7, // High decimal levelNum
    data: {
      sTier: { text: 'T4', value: 18.7, individualDifference: false },
    },
  };

  const chartLowDecimalEasyTier: KamaiChart = {
    chartID: 'c2',
    songID: 's2',
    difficulty: 'EXH',
    level: '18',
    levelNum: 18.1, // Low decimal levelNum
    data: {
      sTier: { text: 'T10', value: 18.0, individualDifference: false }, // Very easy community tier
    },
  };

  it('in VF7 mode, prioritizes decimal levelNum as the main driver for VF gain', () => {
    // Cutoff is 0.350
    const results = findFarmables(
      [chartLowDecimalEasyTier, chartHighDecimal],
      songsMap,
      {
        version: 'vf7',
        top50Cutoff: 0.350,
        top50ChartIDs: new Set(),
        existingPBsMap: new Map(),
      },
    );

    expect(results.length).toBe(2);
    // In VF7, the 18.7 chart yields significantly higher net VF gain than the 18.1 chart
    expect(results[0].chart.chartID).toBe('c1');
    expect(results[0].levelNum).toBe(18.7);
    expect(results[0].netVFGain).toBeGreaterThan(results[1].netVFGain);
  });

  it('in VF6 mode, prioritizes community tierlist ease among identical integer levels', () => {
    const results = findFarmables(
      [chartHighDecimal, chartLowDecimalEasyTier],
      songsMap,
      {
        version: 'vf6',
        top50Cutoff: 0.350,
        top50ChartIDs: new Set(),
        existingPBsMap: new Map(),
      },
    );

    expect(results.length).toBe(2);
    // In VF6, both charts are floored to 18 so net VF gain is identical.
    // The community tierlist T10 ranks higher than T4!
    expect(results[0].chart.chartID).toBe('c2');
    expect(results[0].sTier?.text).toBe('T10');
  });

  it('supports targeting Ultimate Chain (UC) lamp for farmables', () => {
    const results = findFarmables(
      [chartHighDecimal],
      songsMap,
      {
        version: 'vf7',
        top50Cutoff: 0.350,
        top50ChartIDs: new Set(),
        existingPBsMap: new Map(),
        targetLamp: 'ULTIMATE CHAIN',
      },
    );

    expect(results.length).toBe(1);
    expect(results[0].projectedLamp).toBe('ULTIMATE CHAIN');
    expect(results[0].primaryAdvantage).toContain('S + UC');
    // UC has 106 coef in VF7 vs 102 for excessive
    expect(results[0].projectedVF).toBeGreaterThan(0.380);
  });
});
