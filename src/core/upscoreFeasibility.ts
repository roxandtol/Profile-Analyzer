import { KamaiChart, SDVXLamp, UpscoreFeasibility } from './types';
import { parseTierEase } from './farmable';

/**
 * Calculates the expected profile Volforce threshold where a typical player
 * in the Tachi dataset can achieve a given target score/grade on a chart.
 */
export function calculateExpectedVolforce(
  levelNum: number,
  sTierText?: string,
  targetGrade: string = 'S',
  individualDifference: boolean = false,
  targetLamp: SDVXLamp = 'EXCESSIVE CLEAR',
): number {
  // Base requirement: an average player with profile VF = levelNum + 0.5 can S-rank charts of this level.
  // E.g. Level 17.0 -> 17.5 VF, Level 18.0 -> 18.5 VF, Level 18.4 -> 18.9 VF, Level 19.0 -> 19.5 VF
  let expectedVF = levelNum + 0.5;

  // Community S-tier adjustment:
  // T10 is easiest (subtracts ~0.36 VF), T1 is hardest (adds ~0.36 VF)
  const tierEase = parseTierEase(sTierText);
  const tierAdjustment = (tierEase - 5.5) * 0.08;
  expectedVF -= tierAdjustment;

  // Individual difference / gimmicks (awkward one-handed, unusual tempo, cross-hands)
  if (individualDifference) {
    expectedVF += 0.15;
  }

  // Target Grade adjustment:
  if (targetGrade === 'AAA+') {
    expectedVF -= 0.40;
  } else if (targetGrade === 'AAA') {
    expectedVF -= 0.80;
  }

  // Target Lamp adjustment:
  if (targetLamp === 'ULTIMATE CHAIN') {
    // A full combo (UC) requires zero misses across the chart.
    // In Tachi datasets, several players in a Volforce range only achieve UC on a chart
    // when their profile Volforce is approximately levelNum + 0.9 (adjusted for tier & gimmicks).
    expectedVF = levelNum + 0.9 - (tierEase - 5.5) * 0.08 + (individualDifference ? 0.25 : 0);
  } else if (targetLamp === 'PERFECT ULTIMATE CHAIN') {
    expectedVF += 1.20;
  } else if (targetLamp === 'MAXXIVE CLEAR') {
    // Maxxive Rate requires stricter gauge retention than Excessive Clear
    expectedVF += 0.15;
  } else if (targetLamp === 'CLEAR') {
    // Normal clear (70% gauge) is more forgiving than Excessive Clear
    expectedVF -= 0.15;
  }

  return Math.round(expectedVF * 1000) / 1000;
}

/**
 * Determines whether there is sufficient player density in the user's Volforce range
 * who have achieved an Ultimate Chain (UC / Full Combo) on this chart.
 */
export function hasSufficientUCDensity(
  userVF: number,
  chart: KamaiChart,
): boolean {
  const levelNum = chart.levelNum || parseFloat(chart.level) || 0;
  const sTierText = chart.data?.sTier?.text;
  const individualDifference = !!(
    chart.data?.sTier?.individualDifference ||
    chart.data?.clearTier?.individualDifference
  );

  const tierEase = parseTierEase(sTierText);
  let expectedUCVF = levelNum + 0.9 - (tierEase - 5.5) * 0.08;
  if (individualDifference) {
    expectedUCVF += 0.25;
  }

  return userVF >= expectedUCVF;
}

/**
 * Evaluates how easy/feasible an upscore or play is relative to the user's current Volforce,
 * inspired by player performance distributions in the Tachi datasets.
 */
export function calculateUpscoreFeasibility(
  userVF: number,
  chart: KamaiChart,
  currentScore: number,
  targetScore: number,
  targetGrade: string = 'S',
  targetLamp: SDVXLamp = 'EXCESSIVE CLEAR',
): UpscoreFeasibility {
  const levelNum = chart.levelNum || parseFloat(chart.level) || 0;
  const sTierText = chart.data?.sTier?.text;
  const individualDifference = !!(
    chart.data?.sTier?.individualDifference ||
    chart.data?.clearTier?.individualDifference
  );

  const expectedPlayerVF = calculateExpectedVolforce(
    levelNum,
    sTierText,
    targetGrade,
    individualDifference,
    targetLamp,
  );

  const vfFitDelta = Math.round((userVF - expectedPlayerVF) * 1000) / 1000;
  const pointsNeeded = Math.max(0, targetScore - currentScore);

  // Point proximity score (0.0 to 1.0)
  let pointFactor = 0.4;
  if (currentScore === 0) {
    pointFactor = targetLamp === 'ULTIMATE CHAIN' ? 0.30 : 0.35; // unplayed
  } else if (pointsNeeded === 0) {
    // Pure lamp upgrade on already achieved score
    pointFactor = targetLamp === 'ULTIMATE CHAIN' ? 0.85 : 0.95;
  } else if (pointsNeeded <= 15_000) {
    pointFactor = targetLamp === 'ULTIMATE CHAIN' ? 0.90 : 1.0;
  } else if (pointsNeeded <= 35_000) {
    pointFactor = targetLamp === 'ULTIMATE CHAIN' ? 0.75 : 0.85;
  } else if (pointsNeeded <= 60_000) {
    pointFactor = 0.70;
  } else if (pointsNeeded <= 100_000) {
    pointFactor = 0.50;
  }

  // VF Fit score (0 to 100)
  // At vfFitDelta = 0 (exact match), fitScore = 65.
  // At vfFitDelta >= +0.5 (user is higher VF than expected), fitScore >= 85.
  // At vfFitDelta <= -0.6 (user is lower VF than expected), fitScore <= 35.
  const fitScore = Math.min(95, Math.max(10, 65 + vfFitDelta * 40));

  const rawPercent = fitScore * 0.6 + pointFactor * 100 * 0.4;
  const feasibilityPercent = Math.min(98, Math.max(5, Math.round(rawPercent)));

  let feasibilityTier: 'VERY_HIGH' | 'MODERATE' | 'CHALLENGING' | 'HARD';
  let label: string;
  let explanation: string;

  const lampSuffix =
    targetLamp === 'ULTIMATE CHAIN'
      ? ' (UC / Full Combo goal: 0 misses)'
      : targetLamp === 'MAXXIVE CLEAR'
      ? ' (Maxxive Clear goal: 104% coefficient)'
      : targetLamp === 'CLEAR'
      ? ' (Normal Clear goal)'
      : '';

  if (feasibilityPercent >= 80) {
    feasibilityTier = 'VERY_HIGH';
    label = 'Very High Feasibility';
    if (pointsNeeded > 0 && currentScore > 0) {
      explanation = `Comfortably within your ${userVF.toFixed(3)} VF bracket (benchmark: ${expectedPlayerVF.toFixed(1)}+); only ${pointsNeeded.toLocaleString()} pts away!${lampSuffix}`;
    } else if (pointsNeeded === 0 && currentScore > 0) {
      explanation = `Strong mastery of chart (benchmark: ${expectedPlayerVF.toFixed(1)}+ VF). Prime target to bank lamp upgrade.${lampSuffix}`;
    } else {
      explanation = `Chart difficulty (${expectedPlayerVF.toFixed(1)}+ VF) is well within your ${userVF.toFixed(3)} VF comfort zone.${lampSuffix}`;
    }
  } else if (feasibilityPercent >= 65) {
    feasibilityTier = 'MODERATE';
    label = 'Moderate Feasibility';
    if (pointsNeeded > 0 && currentScore > 0) {
      explanation = `Solid match for your ${userVF.toFixed(3)} VF profile (benchmark: ${expectedPlayerVF.toFixed(1)}+); needs ${pointsNeeded.toLocaleString()} pts.${lampSuffix}`;
    } else if (pointsNeeded === 0 && currentScore > 0) {
      explanation = `Matches your profile (benchmark: ${expectedPlayerVF.toFixed(1)}+ VF); achievable lamp upgrade.${lampSuffix}`;
    } else {
      explanation = `Matches your current ${userVF.toFixed(3)} VF profile (benchmark: ${expectedPlayerVF.toFixed(1)}+). Prime farmable target.${lampSuffix}`;
    }
  } else if (feasibilityPercent >= 45) {
    feasibilityTier = 'CHALLENGING';
    label = 'Challenging Push';
    explanation = `Requires pushing near your ceiling (benchmark: ${expectedPlayerVF.toFixed(1)}+ VF vs your ${userVF.toFixed(3)} VF); good session project.${lampSuffix}`;
  } else {
    feasibilityTier = 'HARD';
    label = 'High Effort / Stretch';
    explanation = `High difficulty for your current ${userVF.toFixed(3)} VF profile (benchmark: ${expectedPlayerVF.toFixed(1)}+ VF); recommended as a stretch goal.${lampSuffix}`;
  }

  return {
    expectedPlayerVF,
    userVF,
    vfFitDelta,
    feasibilityPercent,
    feasibilityTier,
    label,
    explanation,
  };
}
