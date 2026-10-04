import {
  FarmableOpportunity,
  GameVersionFilter,
  KamaiChart,
  KamaiPB,
  KamaiSong,
  SDVXLamp,
  VolforceVersion,
} from './types';
import { calculateChartVF } from './volforce';
import { calculateUpscoreFeasibility } from './upscoreFeasibility';
import { isChartInVersion } from './versionFilter';

export interface FarmableOptions {
  version: VolforceVersion;
  top50Cutoff: number;
  top50ChartIDs: Set<string>;
  existingPBsMap: Map<string, KamaiPB>;
  minLevel?: number;
  maxLevel?: number;
  excludeGimmicks?: boolean;
  targetVF?: number;
  userVF?: number;
  versionFilter?: GameVersionFilter;
  targetLamp?: SDVXLamp;
  minFeasibility?: number;
}

/**
 * Parse sTier text like 'T8', 'T10', 'T2' into a numeric ease score (1-10)
 * Higher number = easier S rank according to the community.
 */
export function parseTierEase(sTierText?: string): number {
  if (!sTierText) return 5; // Default middle
  const match = sTierText.match(/T(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    // T10 is easiest, T1 is hardest
    return Math.min(10, Math.max(1, num));
  }
  return 5;
}

/**
 * Determine recommended level range based on target VF.
 */
export function getDefaultLevelRange(targetVF: number): { minLevel: number; maxLevel: number } {
  if (targetVF >= 19.0) return { minLevel: 18, maxLevel: 20 };
  if (targetVF >= 18.0) return { minLevel: 17, maxLevel: 19 };
  if (targetVF >= 17.0) return { minLevel: 16, maxLevel: 18 };
  if (targetVF >= 16.0) return { minLevel: 15, maxLevel: 17 };
  return { minLevel: 14, maxLevel: 16 };
}

/**
 * Evaluates a catalog of charts against the user's existing scores and cutoff floor
 * to find the most farmable charts.
 */
export function findFarmables(
  allCharts: KamaiChart[],
  songsMap: Map<string, KamaiSong>,
  options: FarmableOptions,
): FarmableOpportunity[] {
  const {
    version,
    top50Cutoff,
    top50ChartIDs,
    existingPBsMap,
    minLevel = 17,
    maxLevel = 19,
    excludeGimmicks = false,
    userVF = top50Cutoff * 50,
    versionFilter = version === 'vf6' ? 'exceed' : 'all',
    targetLamp = 'EXCESSIVE CLEAR',
    minFeasibility = 0,
  } = options;

  const results: FarmableOpportunity[] = [];
  const targetScore = 9_900_000; // Benchmark: S rank

  for (const chart of allCharts) {
    const levelNum = chart.levelNum || parseFloat(chart.level) || 0;
    const intLevel = Math.floor(levelNum);

    if (intLevel < minLevel || intLevel > maxLevel) continue;

    // Filter by game version (e.g. Exceed Gear or Konaste)
    if (!isChartInVersion(chart, versionFilter)) {
      continue;
    }

    const individualDiff = !!(
      chart.data?.sTier?.individualDifference ||
      chart.data?.clearTier?.individualDifference
    );

    if (excludeGimmicks && individualDiff) continue;

    const song =
      chart.song ||
      (chart.songID ? songsMap.get(chart.songID) : undefined) || {
        id: chart.songID || 'unknown',
        title: 'Unknown Title',
        artist: 'Unknown Artist',
      };

    // Check if user already played this chart
    const existingPB = existingPBsMap.get(chart.chartID);
    let netGain = 0;
    let isPlayed = false;
    let existingScore: number | undefined;
    let existingLamp: SDVXLamp | undefined;

    if (existingPB) {
      isPlayed = true;
      existingScore = existingPB.scoreData.score;
      existingLamp = existingPB.scoreData.lamp;
    }

    // Determine target lamp:
    // - "always jumps from excessive to maxxive"
    let chartTargetLamp = targetLamp;
    if (existingLamp === 'EXCESSIVE CLEAR' && chartTargetLamp === 'EXCESSIVE CLEAR') {
      chartTargetLamp = 'MAXXIVE CLEAR';
    }

    const projectedVF = calculateChartVF(targetScore, chartTargetLamp, levelNum, version);

    if (existingPB) {
      // If user already has an S rank on this:
      if (existingScore && existingScore >= 9_900_000) {
        if (existingLamp === 'EXCESSIVE CLEAR') {
          // Can upgrade to MAXXIVE CLEAR!
        } else if (
          chartTargetLamp === 'ULTIMATE CHAIN' &&
          existingLamp !== 'ULTIMATE CHAIN' &&
          existingLamp !== 'PERFECT ULTIMATE CHAIN'
        ) {
          // Keep as UC upgrade candidate
        } else {
          continue;
        }
      }

      const existingVF = calculateChartVF(
        existingScore!,
        existingLamp!,
        levelNum,
        version,
      );

      if (top50ChartIDs.has(chart.chartID)) {
        netGain = projectedVF - existingVF;
      } else {
        netGain = Math.max(0, projectedVF - top50Cutoff);
      }
    } else {
      // Unplayed chart: pushes into top 50 displacing cutoff
      netGain = Math.max(0, projectedVF - top50Cutoff);
    }

    // Must offer meaningful net VF gain
    if (netGain <= 0.001) continue;

    const sTierEase = parseTierEase(chart.data?.sTier?.text);
    const feasibility = calculateUpscoreFeasibility(
      userVF,
      chart,
      existingScore || 0,
      targetScore,
      'S',
      chartTargetLamp,
    );

    // Hide farmables below minFeasibility (default: 40%)
    if (feasibility.feasibilityPercent < minFeasibility) continue;

    let farmabilityScore = 0;
    let primaryAdvantage = '';

    const lampTag =
      chartTargetLamp === 'ULTIMATE CHAIN'
        ? 'S + UC'
        : chartTargetLamp === 'MAXXIVE CLEAR'
        ? 'S + Maxxive'
        : chartTargetLamp === 'CLEAR'
        ? 'S + Clear'
        : 'S + Excessive';

    if (version === 'vf7') {
      /**
       * In VF7 Mode:
       * PRIMARY: The exact decimal levelNum directly determines the VF yield!
       * A 18.7 yields significantly more than an 18.1.
       * SECONDARY: Community tierlist (sTier) acts as ease filter / tiebreaker.
       */
      const decimalBonus = (levelNum - intLevel) * 25; // 0.7 -> +17.5 pts
      const netGainComponent = netGain * 1000 * 10;   // e.g. +0.025 VF -> 250 pts
      
      // Tier ease modifier: T1/T2 are penalized (hard boss charts), T6-T10 get bonuses
      const tierModifier = (sTierEase - 4) * 8; // T10: +48, T8: +32, T4: 0, T2: -16, T1: -24
      const gimmickPenalty = individualDiff ? 20 : 0;

      farmabilityScore = netGainComponent + decimalBonus + tierModifier - gimmickPenalty;

      const sTierStr = chart.data?.sTier?.text ? ` | S-Tier: ${chart.data.sTier.text}` : '';
      primaryAdvantage = `Decimal Level ${levelNum.toFixed(1)} (${lampTag}, +${netGain.toFixed(3)} VF)${sTierStr}`;
    } else {
      /**
       * In VF6 Mode:
       * All charts of the same integer level yield identical VF for a 9.9m score.
       * PRIMARY: Community tier list (T7-T10) is the dominant factor for identifying easy charts.
       */
      const netGainComponent = netGain * 1000 * 5;
      const tierEaseComponent = sTierEase * 30; // T10 -> 300 pts, T2 -> 60 pts
      const gimmickPenalty = individualDiff ? 35 : 0;

      farmabilityScore = netGainComponent + tierEaseComponent - gimmickPenalty;

      const sTierStr = chart.data?.sTier?.text ? `Community S-Tier: ${chart.data.sTier.text}` : 'Standard Tier';
      primaryAdvantage = `${sTierStr} (${lampTag}, +${netGain.toFixed(3)} VF yield)`;
    }

    results.push({
      id: `farmable-${chart.chartID}`,
      chart,
      song,
      levelNum,
      difficulty: chart.difficulty,
      sTier: chart.data?.sTier,
      clearTier: chart.data?.clearTier,
      individualDifference: individualDiff,
      projectedScore: targetScore,
      projectedLamp: targetLamp,
      projectedVF,
      netVFGain: Math.round(netGain * 1000) / 1000,
      farmabilityScore: Math.round(farmabilityScore * 10) / 10,
      isPlayed,
      existingScore,
      existingLamp,
      primaryAdvantage,
      feasibility,
    });
  }

  // Sort by farmabilityScore descending
  results.sort((a, b) => b.farmabilityScore - a.farmabilityScore);

  return results;
}
