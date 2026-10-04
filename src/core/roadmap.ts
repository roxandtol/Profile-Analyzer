import {
  FarmableOpportunity,
  RoadmapStep,
  RoadmapStepAlternative,
  RoadmapStepList,
  RoadmapStrategy,
  SDVXLamp,
  UpscoreOpportunity,
  VolforceVersion,
} from './types';
import { calculateChartVF } from './volforce';

interface CandidateItem {
  id: string;
  type: 'upscore' | 'farmable';
  chart: any;
  song: any;
  currentScore?: number;
  currentLamp?: any;
  targetScore: number;
  targetLamp: any;
  targetGrade?: any;
  chartVF: number;
  netVFGain: number;
  levelNum: number;
  rationale: string;
  primaryFactor: string;
  feasibility?: any;
  feasibilityPercent: number;
  isQuickWin?: boolean;
  isHigherStuff?: boolean;
}

export const MAX_ROADMAP_STEPS = 50;

/**
 * Determines whether a chart acts as a high-yield "Target Pusher" for bridging to targetVF.
 */
export function isPusherChart(
  cand: {
    levelNum?: number;
    netVFGain?: number;
    chartVF?: number;
    isHigherStuff?: boolean;
    targetLamp?: string;
    type?: string;
    feasibilityPercent?: number;
  },
  _targetVF?: number,
): boolean {
  return !!cand.isHigherStuff;
}

/**
 * Sorts pusher candidates prioritizing high feasibility so pushers are only
 * slightly less feasible than comfortable plays (e.g. 90 -> 80), not a lot less.
 */
function sortPusherCandidates(candidates: CandidateItem[]): CandidateItem[] {
  return candidates.sort((a, b) => {
    // Score heavily weights feasibility so high feasibility pushers (~80%)
    // are chosen over low-feasibility reaches (e.g. 20-40%).
    const scoreA = a.feasibilityPercent * 4 + a.netVFGain * 1000;
    const scoreB = b.feasibilityPercent * 4 + b.netVFGain * 1000;
    if (Math.abs(scoreB - scoreA) > 0.001) {
      return scoreB - scoreA;
    }
    return b.feasibilityPercent - a.feasibilityPercent || b.netVFGain - a.netVFGain;
  });
}


function buildCandidates(
  upscores: UpscoreOpportunity[],
  farmables: FarmableOpportunity[],
  version: VolforceVersion,
  strategy: RoadmapStrategy,
  effectiveLamp: SDVXLamp,
  minFeasibility: number,
): CandidateItem[] {
  const candidates: CandidateItem[] = [];

  if (strategy !== 'farmables-only') {
    for (const u of upscores) {
      const feasPercent = u.feasibility?.feasibilityPercent ?? 50;
      if (minFeasibility > 0 && feasPercent < minFeasibility) continue;

      let candTargetLamp = u.targetLamp || effectiveLamp;
      if (u.currentLamp === 'EXCESSIVE CLEAR' && candTargetLamp === 'EXCESSIVE CLEAR') {
        candTargetLamp = 'MAXXIVE CLEAR';
      }
      if (effectiveLamp === 'ULTIMATE CHAIN') {
        candTargetLamp = 'ULTIMATE CHAIN';
      } else if (effectiveLamp === 'MAXXIVE CLEAR' && candTargetLamp === 'EXCESSIVE CLEAR') {
        candTargetLamp = 'MAXXIVE CLEAR';
      }

      let extraGain = 0;
      if (candTargetLamp !== (u.targetLamp || effectiveLamp)) {
        const baseVF = calculateChartVF(u.targetScore, u.targetLamp || effectiveLamp, u.levelNum, version);
        const newVF = calculateChartVF(u.targetScore, candTargetLamp, u.levelNum, version);
        extraGain = Math.max(0, newVF - baseVF);
      }
      const upgradedVF = u.targetVF + extraGain;
      const netGain = Math.round((u.netVFGain + extraGain) * 1000) / 1000;

      candidates.push({
        id: u.chart.chartID,
        type: 'upscore',
        chart: u.chart,
        song: u.song,
        currentScore: u.currentScore,
        currentLamp: u.currentLamp,
        targetScore: u.targetScore,
        targetLamp: candTargetLamp,
        targetGrade: u.targetGrade,
        chartVF: upgradedVF,
        netVFGain: netGain,
        levelNum: u.levelNum,
        rationale: u.description,
        primaryFactor:
          version === 'vf7'
            ? `Decimal ${u.levelNum.toFixed(1)} upscore (+${netGain.toFixed(3)} VF)`
            : `Upscore to ${u.targetGrade} (+${netGain.toFixed(3)} VF)`,
        feasibility: u.feasibility,
        feasibilityPercent: feasPercent,
        isQuickWin:
          u.category === 'lamp-upgrade' ||
          (u.category === 'near-s' && feasPercent >= 65),
      });
    }
  }

  for (const f of farmables) {
    const feasPercent = f.feasibility?.feasibilityPercent ?? 50;
    if (minFeasibility > 0 && feasPercent < minFeasibility) continue;

    let farmTargetLamp = f.projectedLamp || effectiveLamp;
    if (f.existingLamp === 'EXCESSIVE CLEAR' && farmTargetLamp === 'EXCESSIVE CLEAR') {
      farmTargetLamp = 'MAXXIVE CLEAR';
    }
    if (effectiveLamp === 'ULTIMATE CHAIN') {
      farmTargetLamp = 'ULTIMATE CHAIN';
    } else if (effectiveLamp === 'MAXXIVE CLEAR' && farmTargetLamp === 'EXCESSIVE CLEAR') {
      farmTargetLamp = 'MAXXIVE CLEAR';
    }

    let extraGain = 0;
    if (farmTargetLamp !== (f.projectedLamp || effectiveLamp)) {
      const baseVF = calculateChartVF(f.projectedScore, f.projectedLamp || effectiveLamp, f.levelNum, version);
      const newVF = calculateChartVF(f.projectedScore, farmTargetLamp, f.levelNum, version);
      extraGain = Math.max(0, newVF - baseVF);
    }
    const upgradedVF = f.projectedVF + extraGain;
    const netGain = Math.round((f.netVFGain + extraGain) * 1000) / 1000;

    candidates.push({
      id: f.chart.chartID,
      type: 'farmable',
      chart: f.chart,
      song: f.song,
      currentScore: f.existingScore,
      currentLamp: f.existingLamp,
      targetScore: f.projectedScore,
      targetLamp: farmTargetLamp,
      targetGrade: 'S',
      chartVF: upgradedVF,
      netVFGain: netGain,
      levelNum: f.levelNum,
      rationale: f.isPlayed
        ? `Underplayed score (${f.existingScore?.toLocaleString()}). S-rank yields +${netGain.toFixed(3)} net profile VF.`
        : `Unplayed farmable chart! S-rank yields +${netGain.toFixed(3)} net profile VF.`,
      primaryFactor: f.primaryAdvantage,
      feasibility: f.feasibility,
      feasibilityPercent: feasPercent,
      isQuickWin: false,
    });
  }

  return candidates;
}

function sortCandidates(candidates: CandidateItem[], strategy: RoadmapStrategy): CandidateItem[] {
  return candidates.sort((a, b) => {
    if (strategy === 'most-feasible') {
      if (a.isQuickWin && !b.isQuickWin && a.feasibilityPercent >= 65) return -1;
      if (!a.isQuickWin && b.isQuickWin && b.feasibilityPercent >= 65) return 1;

      const tierA =
        a.feasibilityPercent >= 80 ? 4 : a.feasibilityPercent >= 65 ? 3 : a.feasibilityPercent >= 45 ? 2 : 1;
      const tierB =
        b.feasibilityPercent >= 80 ? 4 : b.feasibilityPercent >= 65 ? 3 : b.feasibilityPercent >= 45 ? 2 : 1;

      if (tierA !== tierB) return tierB - tierA;

      const feasDiff = b.feasibilityPercent - a.feasibilityPercent;
      if (Math.abs(feasDiff) >= 4) return feasDiff;

      return b.netVFGain - a.netVFGain;
    }

    if (strategy === 'balanced') {
      const penaltyA = a.feasibilityPercent < 45 ? 120 : 0;
      const penaltyB = b.feasibilityPercent < 45 ? 120 : 0;
      const scoreA = a.feasibilityPercent * 1.5 + a.netVFGain * 1000 * 2.5 - penaltyA;
      const scoreB = b.feasibilityPercent * 1.5 + b.netVFGain * 1000 * 2.5 - penaltyB;
      return scoreB - scoreA;
    }

    if (strategy === 'fastest') {
      const gainDiff = b.netVFGain - a.netVFGain;
      if (Math.abs(gainDiff) >= 0.005) return gainDiff;
      return b.feasibilityPercent - a.feasibilityPercent;
    }

    if (strategy === 'upscores-first') {
      if (a.type !== b.type) {
        return a.type === 'upscore' ? -1 : 1;
      }
      return b.feasibilityPercent - a.feasibilityPercent || b.netVFGain - a.netVFGain;
    }

    return b.feasibilityPercent - a.feasibilityPercent || b.netVFGain - a.netVFGain;
  });
}

function assembleSteps(
  candidates: CandidateItem[],
  currentVF: number,
  targetVF: number,
  maxSteps: number,
  minFeasibility: number,
): {
  steps: RoadmapStep[];
  finalVF: number;
  targetReached: boolean;
} {
  let runningVF = currentVF;
  const usedChartIDs = new Set<string>();
  const selectedCandidates: CandidateItem[] = [];

  const stepLimit = Math.max(1, maxSteps);
  for (const cand of candidates) {
    if (selectedCandidates.length >= stepLimit) break;
    if (usedChartIDs.has(cand.id)) continue;
    usedChartIDs.add(cand.id);

    runningVF = Math.round((runningVF + cand.netVFGain) * 1000) / 1000;
    selectedCandidates.push(cand);

    if (runningVF >= targetVF) break;
  }

  const unusedCandidates = candidates.filter((c) => !usedChartIDs.has(c.id));
  const steps: RoadmapStep[] = [];
  let currentCumulative = currentVF;

  for (let i = 0; i < selectedCandidates.length; i++) {
    const cand = selectedCandidates[i];
    currentCumulative = Math.round((currentCumulative + cand.netVFGain) * 1000) / 1000;

    const alternatives: RoadmapStepAlternative[] = unusedCandidates
      .filter((alt) => {
        const levelDelta = Math.abs(Math.floor(alt.levelNum) - Math.floor(cand.levelNum));
        return (
          levelDelta <= 1 &&
          alt.netVFGain >= 0.005 &&
          (minFeasibility === 0 || alt.feasibilityPercent >= minFeasibility)
        );
      })
      .sort((a, b) => b.feasibilityPercent - a.feasibilityPercent || b.netVFGain - a.netVFGain)
      .slice(0, 3)
      .map((alt) => ({
        chart: alt.chart,
        song: alt.song,
        type: alt.type,
        currentScore: alt.currentScore,
        currentLamp: alt.currentLamp,
        targetScore: alt.targetScore,
        targetLamp: alt.targetLamp,
        targetGrade: alt.targetGrade || 'S',
        chartVF: alt.chartVF,
        netVFGain: alt.netVFGain,
        rationale: alt.rationale,
        primaryFactor: alt.primaryFactor,
        feasibility: alt.feasibility,
      }));

    steps.push({
      stepNumber: i + 1,
      type: cand.type,
      chart: cand.chart,
      song: cand.song,
      currentScore: cand.currentScore,
      currentLamp: cand.currentLamp,
      targetScore: cand.targetScore,
      targetLamp: cand.targetLamp,
      targetGrade: cand.targetGrade || 'S',
      chartVF: cand.chartVF,
      netVFGain: cand.netVFGain,
      cumulativeProfileVF: currentCumulative,
      completed: false,
      rationale: cand.rationale,
      primaryFactor: cand.primaryFactor,
      feasibility: cand.feasibility,
      alternatives,
    });
  }

  return {
    steps,
    finalVF: currentCumulative,
    targetReached: currentCumulative >= targetVF,
  };
}

function tryGeneratePlan(
  currentVF: number,
  targetVF: number,
  upscores: UpscoreOpportunity[],
  farmables: FarmableOpportunity[],
  version: VolforceVersion,
  strategy: RoadmapStrategy,
  targetLamp: SDVXLamp,
  minFeasibility: number,
  maxSteps: number,
) {
  const candidates = buildCandidates(upscores, farmables, version, strategy, targetLamp, minFeasibility);
  sortCandidates(candidates, strategy);
  return assembleSteps(candidates, currentVF, targetVF, maxSteps, minFeasibility);
}

/**
 * Core Blending Algorithm:
 * "Always try to maximize the feasible stuff until it doesn't work, then maximize with the higher stuff"
 *
 * Evaluates candidate counts m from maxSteps down to 0:
 * Finds the maximum number of feasible charts (m) that can be included
 * while filling remaining (maxSteps - m) slots with highest-yield charts to reach targetVF.
 */
function maximizeFeasibleWithHigherStuff(
  currentVF: number,
  targetVF: number,
  upscores: UpscoreOpportunity[],
  farmables: FarmableOpportunity[],
  version: VolforceVersion,
  strategy: RoadmapStrategy,
  targetLamp: SDVXLamp,
  minFeasibility: number,
  maxSteps: number = MAX_ROADMAP_STEPS,
): RoadmapStepList {
  const stepLimit = Math.max(1, maxSteps);

  // Helper to attempt blending with a specific higher-stuff lamp and feasibility gate
  function tryBlend(lamp: SDVXLamp, feasCutoff: number) {
    // 1. Feasible Pool: all candidates with solid feasibility (>= 45% or quick wins)
    const allFeasible = buildCandidates(upscores, farmables, version, strategy, targetLamp, feasCutoff);
    const feasiblePool = sortCandidates(
      allFeasible.filter((c) => c.feasibilityPercent >= 45 || c.isQuickWin),
      'most-feasible',
    );

    // Baseline feasibility of the top feasible plays (e.g. ~90%)
    const sampleCount = Math.min(stepLimit, feasiblePool.length);
    const topFeasible = feasiblePool.slice(0, sampleCount);
    const baselineFeas = topFeasible.length > 0
      ? Math.round(topFeasible.reduce((acc, c) => acc + c.feasibilityPercent, 0) / topFeasible.length)
      : 85;

    // 2. Higher Pool: candidates with meaningful net gain (>= 0.008 VF)
    const allHigher = buildCandidates(upscores, farmables, version, strategy, lamp, 0);

    let bestBlend: {
      steps: CandidateItem[];
      finalVF: number;
    } | null = null;

    // Search m from max possible down to 0 to find the MAXIMUM feasible count
    const startM = Math.min(stepLimit, feasiblePool.length);

    // Target pushers should only be slightly less feasible, not a lot less (for example, 90 -> 80).
    // Test progressively:
    // Tier 1: slightly less feasible (within ~15% of baseline, e.g. 90 -> 75, capturing 80%+)
    // Tier 2: moderately less feasible (within ~25% of baseline, e.g. 90 -> 65)
    // Tier 3: stretch tier (within ~35% of baseline, e.g. 90 -> 55)
    // Tier 4: full fallback to 0 (so the roadmap ALWAYS finds a way to reach target VF)
    const pusherCutoffs = [
      Math.max(45, baselineFeas - 15),
      Math.max(35, baselineFeas - 25),
      Math.max(25, baselineFeas - 35),
      0,
    ];

    for (const pusherMinFeas of pusherCutoffs) {
      const eligibleHigher = allHigher.filter(
        (c) => c.feasibilityPercent >= pusherMinFeas && c.netVFGain >= 0.008,
      );
      const higherPool = sortPusherCandidates(eligibleHigher);

      for (let m = startM; m >= 0; m--) {
        const selected: CandidateItem[] = [];
        const usedChartIDs = new Set<string>();
        let runningVF = currentVF;

        // Add up to m feasible candidates
        for (let i = 0; i < m && i < feasiblePool.length; i++) {
          const cand = feasiblePool[i];
          if (usedChartIDs.has(cand.id)) continue;
          usedChartIDs.add(cand.id);
          runningVF = Math.round((runningVF + cand.netVFGain) * 1000) / 1000;
          selected.push({ ...cand, isHigherStuff: false });
          if (runningVF >= targetVF) {
            // Reached target entirely with feasible plays!
            return {
              selected,
              finalVF: runningVF,
              targetReached: true,
              lamp,
            };
          }
        }

        // Fill remaining slots with the best pusher charts from higherPool
        for (const cand of higherPool) {
          if (selected.length >= stepLimit) break;
          if (usedChartIDs.has(cand.id)) continue;
          usedChartIDs.add(cand.id);
          runningVF = Math.round((runningVF + cand.netVFGain) * 1000) / 1000;
          selected.push({ ...cand, isHigherStuff: true });
          if (runningVF >= targetVF) break;
        }

        if (!bestBlend || runningVF > bestBlend.finalVF) {
          bestBlend = {
            steps: selected,
            finalVF: runningVF,
          };
        }

        if (runningVF >= targetVF) {
          // Found the plan with maximum feasible charts that reaches targetVF
          return {
            selected,
            finalVF: runningVF,
            targetReached: true,
            lamp,
          };
        }
      }

      // If this tier reached targetVF, do NOT fall through to lower feasibility tiers!
      if (bestBlend && bestBlend.finalVF >= targetVF) {
        break;
      }
    }

    return {
      selected: bestBlend ? bestBlend.steps : [],
      finalVF: bestBlend ? bestBlend.finalVF : currentVF,
      targetReached: false,
      lamp,
    };
  }

  // Phase 1: Try with user's targetLamp
  let outcome = tryBlend(targetLamp, minFeasibility > 0 ? minFeasibility : 40);

  // Phase 2: If target not reached and minFeasibility was high, try relaxing feasibility
  if (!outcome.targetReached && minFeasibility > 20) {
    const outcomeRelaxed = tryBlend(targetLamp, 20);
    if (outcomeRelaxed.targetReached || outcomeRelaxed.finalVF > outcome.finalVF) {
      outcome = outcomeRelaxed;
    }
  }

  // Phase 3: If target still not reached, escalate higher stuff lamp to MAXXIVE CLEAR
  if (!outcome.targetReached && targetLamp !== 'MAXXIVE CLEAR' && targetLamp !== 'ULTIMATE CHAIN') {
    const outcomeMaxxive = tryBlend('MAXXIVE CLEAR', 0);
    if (outcomeMaxxive.targetReached || outcomeMaxxive.finalVF > outcome.finalVF) {
      outcome = outcomeMaxxive;
    }
  }

  // Phase 4: If target still not reached, escalate higher stuff lamp to ULTIMATE CHAIN
  if (!outcome.targetReached && targetLamp !== 'ULTIMATE CHAIN') {
    const outcomeUC = tryBlend('ULTIMATE CHAIN', 0);
    if (outcomeUC.targetReached || outcomeUC.finalVF > outcome.finalVF) {
      outcome = outcomeUC;
    }
  }

  // Assemble full RoadmapStep list with alternatives and cumulative VF
  const rawCandidates = outcome.selected;
  const unusedCandidates = buildCandidates(upscores, farmables, version, strategy, outcome.lamp, 0).filter(
    (c) => !rawCandidates.some((sel) => sel.id === c.id),
  );

  const steps: RoadmapStep[] = [];
  let currentCumulative = currentVF;

  for (let i = 0; i < rawCandidates.length; i++) {
    const cand = rawCandidates[i];
    currentCumulative = Math.round((currentCumulative + cand.netVFGain) * 1000) / 1000;
    const isPusher = cand.isHigherStuff ?? false;

    const alternatives: RoadmapStepAlternative[] = unusedCandidates
      .filter((alt) => {
        const levelDelta = Math.abs(Math.floor(alt.levelNum) - Math.floor(cand.levelNum));
        if (levelDelta > 1 || alt.netVFGain < 0.005) return false;
        if (isPusher) {
          return (
            alt.netVFGain >= 0.010 &&
            alt.feasibilityPercent >= Math.max(35, (cand.feasibilityPercent || 70) - 15)
          );
        }
        return alt.feasibilityPercent >= 40;
      })
      .sort((a, b) => {
        if (isPusher) {
          const scoreA = a.feasibilityPercent * 4 + a.netVFGain * 1000;
          const scoreB = b.feasibilityPercent * 4 + b.netVFGain * 1000;
          return scoreB - scoreA;
        }
        return b.feasibilityPercent - a.feasibilityPercent || b.netVFGain - a.netVFGain;
      })
      .slice(0, 3)
      .map((alt) => ({
        chart: alt.chart,
        song: alt.song,
        type: alt.type,
        currentScore: alt.currentScore,
        currentLamp: alt.currentLamp,
        targetScore: alt.targetScore,
        targetLamp: alt.targetLamp,
        targetGrade: alt.targetGrade || 'S',
        chartVF: alt.chartVF,
        netVFGain: alt.netVFGain,
        rationale: alt.rationale,
        primaryFactor: alt.primaryFactor,
        feasibility: alt.feasibility,
      }));

    steps.push({
      stepNumber: i + 1,
      type: cand.type,
      chart: cand.chart,
      song: cand.song,
      currentScore: cand.currentScore,
      currentLamp: cand.currentLamp,
      targetScore: cand.targetScore,
      targetLamp: cand.targetLamp,
      targetGrade: cand.targetGrade || 'S',
      chartVF: cand.chartVF,
      netVFGain: cand.netVFGain,
      cumulativeProfileVF: currentCumulative,
      completed: false,
      rationale: isPusher
        ? `Strategic high-yield target pusher (+${cand.netVFGain.toFixed(3)} VF, ${cand.feasibilityPercent}% feas) to bridge your profile to ${targetVF.toFixed(3)} VF.`
        : cand.rationale,
      primaryFactor: isPusher
        ? `Target Pusher (+${cand.netVFGain.toFixed(3)} VF)`
        : cand.primaryFactor,
      feasibility: cand.feasibility,
      alternatives,
      strategyUsed: strategy,
      strategyAdjusted: isPusher || outcome.lamp !== targetLamp,
      isHigherStuff: isPusher,
    });
  }

  const pusherCount = steps.filter((s) => s.isHigherStuff).length;
  const feasibleCount = steps.length - pusherCount;

  const res = steps as RoadmapStepList;
  res.strategyUsed = strategy;
  res.originalStrategy = strategy;
  res.wasStrategyChanged = pusherCount > 0 || outcome.lamp !== targetLamp;
  res.feasibleCount = feasibleCount;
  res.higherStuffCount = pusherCount;
  res.effectiveLamp = outcome.lamp;
  res.targetReached = outcome.targetReached;

  if (pusherCount > 0) {
    const lampNote = outcome.lamp !== targetLamp ? ` with ${outcome.lamp} goals` : '';
    res.strategyChangeReason = `Maximized ${feasibleCount} feasible ${feasibleCount === 1 ? 'goal' : 'goals'} with ${pusherCount} high-yield target ${pusherCount === 1 ? 'pusher' : 'pushers'}${lampNote} to reach ${targetVF.toFixed(3)} VF.`;
  } else {
    res.strategyChangeReason = `Achieved ${targetVF.toFixed(3)} VF using 100% feasible goals (${feasibleCount} steps).`;
  }

  return res;
}

export function generateRoadmap(
  currentVF: number,
  targetVF: number,
  upscores: UpscoreOpportunity[],
  farmables: FarmableOpportunity[],
  version: VolforceVersion = 'vf7',
  strategy: RoadmapStrategy = 'most-feasible',
  targetLamp: SDVXLamp = 'EXCESSIVE CLEAR',
  minFeasibility: number = 0,
  maxSteps: number = MAX_ROADMAP_STEPS,
): RoadmapStepList {
  const deltaNeeded = Math.max(0, targetVF - currentVF);

  if (deltaNeeded <= 0.0001) {
    const empty = [] as RoadmapStepList;
    empty.strategyUsed = strategy;
    empty.originalStrategy = strategy;
    empty.wasStrategyChanged = false;
    empty.targetReached = true;
    empty.feasibleCount = 0;
    empty.higherStuffCount = 0;
    return empty;
  }

  // If strategy is most-feasible or upscores-first: maximize feasible stuff and fill with higher stuff!
  if (strategy === 'most-feasible' || strategy === 'upscores-first') {
    return maximizeFeasibleWithHigherStuff(
      currentVF,
      targetVF,
      upscores,
      farmables,
      version,
      strategy,
      targetLamp,
      minFeasibility,
      maxSteps,
    );
  }

  // For other strategies (e.g. fastest, balanced): try requested strategy first
  const firstPlan = tryGeneratePlan(
    currentVF,
    targetVF,
    upscores,
    farmables,
    version,
    strategy,
    targetLamp,
    minFeasibility,
    maxSteps,
  );

  if (firstPlan.targetReached || firstPlan.steps.length === 0) {
    const res = firstPlan.steps as RoadmapStepList;
    res.strategyUsed = strategy;
    res.originalStrategy = strategy;
    res.wasStrategyChanged = false;
    res.targetReached = firstPlan.targetReached;
    res.feasibleCount = firstPlan.steps.length;
    res.higherStuffCount = 0;
    return res;
  }

  // If requested strategy falls short in 50 steps: maximize feasible stuff with higher stuff!
  return maximizeFeasibleWithHigherStuff(
    currentVF,
    targetVF,
    upscores,
    farmables,
    version,
    strategy,
    targetLamp,
    minFeasibility,
    maxSteps,
  );
}
