import { SDVXGrade, SDVXLamp, VolforceVersion } from './types';

export const GRADE_COEFFICIENTS: Record<SDVXGrade, number> = {
  S: 105,
  'AAA+': 102,
  AAA: 100,
  'AA+': 97,
  AA: 94,
  'A+': 91,
  A: 88,
  B: 85,
  C: 82,
  D: 80,
};

export const VF6_LAMP_COEFFICIENTS: Record<SDVXLamp, number> = {
  'PERFECT ULTIMATE CHAIN': 110,
  'ULTIMATE CHAIN': 105,
  'MAXXIVE CLEAR': 104,
  'EXCESSIVE CLEAR': 102,
  CLEAR: 100,
  FAILED: 50,
};

// SDVX 7 / NABLA buffed UC from 105 to 106
export const VF7_LAMP_COEFFICIENTS: Record<SDVXLamp, number> = {
  ...VF6_LAMP_COEFFICIENTS,
  'ULTIMATE CHAIN': 106,
};

export function scoreToGrade(score: number): SDVXGrade {
  if (score >= 9_900_000) return 'S';
  if (score >= 9_800_000) return 'AAA+';
  if (score >= 9_700_000) return 'AAA';
  if (score >= 9_500_000) return 'AA+';
  if (score >= 9_300_000) return 'AA';
  if (score >= 9_000_000) return 'A+';
  if (score >= 8_700_000) return 'A';
  if (score >= 8_000_000) return 'B';
  if (score >= 7_000_000) return 'C';
  return 'D';
}

/**
 * Calculate single-chart VOLFORCE under SDVX6 rules.
 * Level is floored to integer (18.4 -> 18).
 */
export function calculateVF6(score: number, lamp: SDVXLamp, levelNum: number): number {
  if (score < 0 || score > 10_000_000) return 0;
  const level = Math.floor(levelNum);
  const grade = scoreToGrade(score);
  const gradeCoef = GRADE_COEFFICIENTS[grade];
  const lampCoef = VF6_LAMP_COEFFICIENTS[lamp] ?? 100;

  const rawVF = level * 2 * (score / 10_000_000) * gradeCoef * lampCoef;
  return Math.floor(rawVF / 1000) / 1000;
}

/**
 * Calculate single-chart VOLFORCE under SDVX7 (Nabla/Konaste) rules.
 * Uses exact decimal levelNum (e.g. 18.4, 18.7) and buffed UC lamp (106).
 */
export function calculateVF7(score: number, lamp: SDVXLamp, levelNum: number): number {
  if (score < 0 || score > 10_000_000) return 0;
  const grade = scoreToGrade(score);
  const gradeCoef = GRADE_COEFFICIENTS[grade];
  const lampCoef = VF7_LAMP_COEFFICIENTS[lamp] ?? 100;

  const rawVF = levelNum * 2 * (score / 10_000_000) * gradeCoef * lampCoef;
  return Math.floor(rawVF / 1000) / 1000;
}

export function calculateChartVF(
  score: number,
  lamp: SDVXLamp,
  levelNum: number,
  version: VolforceVersion = 'vf7',
): number {
  return version === 'vf7'
    ? calculateVF7(score, lamp, levelNum)
    : calculateVF6(score, lamp, levelNum);
}

/**
 * Calculate Profile Volforce: sum of top 50 score VF values.
 */
export function calculateProfileVF(vfValues: number[]): number {
  const sorted = [...vfValues].sort((a, b) => b - a);
  const top50 = sorted.slice(0, 50);
  const sum = top50.reduce((acc, v) => acc + v, 0);
  return Math.round(sum * 1000) / 1000;
}

/**
 * Translate Volforce value to readable class name.
 */
export function vfToClass(vf: number): string {
  if (vf >= 23.0) return 'IMPERIAL IV';
  if (vf >= 22.0) return 'IMPERIAL III';
  if (vf >= 21.0) return 'IMPERIAL II';
  if (vf >= 20.0) return 'IMPERIAL I';
  if (vf >= 19.75) return 'CRIMSON IV';
  if (vf >= 19.5) return 'CRIMSON III';
  if (vf >= 19.25) return 'CRIMSON II';
  if (vf >= 19.0) return 'CRIMSON I';
  if (vf >= 18.75) return 'ELDORA IV';
  if (vf >= 18.5) return 'ELDORA III';
  if (vf >= 18.25) return 'ELDORA II';
  if (vf >= 18.0) return 'ELDORA I';
  if (vf >= 17.75) return 'ARGENTO IV';
  if (vf >= 17.5) return 'ARGENTO III';
  if (vf >= 17.25) return 'ARGENTO II';
  if (vf >= 17.0) return 'ARGENTO I';
  if (vf >= 16.75) return 'CORAL IV';
  if (vf >= 16.5) return 'CORAL III';
  if (vf >= 16.25) return 'CORAL II';
  if (vf >= 16.0) return 'CORAL I';
  if (vf >= 15.75) return 'SCARLET IV';
  if (vf >= 15.5) return 'SCARLET III';
  if (vf >= 15.25) return 'SCARLET II';
  if (vf >= 15.0) return 'SCARLET I';
  if (vf >= 14.75) return 'CYAN IV';
  if (vf >= 14.5) return 'CYAN III';
  if (vf >= 14.25) return 'CYAN II';
  if (vf >= 14.0) return 'CYAN I';
  if (vf >= 13.5) return 'DANDELION IV';
  if (vf >= 13.0) return 'DANDELION III';
  if (vf >= 12.5) return 'DANDELION II';
  if (vf >= 12.0) return 'DANDELION I';
  if (vf >= 11.5) return 'COBALT IV';
  if (vf >= 11.0) return 'COBALT III';
  if (vf >= 10.5) return 'COBALT II';
  if (vf >= 10.0) return 'COBALT I';
  if (vf >= 7.5) return 'SIENNA IV';
  if (vf >= 5.0) return 'SIENNA III';
  if (vf >= 2.5) return 'SIENNA II';
  return 'SIENNA I';
}

/**
 * Color theme / styling class for VF class badges
 */
export function getClassColor(vfClass: string): { bg: string; text: string; border: string; glow: string } {
  const upper = vfClass.toUpperCase();
  if (upper.includes('IMPERIAL')) {
    return { bg: 'bg-gradient-to-r from-red-600 via-yellow-500 to-purple-600', text: 'text-yellow-200', border: 'border-yellow-400', glow: 'shadow-[0_0_15px_rgba(255,215,0,0.5)]' };
  }
  if (upper.includes('CRIMSON')) {
    return { bg: 'bg-red-950/80', text: 'text-red-400', border: 'border-red-600', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]' };
  }
  if (upper.includes('ELDORA')) {
    return { bg: 'bg-amber-950/80', text: 'text-amber-300', border: 'border-amber-500', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]' };
  }
  if (upper.includes('ARGENTO')) {
    return { bg: 'bg-slate-900', text: 'text-slate-200', border: 'border-slate-400', glow: 'shadow-[0_0_10px_rgba(203,213,225,0.3)]' };
  }
  if (upper.includes('CORAL')) {
    return { bg: 'bg-pink-950/80', text: 'text-pink-300', border: 'border-pink-500', glow: 'shadow-[0_0_10px_rgba(244,114,182,0.3)]' };
  }
  if (upper.includes('SCARLET')) {
    return { bg: 'bg-rose-950/80', text: 'text-rose-400', border: 'border-rose-600', glow: 'shadow-[0_0_10px_rgba(251,113,133,0.3)]' };
  }
  if (upper.includes('CYAN')) {
    return { bg: 'bg-cyan-950/80', text: 'text-cyan-300', border: 'border-cyan-500', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.3)]' };
  }
  return { bg: 'bg-gray-900', text: 'text-gray-300', border: 'border-gray-600', glow: '' };
}
