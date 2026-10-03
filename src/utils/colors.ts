import { SDVXDifficulty, SDVXGrade, SDVXLamp } from '../core/types';

export function getDifficultyBadgeColor(diff: SDVXDifficulty): { bg: string; text: string; border: string } {
  switch (diff) {
    case 'MXM':
      return { bg: 'bg-slate-400/20', text: 'text-slate-200', border: 'border-slate-400/40' };
    case 'EXH':
      return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' };
    case 'HVN':
      return { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40' };
    case 'VVD':
      return { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/40' };
    case 'XCD':
      return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' };
    case 'GRV':
      return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' };
    case 'INF':
      return { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/40' };
    case 'ADV':
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' };
    case 'NOV':
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' };
    case 'ULT':
      return { bg: 'bg-amber-400/25', text: 'text-amber-300 font-bold', border: 'border-amber-400/60' };
    default:
      return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/40' };
  }
}

export function getLampBadgeColor(lamp: SDVXLamp): { bg: string; text: string; border: string } {
  switch (lamp) {
    case 'PERFECT ULTIMATE CHAIN':
      return { bg: 'bg-amber-400/25', text: 'text-amber-300 font-bold', border: 'border-amber-400/60' };
    case 'ULTIMATE CHAIN':
      return { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' };
    case 'MAXXIVE CLEAR':
      return { bg: 'bg-amber-500/20', text: 'text-amber-300 font-bold', border: 'border-amber-500/40' };
    case 'EXCESSIVE CLEAR':
      return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' };
    case 'CLEAR':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' };
    default:
      return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/40' };
  }
}

export function getGradeBadgeColor(grade: SDVXGrade): { bg: string; text: string } {
  if (grade === 'S') return { bg: 'bg-amber-500/20', text: 'text-amber-300' };
  if (grade === 'AAA+') return { bg: 'bg-rose-500/20', text: 'text-rose-300' };
  if (grade === 'AAA') return { bg: 'bg-purple-500/20', text: 'text-purple-300' };
  if (grade === 'AA+' || grade === 'AA') return { bg: 'bg-sky-500/20', text: 'text-sky-300' };
  return { bg: 'bg-gray-500/20', text: 'text-gray-300' };
}

export function getFeasibilityBadgeColor(tier: 'VERY_HIGH' | 'MODERATE' | 'CHALLENGING' | 'HARD'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (tier) {
    case 'VERY_HIGH':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'MODERATE':
      return { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' };
    case 'CHALLENGING':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'HARD':
      return { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' };
  }
}
