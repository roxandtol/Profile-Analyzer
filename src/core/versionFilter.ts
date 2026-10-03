import { GameVersionFilter, KamaiChart } from './types';

/**
 * Checks whether a chart is playable on a given game version / platform.
 * - 'exceed': Arcade SOUND VOLTEX EXCEED GEAR
 * - 'konaste': PC SOUND VOLTEX (Konaste)
 * - 'all': All versions (including Nabla / latest)
 */
export function isChartInVersion(chart: KamaiChart, filter: GameVersionFilter): boolean {
  if (filter === 'all') return true;
  if (!chart.versions || chart.versions.length === 0) return true;

  if (filter === 'konaste') {
    return chart.versions.includes('konaste');
  }

  if (filter === 'exceed') {
    return chart.versions.includes('exceed') || chart.versions.includes('exceed-omni');
  }

  return true;
}
