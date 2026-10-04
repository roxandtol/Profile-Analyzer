import { describe, it, expect } from 'vitest';
import { generateRoadmap } from '../roadmap';
import { FarmableOpportunity, UpscoreOpportunity } from '../types';

describe('Roadmap Generator Strategies & Feasibility Priority', () => {
  const mockUpscores: UpscoreOpportunity[] = [
    {
      id: 'u1',
      chart: { chartID: 'c1', difficulty: 'EXH', level: '16', levelNum: 16.0 },
      song: { id: 's1', title: 'Easy Near S', artist: 'Artist 1' },
      currentScore: 9_880_000,
      currentLamp: 'CLEAR',
      currentGrade: 'AAA+',
      currentVF: 0.310,
      targetScore: 9_900_000,
      targetLamp: 'EXCESSIVE CLEAR',
      targetGrade: 'S',
      targetVF: 0.340,
      netVFGain: 0.030,
      category: 'near-s',
      description: 'Quick win near S',
      effortRating: 1,
      levelNum: 16.0,
      feasibility: {
        expectedPlayerVF: 16.0,
        userVF: 16.2,
        vfFitDelta: 0.2,
        feasibilityPercent: 88,
        feasibilityTier: 'VERY_HIGH',
        label: 'Very High',
        explanation: 'Very close to S',
      },
    },
    {
      id: 'u2',
      chart: { chartID: 'c2', difficulty: 'MXM', level: '17', levelNum: 17.5 },
      song: { id: 's2', title: 'Moderate Upscore', artist: 'Artist 2' },
      currentScore: 9_760_000,
      currentLamp: 'CLEAR',
      currentGrade: 'AAA',
      currentVF: 0.320,
      targetScore: 9_900_000,
      targetLamp: 'EXCESSIVE CLEAR',
      targetGrade: 'S',
      targetVF: 0.370,
      netVFGain: 0.050,
      category: 'near-aaa-plus',
      description: 'Moderate push',
      effortRating: 3,
      levelNum: 17.5,
      feasibility: {
        expectedPlayerVF: 17.5,
        userVF: 16.2,
        vfFitDelta: -1.3,
        feasibilityPercent: 62,
        feasibilityTier: 'CHALLENGING',
        label: 'Challenging',
        explanation: 'Challenging milestone',
      },
    },
  ];

  const mockFarmables: FarmableOpportunity[] = [
    {
      id: 'f1',
      chart: { chartID: 'c3', difficulty: 'MXM', level: '19', levelNum: 19.8 },
      song: { id: 's3', title: 'Hard 19 Farmable', artist: 'Artist 3' },
      levelNum: 19.8,
      difficulty: 'MXM',
      individualDifference: false,
      projectedScore: 9_900_000,
      projectedLamp: 'EXCESSIVE CLEAR',
      projectedVF: 0.420,
      netVFGain: 0.110,
      farmabilityScore: 300,
      isPlayed: false,
      primaryAdvantage: 'High Net Gain',
      feasibility: {
        expectedPlayerVF: 20.0,
        userVF: 16.2,
        vfFitDelta: -3.8,
        feasibilityPercent: 20,
        feasibilityTier: 'HARD',
        label: 'Hard',
        explanation: 'Difficult reach chart',
      },
    },
    {
      id: 'f2',
      chart: { chartID: 'c4', difficulty: 'MXM', level: '17', levelNum: 17.2 },
      song: { id: 's4', title: 'Feasible 17 Farmable', artist: 'Artist 4' },
      levelNum: 17.2,
      difficulty: 'MXM',
      individualDifference: false,
      projectedScore: 9_900_000,
      projectedLamp: 'EXCESSIVE CLEAR',
      projectedVF: 0.365,
      netVFGain: 0.035,
      farmabilityScore: 180,
      isPlayed: false,
      primaryAdvantage: 'Feasible Clear',
      feasibility: {
        expectedPlayerVF: 17.0,
        userVF: 16.2,
        vfFitDelta: -0.8,
        feasibilityPercent: 75,
        feasibilityTier: 'MODERATE',
        label: 'Moderate',
        explanation: 'Very accessible',
      },
    },
    {
      id: 'f3',
      chart: { chartID: 'c5', difficulty: 'EXH', level: '17', levelNum: 17.0 },
      song: { id: 's5', title: 'Alternative 17 Farmable', artist: 'Artist 5' },
      levelNum: 17.0,
      difficulty: 'EXH',
      individualDifference: false,
      projectedScore: 9_900_000,
      projectedLamp: 'EXCESSIVE CLEAR',
      projectedVF: 0.360,
      netVFGain: 0.032,
      farmabilityScore: 170,
      isPlayed: false,
      primaryAdvantage: 'Alternative Chart',
      feasibility: {
        expectedPlayerVF: 16.8,
        userVF: 16.2,
        vfFitDelta: -0.6,
        feasibilityPercent: 72,
        feasibilityTier: 'MODERATE',
        label: 'Moderate',
        explanation: 'Very accessible alternative',
      },
    },
  ];

  it('most-feasible strategy prioritizes highest feasibility charts over pure net gain', () => {
    const roadmap = generateRoadmap(
      16.200,
      16.250,
      mockUpscores,
      mockFarmables,
      'vf7',
      'most-feasible',
    );

    expect(roadmap.length).toBeGreaterThan(0);
    // Step 1 should be the 88% feasible upscore (u1)
    expect(roadmap[0].chart.chartID).toBe('c1');
    expect(roadmap[0].feasibility?.feasibilityPercent).toBe(88);

    // Step 2 should be the 75% feasible chart (c4), NOT the 20% feasible 19 (c3)!
    if (roadmap.length > 1) {
      expect(roadmap[1].chart.chartID).toBe('c4');
      expect(roadmap[1].feasibility?.feasibilityPercent).toBe(75);
    }
  });

  it('fastest strategy greedily prioritizes highest net gain', () => {
    const roadmap = generateRoadmap(
      16.200,
      16.300,
      mockUpscores,
      mockFarmables,
      'vf7',
      'fastest',
    );

    expect(roadmap.length).toBeGreaterThan(0);
    // Highest net gain chart (c3 with +0.110 VF) should be selected first in fastest mode
    expect(roadmap[0].chart.chartID).toBe('c3');
  });

  it('attaches feasible alternative options to steps when available', () => {
    const roadmap = generateRoadmap(
      16.200,
      16.240,
      mockUpscores,
      mockFarmables,
      'vf7',
      'most-feasible',
    );

    const stepWithAlternatives = roadmap.find(
      (s) => s.alternatives && s.alternatives.length > 0,
    );
    expect(stepWithAlternatives).toBeDefined();
    expect(stepWithAlternatives?.alternatives?.length).toBeGreaterThan(0);
    expect(stepWithAlternatives?.alternatives?.[0].feasibility).toBeDefined();
  });

  it('supports changing target lamps in roadmap generation (e.g. S with Excessive vs UC)', () => {
    const ucFarmables: FarmableOpportunity[] = [
      {
        id: 'f-uc',
        chart: { chartID: 'c-uc', difficulty: 'MXM', level: '18', levelNum: 18.0 },
        song: { id: 's-uc', title: 'UC Song', artist: 'Artist UC' },
        levelNum: 18.0,
        difficulty: 'MXM',
        individualDifference: false,
        projectedScore: 9_900_000,
        projectedLamp: 'ULTIMATE CHAIN',
        projectedVF: 0.396,
        netVFGain: 0.055,
        farmabilityScore: 250,
        isPlayed: false,
        primaryAdvantage: 'S + UC',
      },
    ];

    const roadmapUC = generateRoadmap(
      18.000,
      18.050,
      [],
      ucFarmables,
      'vf7',
      'most-feasible',
      'ULTIMATE CHAIN',
    );

    expect(roadmapUC.length).toBe(1);
    expect(roadmapUC[0].targetLamp).toBe('ULTIMATE CHAIN');
    expect(roadmapUC[0].targetScore).toBe(9_900_000);
    expect(roadmapUC[0].netVFGain).toBe(0.055);
  });

  it('enforces a maximum of 50 steps based on SDVX Top 50 Volforce calculation', () => {
    // Generate 60 mock farmable opportunities
    const manyFarmables: FarmableOpportunity[] = Array.from({ length: 60 }, (_, i) => ({
      id: `f-${i}`,
      chart: { chartID: `chart-${i}`, difficulty: 'MXM', level: '18', levelNum: 18.0 },
      song: { id: `song-${i}`, title: `Song ${i}`, artist: `Artist ${i}` },
      levelNum: 18.0,
      difficulty: 'MXM',
      individualDifference: false,
      projectedScore: 9_900_000,
      projectedLamp: 'EXCESSIVE CLEAR',
      projectedVF: 0.380,
      netVFGain: 0.010,
      farmabilityScore: 100,
      isPlayed: false,
      primaryAdvantage: 'High Net Gain',
      feasibility: {
        expectedPlayerVF: 18.0,
        userVF: 17.5,
        vfFitDelta: -0.5,
        feasibilityPercent: 70,
        feasibilityTier: 'MODERATE',
        label: 'Moderate',
        explanation: 'Accessible',
      },
    }));

    // Target requires huge gain that cannot be reached within 50 plays even with UC
    const roadmap = generateRoadmap(
      18.000,
      25.000,
      [],
      manyFarmables,
      'vf6',
      'fastest',
    );

    expect(roadmap.length).toBe(50);
    expect(roadmap.length).toBeLessThanOrEqual(50);
    expect(roadmap[49].stepNumber).toBe(50);
  });

  it('automatically changes strategy to reach desired volforce when first plan falls short', () => {
    // 50 highly feasible charts with tiny gain (+0.002 each -> max +0.100)
    const smallFeasibleFarmables: FarmableOpportunity[] = Array.from({ length: 50 }, (_, i) => ({
      id: `small-${i}`,
      chart: { chartID: `small-c-${i}`, difficulty: 'EXH', level: '17', levelNum: 17.0 },
      song: { id: `small-s-${i}`, title: `Small Gain ${i}`, artist: `Artist` },
      levelNum: 17.0,
      difficulty: 'EXH',
      individualDifference: false,
      projectedScore: 9_900_000,
      projectedLamp: 'EXCESSIVE CLEAR',
      projectedVF: 0.350,
      netVFGain: 0.002,
      farmabilityScore: 100,
      isPlayed: false,
      primaryAdvantage: 'High Feasibility',
      feasibility: {
        expectedPlayerVF: 16.5,
        userVF: 17.0,
        vfFitDelta: 0.5,
        feasibilityPercent: 90,
        feasibilityTier: 'VERY_HIGH',
        label: 'Very High',
        explanation: 'Very high feasibility',
      },
    }));

    // 10 moderate feasibility charts with large gain (+0.030 each)
    const largeGainFarmables: FarmableOpportunity[] = Array.from({ length: 10 }, (_, i) => ({
      id: `large-${i}`,
      chart: { chartID: `large-c-${i}`, difficulty: 'MXM', level: '18', levelNum: 18.5 },
      song: { id: `large-s-${i}`, title: `Large Gain ${i}`, artist: `Artist` },
      levelNum: 18.5,
      difficulty: 'MXM',
      individualDifference: false,
      projectedScore: 9_900_000,
      projectedLamp: 'EXCESSIVE CLEAR',
      projectedVF: 0.385,
      netVFGain: 0.030,
      farmabilityScore: 200,
      isPlayed: false,
      primaryAdvantage: 'Big Gain',
      feasibility: {
        expectedPlayerVF: 17.5,
        userVF: 17.0,
        vfFitDelta: -0.5,
        feasibilityPercent: 60,
        feasibilityTier: 'MODERATE',
        label: 'Moderate',
        explanation: 'Moderate feasibility',
      },
    }));

    const allFarmables = [...smallFeasibleFarmables, ...largeGainFarmables];

    // Current: 17.000, Target: 17.200 (+0.200 VF needed)
    // In most-feasible, it picks 90% feasible charts (+0.002 each). 50 * 0.002 = +0.100 max! Fails to reach 17.200!
    // But balanced/fastest can pick the +0.030 charts and reach 17.200 easily.
    const roadmap = generateRoadmap(
      17.000,
      17.200,
      [],
      allFarmables,
      'vf7',
      'most-feasible',
    );

    expect(roadmap.wasStrategyChanged).toBe(true);
    expect(roadmap.targetReached).toBe(true);
    expect(roadmap.feasibleCount).toBeGreaterThan(30); // Maximized feasible stuff!
    expect(roadmap.higherStuffCount).toBeGreaterThan(0); // Filled gap with higher stuff!
    expect(roadmap[roadmap.length - 1].cumulativeProfileVF).toBeGreaterThanOrEqual(17.200);
    expect(roadmap.length).toBeLessThanOrEqual(50);
    const pusherSteps = roadmap.filter((s) => s.isHigherStuff);
    expect(pusherSteps.length).toBe(roadmap.higherStuffCount);
    expect(pusherSteps.length).toBeGreaterThan(0);
    expect(pusherSteps[0].primaryFactor).toContain('Target Pusher');
  });

  it('selects pushers that are only slightly less feasible (e.g. 90 -> 80) rather than extreme low feasibility reach charts', () => {
    // 48 feasible upscores at 90% feasibility (+0.001 VF each = +0.048 VF total)
    const feasibleUpscores: UpscoreOpportunity[] = Array.from({ length: 48 }, (_, i) => ({
      id: `u-${i}`,
      chart: { chartID: `c-${i}`, difficulty: 'MXM', level: '18', levelNum: 18.0 },
      song: { id: `s-${i}`, title: `Feasible Song ${i}`, artist: `Artist` },
      currentScore: 9_850_000,
      currentLamp: 'CLEAR',
      currentGrade: 'AAA+',
      currentVF: 0.360,
      targetScore: 9_900_000,
      targetLamp: 'EXCESSIVE CLEAR',
      targetGrade: 'S',
      targetVF: 0.361,
      netVFGain: 0.001,
      category: 'near-s',
      description: 'Quick win near S',
      effortRating: 1,
      levelNum: 18.0,
      feasibility: {
        expectedPlayerVF: 18.0,
        userVF: 19.5,
        vfFitDelta: 1.5,
        feasibilityPercent: 90,
        feasibilityTier: 'VERY_HIGH',
        label: 'Very High',
        explanation: 'Very high',
      },
    }));


    // Pusher candidates:
    // P1: 78% feas, +0.030 VF (slightly less feasible, e.g. 90 -> 78)
    // P2: 76% feas, +0.030 VF (slightly less feasible, e.g. 90 -> 76)
    // P_Extreme: 20% feas, +0.065 VF (a lot less feasible!)
    const farmables: FarmableOpportunity[] = [
      {
        id: 'p-extreme',
        chart: { chartID: 'c-extreme', difficulty: 'MXM', level: '20', levelNum: 20.0 },
        song: { id: 's-extreme', title: 'Extreme Reach 20', artist: 'Artist' },
        levelNum: 20.0,
        difficulty: 'MXM',
        individualDifference: true,
        projectedScore: 9_900_000,
        projectedLamp: 'EXCESSIVE CLEAR',
        projectedVF: 0.440,
        netVFGain: 0.065,
        farmabilityScore: 300,
        isPlayed: false,
        primaryAdvantage: 'Extreme Gain',
        feasibility: {
          expectedPlayerVF: 20.8,
          userVF: 19.5,
          vfFitDelta: -1.3,
          feasibilityPercent: 20,
          feasibilityTier: 'HARD',
          label: 'Hard',
          explanation: 'Extreme jump',
        },
      },
      {
        id: 'p-1',
        chart: { chartID: 'c-p1', difficulty: 'MXM', level: '19', levelNum: 19.0 },
        song: { id: 's-p1', title: 'Solid Pusher 1', artist: 'Artist' },
        levelNum: 19.0,
        difficulty: 'MXM',
        individualDifference: false,
        projectedScore: 9_900_000,
        projectedLamp: 'EXCESSIVE CLEAR',
        projectedVF: 0.400,
        netVFGain: 0.030,
        farmabilityScore: 220,
        isPlayed: false,
        primaryAdvantage: 'High Gain',
        feasibility: {
          expectedPlayerVF: 19.5,
          userVF: 19.5,
          vfFitDelta: 0.0,
          feasibilityPercent: 78,
          feasibilityTier: 'VERY_HIGH',
          label: 'Very High',
          explanation: 'Close match',
        },
      },
      {
        id: 'p-2',
        chart: { chartID: 'c-p2', difficulty: 'MXM', level: '19', levelNum: 19.0 },
        song: { id: 's-p2', title: 'Solid Pusher 2', artist: 'Artist' },
        levelNum: 19.0,
        difficulty: 'MXM',
        individualDifference: false,
        projectedScore: 9_900_000,
        projectedLamp: 'EXCESSIVE CLEAR',
        projectedVF: 0.400,
        netVFGain: 0.030,
        farmabilityScore: 215,
        isPlayed: false,
        primaryAdvantage: 'High Gain',
        feasibility: {
          expectedPlayerVF: 19.6,
          userVF: 19.5,
          vfFitDelta: -0.1,
          feasibilityPercent: 76,
          feasibilityTier: 'VERY_HIGH',
          label: 'Very High',
          explanation: 'Close match',
        },
      },
    ];

    // Current: 19.500, Target: 19.608 (+0.108 VF needed).
    // 48 feasible (>=80%) give 48 * 0.001 = 0.048 VF -> shortfall is +0.060 VF.
    // 2 pushers at +0.030 VF each (78% and 76% feas) cleanly bridge +0.060 VF!
    const roadmap = generateRoadmap(
      19.500,
      19.608,
      feasibleUpscores,
      farmables,
      'vf7',
      'most-feasible',
      'EXCESSIVE CLEAR',
      80,
    );

    expect(roadmap.targetReached).toBe(true);
    expect(roadmap.feasibleCount).toBe(48);
    expect(roadmap.higherStuffCount).toBe(2);


    const pushers = roadmap.filter((s) => s.isHigherStuff);
    expect(pushers.length).toBe(2);

    // Both pushers must be around 80% feasibility (82% and 80%), NEVER the 20% extreme chart!
    for (const p of pushers) {
      expect(p.feasibility?.feasibilityPercent).toBeGreaterThanOrEqual(75);
      expect(p.chart.chartID).not.toBe('c-extreme');
    }
  });

  it('respects existing scores in Top 50, fills remaining slots with 18 S UCs, and bridges with 19 S pushers', () => {
    // 11x 18 S UC (0.392), 1x 19 S Maxxive (0.410), 1x 20 AAA+ Clear (0.399), 37x lower (0.350)
    const existingTop50: { chartID: string; vf: number }[] = [
      { chartID: 'c-19-maxxive', vf: 0.410 },
      { chartID: 'c-20-aaa-clear', vf: 0.399 },
      ...Array.from({ length: 11 }, (_, i) => ({ chartID: `c-existing-18-${i}`, vf: 0.392 })),
      ...Array.from({ length: 37 }, (_, i) => ({ chartID: `c-existing-low-${i}`, vf: 0.350 })),
    ];

    const currentVF = Math.round(existingTop50.reduce((acc, s) => acc + s.vf, 0) * 1000) / 1000;
    // Total current VF: 0.410 + 0.399 + 11*0.392 (4.312) + 37*0.350 (12.950) = 18.071 VF
    expect(currentVF).toBe(18.071);

    // Provide 50 farmable 18 S UCs (0.392 VF, 85% feas)
    const farmable18s: FarmableOpportunity[] = Array.from({ length: 50 }, (_, i) => ({
      id: `f-18-${i}`,
      chart: { chartID: `chart-18-${i}`, difficulty: 'MXM', level: '18', levelNum: 18.0 },
      song: { id: `song-18-${i}`, title: `18 UC Song ${i}`, artist: 'Artist' },
      levelNum: 18.0,
      difficulty: 'MXM',
      individualDifference: false,
      projectedScore: 9_900_000,
      projectedLamp: 'ULTIMATE CHAIN',
      projectedVF: 0.392,
      netVFGain: 0.042, // vs initial 0.350 cutoff
      farmabilityScore: 200,
      isPlayed: false,
      primaryAdvantage: 'Feasible 18 UC',
      feasibility: {
        expectedPlayerVF: 18.0,
        userVF: 18.0,
        vfFitDelta: 0,
        feasibilityPercent: 85,
        feasibilityTier: 'VERY_HIGH',
        label: 'Very High',
        explanation: 'Comfortable',
      },
    }));

    // Provide 20 farmable 19 S pushers (0.410 VF, 78% feas)
    const pusher19s: FarmableOpportunity[] = Array.from({ length: 20 }, (_, i) => ({
      id: `p-19-${i}`,
      chart: { chartID: `chart-19-${i}`, difficulty: 'MXM', level: '19', levelNum: 19.0 },
      song: { id: `song-19-${i}`, title: `19 S Song ${i}`, artist: 'Artist' },
      levelNum: 19.0,
      difficulty: 'MXM',
      individualDifference: false,
      projectedScore: 9_900_000,
      projectedLamp: 'EXCESSIVE CLEAR',
      projectedVF: 0.410,
      netVFGain: 0.060,
      farmabilityScore: 190,
      isPlayed: false,
      primaryAdvantage: 'High Yield Pusher',
      feasibility: {
        expectedPlayerVF: 19.0,
        userVF: 18.0,
        vfFitDelta: -1.0,
        feasibilityPercent: 78,
        feasibilityTier: 'VERY_HIGH',
        label: 'Very High',
        explanation: 'Target Pusher',
      },
    }));

    // Target: 19.800 VF (exceeds what 37x 18 UCs can give alone, which caps at 19.625)
    const roadmap = generateRoadmap(
      currentVF,
      19.800,
      [],
      [...farmable18s, ...pusher19s],
      'vf6',
      'most-feasible',
      'ULTIMATE CHAIN',
      60,
      50,
      existingTop50,
    );

    expect(roadmap.targetReached).toBe(true);
    // Should NOT have more than 50 steps
    expect(roadmap.length).toBeLessThanOrEqual(50);

    // Feasible 18 UCs cannot exceed 37 steps because the 13 existing top scores are already >= 0.392!
    expect(roadmap.feasibleCount).toBeLessThanOrEqual(37);
    expect(roadmap.higherStuffCount).toBeGreaterThan(0);

    // Existing high charts (c-19-maxxive, c-20-aaa-clear, c-existing-18-*) are preserved
    const chartIdsInRoadmap = new Set(roadmap.map((s) => s.chart.chartID));
    expect(chartIdsInRoadmap.has('c-19-maxxive')).toBe(false);
    expect(chartIdsInRoadmap.has('c-20-aaa-clear')).toBe(false);
  });
});



