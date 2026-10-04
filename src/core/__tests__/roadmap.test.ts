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

    // Target requires +1.000 VF, which with +0.010 per chart would take 100 charts
    const roadmap = generateRoadmap(
      18.000,
      19.000,
      [],
      manyFarmables,
      'vf6',
      'fastest',
    );

    expect(roadmap.length).toBe(50);
    expect(roadmap.length).toBeLessThanOrEqual(50);
    expect(roadmap[49].stepNumber).toBe(50);
  });
});
