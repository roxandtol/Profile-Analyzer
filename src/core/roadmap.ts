import {
  FarmableOpportunity,
  RoadmapStep,
  RoadmapStepAlternative,
  RoadmapStrategy,
  UpscoreOpportunity,
  VolforceVersion,
} from './types';

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

export function generateRoadmap(
  currentVF: number,
  targetVF: number,
  upscores: UpscoreOpportunity[],
  farmables: FarmableOpportunity[],
  version: VolforceVersion = 'vf7',
  strategy: RoadmapStrategy = 'most-feasible',
  targetLamp: any = 'EXCESSIVE CLEAR',
  minFeasibility: number = 0,
  maxSteps: number = MAX_ROADMAP_STEPS,
): RoadmapStep[] {
  const steps: RoadmapStep[] = [];
  const deltaNeeded = Math.max(0, targetVF - currentVF);

  if (deltaNeeded <= 0.0001) {
    return steps;
  }

  // 1. Build unified candidate pool (hide items below minFeasibility)
  const candidates: CandidateItem[] = [];

  if (strategy !== 'farmables-only') {
    for (const u of upscores) {
      const feasPercent = u.feasibility?.feasibilityPercent ?? 50;
      if (minFeasibility > 0 && feasPercent < minFeasibility) continue;
      let candTargetLamp = u.targetLamp || targetLamp;
      if (u.currentLamp === 'EXCESSIVE CLEAR' && candTargetLamp === 'EXCESSIVE CLEAR') {
        candTargetLamp = 'MAXXIVE CLEAR';
      }

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
        chartVF: u.targetVF,
        netVFGain: u.netVFGain,
        levelNum: u.levelNum,
        rationale: u.description,
        primaryFactor:
          version === 'vf7'
            ? `Decimal ${u.levelNum.toFixed(1)} upscore (+${u.netVFGain.toFixed(3)} VF)`
            : `Upscore to ${u.targetGrade} (+${u.netVFGain.toFixed(3)} VF)`,
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

    let farmTargetLamp = f.projectedLamp || targetLamp;
    if (f.existingLamp === 'EXCESSIVE CLEAR' && farmTargetLamp === 'EXCESSIVE CLEAR') {
      farmTargetLamp = 'MAXXIVE CLEAR';
    }

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
      chartVF: f.projectedVF,
      netVFGain: f.netVFGain,
      levelNum: f.levelNum,
      rationale: f.isPlayed
        ? `Underplayed score (${f.existingScore?.toLocaleString()}). S-rank yields +${f.netVFGain.toFixed(3)} net profile VF.`
        : `Unplayed farmable chart! S-rank yields +${f.netVFGain.toFixed(3)} net profile VF.`,
      primaryFactor: f.primaryAdvantage,
      feasibility: f.feasibility,
      feasibilityPercent: feasPercent,
      isQuickWin: false,
    });
  }

  // 2. Sort candidates based on strategy
  candidates.sort((a, b) => {
    if (strategy === 'most-feasible') {
      // Prioritize feasibility first: quick wins, then feasibility tiers
      if (a.isQuickWin && !b.isQuickWin && a.feasibilityPercent >= 65) return -1;
      if (!a.isQuickWin && b.isQuickWin && b.feasibilityPercent >= 65) return 1;

      // Group into tiers: 80+, 65-79, 45-64, <45
      const tierA =
        a.feasibilityPercent >= 80 ? 4 : a.feasibilityPercent >= 65 ? 3 : a.feasibilityPercent >= 45 ? 2 : 1;
      const tierB =
        b.feasibilityPercent >= 80 ? 4 : b.feasibilityPercent >= 65 ? 3 : b.feasibilityPercent >= 45 ? 2 : 1;

      if (tierA !== tierB) return tierB - tierA; // Higher tier first

      // Within tier: highest feasibility percentage first
      const feasDiff = b.feasibilityPercent - a.feasibilityPercent;
      if (Math.abs(feasDiff) >= 4) return feasDiff;

      // Tiebreaker: net VF gain
      return b.netVFGain - a.netVFGain;
    }

    if (strategy === 'balanced') {
      // Balanced: feasibility weighted alongside VF gain, penalizing sub-45% stretch plays
      const penaltyA = a.feasibilityPercent < 45 ? 120 : 0;
      const penaltyB = b.feasibilityPercent < 45 ? 120 : 0;
      const scoreA = a.feasibilityPercent * 1.5 + a.netVFGain * 1000 * 2.5 - penaltyA;
      const scoreB = b.feasibilityPercent * 1.5 + b.netVFGain * 1000 * 2.5 - penaltyB;
      return scoreB - scoreA;
    }

    if (strategy === 'fastest') {
      // Fastest: greedy by highest net VF gain per play
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

  // 3. Assemble steps and calculate cumulative VF
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

  // 4. Attach alternatives for each step from unused candidates
  const unusedCandidates = candidates.filter((c) => !usedChartIDs.has(c.id));

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

  return steps;
}
