import { describe, it, expect } from 'vitest';
import {
  calculateVF6,
  calculateVF7,
  calculateProfileVF,
  scoreToGrade,
  vfToClass,
} from '../volforce';

describe('Volforce Calculations', () => {
  it('correctly maps scores to SDVX grades', () => {
    expect(scoreToGrade(10_000_000)).toBe('S');
    expect(scoreToGrade(9_900_000)).toBe('S');
    expect(scoreToGrade(9_899_999)).toBe('AAA+');
    expect(scoreToGrade(9_800_000)).toBe('AAA+');
    expect(scoreToGrade(9_799_999)).toBe('AAA');
    expect(scoreToGrade(9_500_000)).toBe('AA+');
    expect(scoreToGrade(9_300_000)).toBe('AA');
    expect(scoreToGrade(9_000_000)).toBe('A+');
    expect(scoreToGrade(8_700_000)).toBe('A');
    expect(scoreToGrade(8_000_000)).toBe('B');
    expect(scoreToGrade(7_000_000)).toBe('C');
    expect(scoreToGrade(6_999_999)).toBe('D');
  });

  it('matches known Kamaitachi VF6 calculation for sample score', () => {
    // Verified against Kamaitachi API response for zkldi:
    // Score: 9841820, Excessive Clear, Level 17 -> VF6 = 0.348
    const vf6 = calculateVF6(9_841_820, 'EXCESSIVE CLEAR', 17);
    expect(vf6).toBe(0.348);
  });

  it('floors levelNum in VF6 mode', () => {
    // In VF6, an 18.6 chart is floored to 18
    const vf18_0 = calculateVF6(9_900_000, 'CLEAR', 18.0);
    const vf18_6 = calculateVF6(9_900_000, 'CLEAR', 18.6);
    expect(vf18_0).toBe(vf18_6);
  });

  it('uses exact decimal levelNum in VF7 mode', () => {
    // In VF7, an 18.6 chart has higher VF than an 18.2 chart
    const vf18_2 = calculateVF7(9_900_000, 'CLEAR', 18.2);
    const vf18_6 = calculateVF7(9_900_000, 'CLEAR', 18.6);
    expect(vf18_6).toBeGreaterThan(vf18_2);
  });

  it('applies buffed UC lamp multiplier (106) in VF7', () => {
    const vf6_uc = calculateVF6(9_900_000, 'ULTIMATE CHAIN', 18);
    const vf7_uc = calculateVF7(9_900_000, 'ULTIMATE CHAIN', 18);
    // VF7 has lamp coef 106 vs VF6 lamp coef 105
    expect(vf7_uc).toBeGreaterThan(vf6_uc);
  });

  it('calculates profile VF as sum of top 50 scores', () => {
    // Create 60 scores: 50 scores of 0.380, and 10 scores of 0.300
    const scores = Array(50).fill(0.380).concat(Array(10).fill(0.300));
    const profileVF = calculateProfileVF(scores);
    // 50 * 0.380 = 19.000
    expect(profileVF).toBe(19.0);
  });

  it('uses 104 lamp coefficient for MAXXIVE CLEAR in both VF6 and VF7', () => {
    // Level 18 S rank (9,900,000):
    // CLEAR (100) -> 0.374
    // EXCESSIVE CLEAR (102) -> 0.381
    // MAXXIVE CLEAR (104) -> 0.389
    const vf_clear = calculateVF7(9_900_000, 'CLEAR', 18);
    const vf_ex = calculateVF7(9_900_000, 'EXCESSIVE CLEAR', 18);
    const vf_max = calculateVF7(9_900_000, 'MAXXIVE CLEAR', 18);

    expect(vf_max).toBeGreaterThan(vf_ex);
    expect(vf_ex).toBeGreaterThan(vf_clear);
    expect(vf_max).toBe(0.389);

    const vf6_max = calculateVF6(9_900_000, 'MAXXIVE CLEAR', 18.4);
    expect(vf6_max).toBe(0.389);
  });

  it('maps profile VF to class badges', () => {
    expect(vfToClass(18.0)).toBe('ELDORA I');
    expect(vfToClass(18.52)).toBe('ELDORA III');
    expect(vfToClass(19.0)).toBe('CRIMSON I');
    expect(vfToClass(19.75)).toBe('CRIMSON IV');
    expect(vfToClass(20.0)).toBe('IMPERIAL I');
  });
});
