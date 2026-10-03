import { describe, it, expect } from 'vitest';
import { analyzeProfile } from '../analyzer';
import { KamaiChart, KamaiPB, KamaiSong } from '../types';

describe('Profile Analyzer & Upscore Detection', () => {
  const songs: KamaiSong[] = [
    { id: 's1', title: 'Song 1', artist: 'Artist 1' },
    { id: 's2', title: 'Song 2', artist: 'Artist 2' },
  ];

  const charts: KamaiChart[] = [
    { chartID: 'c1', songID: 's1', difficulty: 'MXM', level: '18', levelNum: 18.5 },
    { chartID: 'c2', songID: 's2', difficulty: 'EXH', level: '18', levelNum: 18.0 },
  ];

  it('detects near-S upscore opportunity (e.g. 9.885m score)', () => {
    const pbs: KamaiPB[] = [
      {
        chartID: 'c1',
        songID: 's1',
        userID: 1,
        scoreData: {
          score: 9_885_000,
          lamp: 'CLEAR',
          grade: 'AAA+',
        },
        calculatedData: {},
      },
    ];

    const result = analyzeProfile(pbs, charts, songs, 'vf7');
    expect(result.upscores.length).toBeGreaterThan(0);
    const nearS = result.upscores.find((u) => u.category === 'near-s');
    expect(nearS).toBeDefined();
    expect(nearS?.targetScore).toBe(9_900_000);
    expect(nearS?.targetGrade).toBe('S');
    expect(nearS?.netVFGain).toBeGreaterThan(0);
  });

  it('detects lamp upgrade opportunity on S rank with normal CLEAR', () => {
    const pbs: KamaiPB[] = [
      {
        chartID: 'c2',
        songID: 's2',
        userID: 1,
        scoreData: {
          score: 9_910_000,
          lamp: 'CLEAR',
          grade: 'S',
        },
        calculatedData: {},
      },
    ];

    const result = analyzeProfile(pbs, charts, songs, 'vf7');
    const lampUpgrade = result.upscores.find((u) => u.category === 'lamp-upgrade');
    expect(lampUpgrade).toBeDefined();
    expect(lampUpgrade?.targetLamp).toBe('EXCESSIVE CLEAR');
    expect(lampUpgrade?.netVFGain).toBeGreaterThan(0);
  });

  it('always jumps from EXCESSIVE CLEAR to MAXXIVE CLEAR for lamp upgrade', () => {
    const pbs: KamaiPB[] = [
      {
        chartID: 'c1',
        songID: 's1',
        userID: 1,
        scoreData: {
          score: 9_920_000,
          lamp: 'EXCESSIVE CLEAR',
          grade: 'S',
        },
        calculatedData: {},
      },
    ];

    const result = analyzeProfile(pbs, charts, songs, 'vf7');
    const maxxiveUpgrade = result.upscores.find(
      (u) => u.category === 'lamp-upgrade' && u.targetLamp === 'MAXXIVE CLEAR',
    );
    expect(maxxiveUpgrade).toBeDefined();
    expect(maxxiveUpgrade?.targetLamp).toBe('MAXXIVE CLEAR');
    expect(maxxiveUpgrade?.description).toContain('Maxxive Clear (104%)');
    expect(maxxiveUpgrade?.netVFGain).toBeGreaterThan(0);
  });

  it('detects Ultimate Chain (UC) upgrade on S rank with EXCESSIVE CLEAR only when UC density is sufficient', () => {
    const pbs: KamaiPB[] = [
      {
        chartID: 'c1',
        songID: 's1',
        userID: 1,
        scoreData: {
          score: 9_920_000,
          lamp: 'EXCESSIVE CLEAR',
          grade: 'S',
        },
        calculatedData: {},
      },
    ];

    const result = analyzeProfile(pbs, charts, songs, 'vf7');
    const ucUpgrade = result.upscores.find(
      (u) => u.category === 'lamp-upgrade' && u.targetLamp === 'ULTIMATE CHAIN',
    );
    expect(ucUpgrade).toBeDefined();
    expect(ucUpgrade?.targetLamp).toBe('ULTIMATE CHAIN');
    expect(ucUpgrade?.netVFGain).toBeGreaterThan(0);
    expect(ucUpgrade?.feasibility?.explanation).toContain('0 misses');
  });

  it('does NOT recommend UC on high Level 19 chart where UC density is insufficient for the player VF range', () => {
    const chartLvl19: KamaiChart = {
      chartID: 'c-lvl19',
      songID: 's1',
      difficulty: 'MXM',
      level: '19',
      levelNum: 19.5,
      data: { sTier: { text: 'T3', value: 19.5 } },
    };

    const chartLvl18: KamaiChart = {
      chartID: 'c-fill',
      songID: 's1',
      difficulty: 'MXM',
      level: '18',
      levelNum: 18.7,
      data: { sTier: { text: 'T6', value: 18.7 } },
    };

    // Realistic 19.9 VF player (50 scores around 18.7 S-ranks)
    const pbs: KamaiPB[] = [
      {
        chartID: 'c-lvl19',
        songID: 's1',
        userID: 1,
        scoreData: {
          score: 9_910_000,
          lamp: 'EXCESSIVE CLEAR',
          grade: 'S' as const,
        },
        calculatedData: {},
      },
      ...Array.from({ length: 49 }, (_, i) => ({
        chartID: `c-fill-${i}`,
        songID: 's1',
        userID: 1,
        scoreData: {
          score: 9_900_000,
          lamp: 'EXCESSIVE CLEAR' as const,
          grade: 'S' as const,
        },
        calculatedData: {},
      })),
    ];

    const allTestCharts = [
      chartLvl19,
      ...Array.from({ length: 49 }, (_, i) => ({
        ...chartLvl18,
        chartID: `c-fill-${i}`,
      })),
    ];

    const result = analyzeProfile(pbs, allTestCharts, songs, 'vf7');

    // Should recommend MAXXIVE CLEAR (+2% boost) on the 19.5 chart
    const maxxiveUpgrade = result.upscores.find(
      (u) => u.chart.chartID === 'c-lvl19' && u.targetLamp === 'MAXXIVE CLEAR',
    );
    expect(maxxiveUpgrade).toBeDefined();

    // Should NOT recommend UC on the 19.5 chart because ~19.9 VF players do not have UCs on 19.5s
    const ucUpgrade = result.upscores.find(
      (u) => u.chart.chartID === 'c-lvl19' && u.targetLamp === 'ULTIMATE CHAIN',
    );
    expect(ucUpgrade).toBeUndefined();
  });
});
