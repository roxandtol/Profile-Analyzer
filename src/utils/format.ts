import { VolforceVersion } from '../core/types';

/**
 * Formats chart level based on active Volforce algorithm:
 * - VF6 (Exceed Gear): integer only (e.g. "18", "17", "19")
 * - VF7 (Nabla/Konaste): decimal (e.g. "18.7", "18.2", "19.9")
 */
export function formatChartLevel(levelNum: number, version: VolforceVersion): string {
  if (version === 'vf6') {
    return `${Math.floor(levelNum)}`;
  }
  return levelNum.toFixed(1);
}
