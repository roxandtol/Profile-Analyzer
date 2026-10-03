import {
  AnalyzedScore,
  GameVersionFilter,
  KamaiChart,
  KamaiPB,
  KamaiSong,
  SDVXLamp,
  UpscoreOpportunity,
  VolforceVersion,
} from './types';
import {
  calculateChartVF,
  calculateProfileVF,
  scoreToGrade,
  vfToClass,
} from './volforce';
import {
  calculateUpscoreFeasibility,
  hasSufficientUCDensity,
} from './upscoreFeasibility';
import { isChartInVersion } from './versionFilter';

export interface AnalyzeProfileOptions {
  version?: VolforceVersion;
  versionFilter?: GameVersionFilter;
}

export interface AnalyzerResult {
  analyzedScores: AnalyzedScore[];
  top50Scores: AnalyzedScore[];
  top50Cutoff: number;
  currentProfileVF: number;
  currentClass: string;
  levelDistribution: Record<number, number>;
  upscores: UpscoreOpportunity[];
  chartMap: Map<string, KamaiChart>;
  songMap: Map<string, KamaiSong>;
}

export function analyzeProfile(
  pbs: KamaiPB[],
  charts: KamaiChart[],
  songs: KamaiSong[],
  versionOrOptions: VolforceVersion | AnalyzeProfileOptions = 'vf7',
  filterArg?: GameVersionFilter,
): AnalyzerResult {
  const version: VolforceVersion =
    typeof versionOrOptions === 'string'
      ? versionOrOptions
      : versionOrOptions.version || 'vf7';

  const versionFilter: GameVersionFilter =
    filterArg ||
    (typeof versionOrOptions === 'object'
      ? versionOrOptions.versionFilter || (version === 'vf6' ? 'exceed' : 'all')
      : version === 'vf6'
      ? 'exceed'
      : 'all');

  const chartMap = new Map<string, KamaiChart>();
  for (const c of charts) {
    chartMap.set(c.chartID, c);
  }

  const songMap = new Map<string, KamaiSong>();
  for (const s of songs) {
    songMap.set(s.id, s);
  }

  // 1. Analyze every PB
  const rawScores: AnalyzedScore[] = [];

  for (const pb of pbs) {
    const chart = chartMap.get(pb.chartID) ?? {
      chartID: pb.chartID,
      difficulty: 'MXM',
      level: '18',
      levelNum: 18,
    };

    const song = songMap.get(pb.songID) ??
      chart.song ?? {
        id: pb.songID,
        title: 'Unknown Song',
        artist: 'Unknown Artist',
      };

    const score = pb.scoreData.score;
    const lamp = pb.scoreData.lamp;
    const grade = pb.scoreData.grade || scoreToGrade(score);
    const vf = calculateChartVF(score, lamp, chart.levelNum, version);

    rawScores.push({
      pb,
      chart,
      song,
      score,
      lamp,
      grade,
      vf,
      rank: 0,
      inTop50: false,
    });
  }

  // Sort descending by VF, tiebreak by score
  rawScores.sort((a, b) => {
    if (b.vf !== a.vf) return b.vf - a.vf;
    return b.score - a.score;
  });

  // Assign ranks
  rawScores.forEach((s, idx) => {
    s.rank = idx + 1;
    s.inTop50 = idx < 50;
  });

  const top50Scores = rawScores.slice(0, 50);
  const top50Cutoff = top50Scores.length >= 50 ? top50Scores[49].vf : 0;
  const currentProfileVF = calculateProfileVF(top50Scores.map((s) => s.vf));
  const currentClass = vfToClass(currentProfileVF);
  // For profiles with sparse plays (e.g. single-score test mocks), extrapolate effective player VF
  const effectiveVF = currentProfileVF >= 5 ? currentProfileVF : (top50Scores[0]?.vf || 0.38) * 50;

  // Level distribution of top 50
  const levelDistribution: Record<number, number> = {};
  for (const s of top50Scores) {
    const lvl = Math.floor(s.chart.levelNum);
    levelDistribution[lvl] = (levelDistribution[lvl] || 0) + 1;
  }

  // 2. Scan for Upscore Opportunities
  const upscores: UpscoreOpportunity[] = [];
  const seenChartIDs = new Set<string>();

  // Only scan top 100 plays to keep advice high-yield and focused
  const candidates = rawScores.slice(0, 100);

  for (const s of candidates) {
    if (seenChartIDs.has(s.chart.chartID)) continue;

    // Version filter (e.g. only Exceed Gear or Konaste)
    if (!isChartInVersion(s.chart, versionFilter)) {
      continue;
    }

    seenChartIDs.add(s.chart.chartID);

    const level = s.chart.levelNum;
    const sTier = s.chart.data?.sTier?.text;

    // Opportunity 1: Near S (9,850,000 - 9,899,999) -> Jump from AAA+ (102) to S (105)
    if (s.score >= 9_850_000 && s.score < 9_900_000) {
      const targetScore = 9_900_000;
      let targetLamp: SDVXLamp;
      if (s.lamp === 'EXCESSIVE CLEAR') {
        targetLamp = 'MAXXIVE CLEAR';
      } else if (s.lamp === 'CLEAR' || s.lamp === 'FAILED') {
        targetLamp = 'EXCESSIVE CLEAR';
      } else {
        targetLamp = s.lamp;
      }
      const targetVF = calculateChartVF(targetScore, targetLamp, level, version);

      const netGain = s.inTop50
        ? targetVF - s.vf
        : Math.max(0, targetVF - top50Cutoff);

      if (netGain > 0.0009) {
        const pointsNeeded = targetScore - s.score;
        const feasibility = calculateUpscoreFeasibility(
          effectiveVF,
          s.chart,
          s.score,
          targetScore,
          'S',
          targetLamp,
        );

        if (feasibility.feasibilityPercent < 40) continue;

        upscores.push({
          id: `upscore-${s.chart.chartID}-near-s`,
          chart: s.chart,
          song: s.song,
          currentScore: s.score,
          currentLamp: s.lamp,
          currentGrade: s.grade,
          currentVF: s.vf,
          targetScore,
          targetLamp,
          targetGrade: 'S',
          targetVF,
          netVFGain: Math.round(netGain * 1000) / 1000,
          category: 'near-s',
          description: `Only ${pointsNeeded.toLocaleString()} pts away from S rank! Massive +3% grade coefficient jump.`,
          effortRating: pointsNeeded < 25_000 ? 1 : 2,
          sTierText: sTier,
          levelNum: level,
          feasibility,
        });
        continue;
      }
    }

    // Opportunity 2: Near AAA+ (9,750,000 - 9,799,999) -> Jump from AAA (100) to AAA+ (102)
    if (s.score >= 9_750_000 && s.score < 9_800_000) {
      const targetScore = 9_800_000;
      let targetLamp: SDVXLamp;
      if (s.lamp === 'EXCESSIVE CLEAR') {
        targetLamp = 'MAXXIVE CLEAR';
      } else if (s.lamp === 'CLEAR' || s.lamp === 'FAILED') {
        targetLamp = 'EXCESSIVE CLEAR';
      } else {
        targetLamp = s.lamp;
      }
      const targetVF = calculateChartVF(targetScore, targetLamp, level, version);

      const netGain = s.inTop50
        ? targetVF - s.vf
        : Math.max(0, targetVF - top50Cutoff);

      if (netGain > 0.0009) {
        const pointsNeeded = targetScore - s.score;
        const feasibility = calculateUpscoreFeasibility(
          effectiveVF,
          s.chart,
          s.score,
          targetScore,
          'AAA+',
          targetLamp,
        );

        if (feasibility.feasibilityPercent < 40) continue;

        upscores.push({
          id: `upscore-${s.chart.chartID}-near-aaa-plus`,
          chart: s.chart,
          song: s.song,
          currentScore: s.score,
          currentLamp: s.lamp,
          currentGrade: s.grade,
          currentVF: s.vf,
          targetScore,
          targetLamp,
          targetGrade: 'AAA+',
          targetVF,
          netVFGain: Math.round(netGain * 1000) / 1000,
          category: 'near-aaa-plus',
          description: `Only ${pointsNeeded.toLocaleString()} pts to AAA+ for a 102 coefficient upgrade.`,
          effortRating: 2,
          sTierText: sTier,
          levelNum: level,
          feasibility,
        });
        continue;
      }
    }

    // Opportunity 3A: Lamp Upgrade from CLEAR/FAILED to EXCESSIVE CLEAR
    if (s.score >= 9_850_000 && (s.lamp === 'CLEAR' || s.lamp === 'FAILED')) {
      const targetScore = s.score;
      const targetLamp: SDVXLamp = 'EXCESSIVE CLEAR';
      const targetVF = calculateChartVF(targetScore, targetLamp, level, version);

      const netGain = s.inTop50
        ? targetVF - s.vf
        : Math.max(0, targetVF - top50Cutoff);

      if (netGain > 0.0009) {
        const feasibility = calculateUpscoreFeasibility(
          effectiveVF,
          s.chart,
          s.score,
          targetScore,
          s.grade,
          targetLamp,
        );

        if (feasibility.feasibilityPercent >= 40) {
          upscores.push({
            id: `upscore-${s.chart.chartID}-lamp-excessive`,
            chart: s.chart,
            song: s.song,
            currentScore: s.score,
            currentLamp: s.lamp,
            currentGrade: s.grade,
            currentVF: s.vf,
            targetScore,
            targetLamp,
            targetGrade: s.grade,
            targetVF,
            netVFGain: Math.round(netGain * 1000) / 1000,
            category: 'lamp-upgrade',
            description: `Upgrade lamp from ${s.lamp} to Excessive Clear (102%) for an instant +2% multiplier without needing higher score.`,
            effortRating: 1,
            sTierText: sTier,
            levelNum: level,
            feasibility,
          });
        }
      }
    }

    // Opportunity 3B: Lamp Upgrade from EXCESSIVE CLEAR to MAXXIVE CLEAR
    // "always jumps from excessive to maxxive"
    if (s.score >= 9_850_000 && s.lamp === 'EXCESSIVE CLEAR') {
      const targetScore = s.score;
      const targetLamp: SDVXLamp = 'MAXXIVE CLEAR';
      const targetVF = calculateChartVF(targetScore, targetLamp, level, version);

      const netGain = s.inTop50
        ? targetVF - s.vf
        : Math.max(0, targetVF - top50Cutoff);

      if (netGain > 0.0009) {
        const feasibility = calculateUpscoreFeasibility(
          effectiveVF,
          s.chart,
          s.score,
          targetScore,
          s.grade,
          targetLamp,
        );

        if (feasibility.feasibilityPercent >= 40) {
          upscores.push({
            id: `upscore-${s.chart.chartID}-lamp-maxxive`,
            chart: s.chart,
            song: s.song,
            currentScore: s.score,
            currentLamp: s.lamp,
            currentGrade: s.grade,
            currentVF: s.vf,
            targetScore,
            targetLamp,
            targetGrade: s.grade,
            targetVF,
            netVFGain: Math.round(netGain * 1000) / 1000,
            category: 'lamp-upgrade',
            description: `Upgrade lamp from Excessive Clear to Maxxive Clear (104%) for an instant +2% multiplier boost!`,
            effortRating: 1,
            sTierText: sTier,
            levelNum: level,
            feasibility,
          });
        }
      }
    }

    // Opportunity 3C: Lamp Upgrade to Ultimate Chain (UC)
    // "only uc if there's several people in that volforce range with that lamp"
    if (
      s.score >= 9_880_000 &&
      s.lamp !== 'ULTIMATE CHAIN' &&
      s.lamp !== 'PERFECT ULTIMATE CHAIN' &&
      hasSufficientUCDensity(effectiveVF, s.chart)
    ) {
      const targetScore = Math.max(s.score, 9_900_000);
      const targetLamp: SDVXLamp = 'ULTIMATE CHAIN';
      const targetVF = calculateChartVF(targetScore, targetLamp, level, version);

      const netGain = s.inTop50
        ? targetVF - s.vf
        : Math.max(0, targetVF - top50Cutoff);

      if (netGain > 0.0009) {
        const feasibility = calculateUpscoreFeasibility(
          effectiveVF,
          s.chart,
          s.score,
          targetScore,
          'S',
          targetLamp,
        );

        if (feasibility.feasibilityPercent >= 40) {
          const lampGainText =
            version === 'vf7'
              ? s.lamp === 'MAXXIVE CLEAR'
                ? '+2%'
                : s.lamp === 'EXCESSIVE CLEAR'
                ? '+4%'
                : '+6%'
              : s.lamp === 'MAXXIVE CLEAR'
              ? '+1%'
              : s.lamp === 'EXCESSIVE CLEAR'
              ? '+3%'
              : '+5%';

          upscores.push({
            id: `upscore-${s.chart.chartID}-lamp-uc`,
            chart: s.chart,
            song: s.song,
            currentScore: s.score,
            currentLamp: s.lamp,
            currentGrade: s.grade,
            currentVF: s.vf,
            targetScore,
            targetLamp,
            targetGrade: 'S',
            targetVF,
            netVFGain: Math.round(netGain * 1000) / 1000,
            category: 'lamp-upgrade',
            description: `Upgrade to Ultimate Chain (UC) for an instant ${lampGainText} lamp multiplier boost on this chart!`,
            effortRating: 2,
            sTierText: sTier,
            levelNum: level,
            feasibility,
          });
        }
      }
    }

    // Opportunity 4: Queue Pushers (Rank 51-100 close to breaking into top 50)
    if (!s.inTop50 && s.rank <= 80 && s.score >= 9_600_000) {
      const targetScore = 9_900_000;
      let targetLamp: SDVXLamp;
      if (s.lamp === 'EXCESSIVE CLEAR') {
        targetLamp = 'MAXXIVE CLEAR';
      } else if (s.lamp === 'CLEAR' || s.lamp === 'FAILED') {
        targetLamp = 'EXCESSIVE CLEAR';
      } else {
        targetLamp = 'EXCESSIVE CLEAR';
      }
      const targetVF = calculateChartVF(targetScore, targetLamp, level, version);

      const netGain = targetVF - top50Cutoff;

      if (netGain > 0.005) {
        const feasibility = calculateUpscoreFeasibility(
          effectiveVF,
          s.chart,
          s.score,
          targetScore,
          'S',
          targetLamp,
        );

        if (feasibility.feasibilityPercent < 40) continue;

        upscores.push({
          id: `upscore-${s.chart.chartID}-top50-pusher`,
          chart: s.chart,
          song: s.song,
          currentScore: s.score,
          currentLamp: s.lamp,
          currentGrade: s.grade,
          currentVF: s.vf,
          targetScore,
          targetLamp,
          targetGrade: 'S',
          targetVF,
          netVFGain: Math.round(netGain * 1000) / 1000,
          category: 'top50-pusher',
          description: `Currently rank #${s.rank}. An S-rank (${targetScore.toLocaleString()}) would break into Top 50, replacing your lowest scores!`,
          effortRating: 3,
          sTierText: sTier,
          levelNum: level,
          feasibility,
        });
      }
    }
  }

  // Sort upscores:
  // In VF7 mode: primarily by netVFGain, then feasibility percent
  // In VF6 mode: by netVFGain, then feasibility percent
  upscores.sort((a, b) => {
    if (b.netVFGain !== a.netVFGain) {
      return b.netVFGain - a.netVFGain;
    }
    const aFeas = a.feasibility?.feasibilityPercent || 50;
    const bFeas = b.feasibility?.feasibilityPercent || 50;
    return bFeas - aFeas;
  });

  return {
    analyzedScores: rawScores,
    top50Scores,
    top50Cutoff,
    currentProfileVF,
    currentClass,
    levelDistribution,
    upscores,
    chartMap,
    songMap,
  };
}
