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
}

export const MAX_ROADMAP_STEPS = 50;

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

    // Default / farmables-only
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

    // Find up to 3 suitable alternatives of similar level and feasibility
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
    return empty;
  }

  // 1. Initial attempt: Use user's requested strategy and parameters
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

  // If the initial plan succeeded in reaching the target VF, return it directly
  if (firstPlan.targetReached || firstPlan.steps.length === 0) {
    const res = firstPlan.steps as RoadmapStepList;
    res.strategyUsed = strategy;
    res.originalStrategy = strategy;
    res.wasStrategyChanged = false;
    res.targetReached = firstPlan.targetReached;
    return res;
  }

  // 2. The first plan didn't reach the target within 50 plays!
  // "Change the strategy if the first plan doesn't work"
  interface AttemptConfig {
    strat: RoadmapStrategy;
    feas: number;
    lamp: SDVXLamp;
    reason: string;
  }

  const escalationList: AttemptConfig[] = [];

  // Phase A: Try alternative strategies with current minFeasibility & lamp
  if (strategy === 'most-feasible') {
    escalationList.push({
      strat: 'balanced',
      feas: minFeasibility,
      lamp: targetLamp,
      reason: `Switched from "Most Feasible" to "Balanced Growth" to reach ${targetVF.toFixed(3)} VF within 50 plays.`,
    });
    escalationList.push({
      strat: 'fastest',
      feas: minFeasibility,
      lamp: targetLamp,
      reason: `Switched from "Most Feasible" to "Fastest Gain" to maximize VF per play and reach ${targetVF.toFixed(3)} VF within 50 plays.`,
    });
  } else if (strategy === 'upscores-first') {
    escalationList.push({
      strat: 'most-feasible',
      feas: minFeasibility,
      lamp: targetLamp,
      reason: `Switched from "Upscores First" to "Most Feasible" combining high-gain farmable songs to reach ${targetVF.toFixed(3)} VF.`,
    });
    escalationList.push({
      strat: 'balanced',
      feas: minFeasibility,
      lamp: targetLamp,
      reason: `Switched to "Balanced Growth" to reach ${targetVF.toFixed(3)} VF within 50 plays.`,
    });
    escalationList.push({
      strat: 'fastest',
      feas: minFeasibility,
      lamp: targetLamp,
      reason: `Switched to "Fastest Gain" to reach ${targetVF.toFixed(3)} VF within 50 plays.`,
    });
  } else if (strategy === 'farmables-only') {
    escalationList.push({
      strat: 'most-feasible',
      feas: minFeasibility,
      lamp: targetLamp,
      reason: `Unlocked existing upscores in "Most Feasible" strategy to reach ${targetVF.toFixed(3)} VF.`,
    });
    escalationList.push({
      strat: 'balanced',
      feas: minFeasibility,
      lamp: targetLamp,
      reason: `Switched to "Balanced Growth" to reach ${targetVF.toFixed(3)} VF within 50 plays.`,
    });
    escalationList.push({
      strat: 'fastest',
      feas: minFeasibility,
      lamp: targetLamp,
      reason: `Switched to "Fastest Gain" to reach ${targetVF.toFixed(3)} VF within 50 plays.`,
    });
  } else if (strategy === 'balanced') {
    escalationList.push({
      strat: 'fastest',
      feas: minFeasibility,
      lamp: targetLamp,
      reason: `Switched from "Balanced Growth" to "Fastest Gain" to maximize VF per play and reach ${targetVF.toFixed(3)} VF within 50 plays.`,
    });
  }

  // Phase B: Try relaxing feasibility filter (unlocks higher level stretch charts)
  if (minFeasibility > 20) {
    escalationList.push({
      strat: 'balanced',
      feas: 20,
      lamp: targetLamp,
      reason: `Switched to "Balanced Growth" with accessible stretch charts (≥20% feas) to reach ${targetVF.toFixed(3)} VF.`,
    });
    escalationList.push({
      strat: 'fastest',
      feas: 20,
      lamp: targetLamp,
      reason: `Switched to "Fastest Gain" with accessible stretch charts (≥20% feas) to reach ${targetVF.toFixed(3)} VF.`,
    });
  }

  if (minFeasibility > 0) {
    escalationList.push({
      strat: 'fastest',
      feas: 0,
      lamp: targetLamp,
      reason: `Switched to "Fastest Gain" including all available challenge charts to reach ${targetVF.toFixed(3)} VF within 50 plays.`,
    });
  }

  // Phase C: Try lamp escalation (MAXXIVE CLEAR, ULTIMATE CHAIN)
  if (targetLamp !== 'MAXXIVE CLEAR' && targetLamp !== 'ULTIMATE CHAIN') {
    escalationList.push({
      strat: 'fastest',
      feas: 0,
      lamp: 'MAXXIVE CLEAR',
      reason: `Escalated to "Fastest Gain" with Maxxive Clear (104%) benchmarks to reach ${targetVF.toFixed(3)} VF within 50 plays.`,
    });
  }

  if (targetLamp !== 'ULTIMATE CHAIN') {
    escalationList.push({
      strat: 'fastest',
      feas: 0,
      lamp: 'ULTIMATE CHAIN',
      reason: `Escalated to "Fastest Gain" with Ultimate Chain (UC) benchmarks to reach ${targetVF.toFixed(3)} VF within 50 plays.`,
    });
  }

  // Evaluate escalation attempts and pick the first that reaches targetVF
  let bestPlan = firstPlan;
  let bestConfig: AttemptConfig = {
    strat: strategy,
    feas: minFeasibility,
    lamp: targetLamp,
    reason: `Maximized available gains (reaches ${firstPlan.finalVF.toFixed(3)} VF within 50 plays).`,
  };

  for (const attempt of escalationList) {
    const plan = tryGeneratePlan(
      currentVF,
      targetVF,
      upscores,
      farmables,
      version,
      attempt.strat,
      attempt.lamp,
      attempt.feas,
      maxSteps,
    );

    if (plan.finalVF > bestPlan.finalVF) {
      bestPlan = plan;
      bestConfig = attempt;
    }

    if (plan.targetReached) {
      const res = plan.steps as RoadmapStepList;
      res.strategyUsed = attempt.strat;
      res.originalStrategy = strategy;
      res.wasStrategyChanged = true;
      res.strategyChangeReason = attempt.reason;
      res.effectiveLamp = attempt.lamp;
      res.targetReached = true;
      for (const step of res) {
        step.strategyUsed = attempt.strat;
        step.strategyAdjusted = true;
        step.strategyAdjustmentReason = attempt.reason;
      }
      return res;
    }
  }

  // If no escalation completely reached targetVF, return the best achievable plan
  const res = bestPlan.steps as RoadmapStepList;
  res.strategyUsed = bestConfig.strat;
  res.originalStrategy = strategy;
  res.wasStrategyChanged = bestConfig.strat !== strategy || bestConfig.lamp !== targetLamp;
  res.strategyChangeReason = bestConfig.reason;
  res.effectiveLamp = bestConfig.lamp;
  res.targetReached = false;
  for (const step of res) {
    step.strategyUsed = bestConfig.strat;
    step.strategyAdjusted = res.wasStrategyChanged;
    step.strategyAdjustmentReason = bestConfig.reason;
  }
  return res;
}
