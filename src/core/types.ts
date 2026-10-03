export type SDVXLamp =
  | 'FAILED'
  | 'CLEAR'
  | 'EXCESSIVE CLEAR'
  | 'MAXXIVE CLEAR'
  | 'ULTIMATE CHAIN'
  | 'PERFECT ULTIMATE CHAIN';

export type SDVXGrade =
  | 'D'
  | 'C'
  | 'B'
  | 'A'
  | 'A+'
  | 'AA'
  | 'AA+'
  | 'AAA'
  | 'AAA+'
  | 'S';

export type SDVXDifficulty =
  | 'NOV'
  | 'ADV'
  | 'EXH'
  | 'INF'
  | 'GRV'
  | 'HVN'
  | 'VVD'
  | 'XCD'
  | 'MXM'
  | 'ULT';

export type VolforceVersion = 'vf6' | 'vf7';

export interface KamaiJudgements {
  critical?: number;
  near?: number;
  miss?: number;
  [key: string]: any;
}

export interface KamaiScoreData {
  score: number;
  lamp: SDVXLamp;
  grade: SDVXGrade;
  judgements?: KamaiJudgements;
  optional?: {
    fast?: number | null;
    slow?: number | null;
    maxCombo?: number | null;
    exScore?: number | null;
    gauge?: number | null;
    [key: string]: any;
  };
}

export interface KamaiCalculatedData {
  VF6?: number;
  VF7?: number;
  [key: string]: any;
}

export interface KamaiPB {
  chartID: string;
  songID: string;
  userID: number;
  scoreData: KamaiScoreData;
  calculatedData: KamaiCalculatedData;
  timeAchieved?: number;
  highlight?: boolean;
  isPrimary?: boolean;
}

export interface KamaiTierInfo {
  text?: string;
  value?: number;
  individualDifference?: boolean;
}

export interface KamaiChartData {
  sTier?: KamaiTierInfo;
  clearTier?: KamaiTierInfo;
  pucTier?: KamaiTierInfo;
  inGameID?: number;
  [key: string]: any;
}

export interface KamaiSong {
  id: string;
  title: string;
  artist: string;
  searchTerms?: string[];
  altTitles?: string[];
  data?: {
    displayVersion?: string;
    [key: string]: any;
  };
}

export interface KamaiChart {
  chartID: string;
  game?: string;
  difficulty: SDVXDifficulty;
  level: string;
  levelNum: number;
  isPrimary?: boolean;
  data?: KamaiChartData;
  song?: KamaiSong;
  songID?: string;
  versions?: string[];
}

export interface KamaiUserStats {
  userID: number;
  game: string;
  ratings: {
    VF6?: number;
    VF7?: number;
    [key: string]: any;
  };
  classes: {
    vfClass?: string;
    dan?: string;
    [key: string]: any;
  };
}

export interface KamaiUserProfileResponse {
  gameStats: KamaiUserStats;
  totalScores?: number;
  playtime?: number;
  rankingData?: Record<string, { ranking: number; outOf: number }>;
}

export interface KamaiPBsResponse {
  pbs: KamaiPB[];
  charts: KamaiChart[];
  songs: KamaiSong[];
}

export interface KamaiFolderResponse {
  charts: KamaiChart[];
  pbs: KamaiPB[];
  songs: KamaiSong[];
  folder?: any;
}

/* ---------------- Analysis Types ---------------- */

export interface AnalyzedScore {
  pb: KamaiPB;
  chart: KamaiChart;
  song: KamaiSong;
  score: number;
  lamp: SDVXLamp;
  grade: SDVXGrade;
  vf: number;
  rank: number; // 1-indexed in user's profile
  inTop50: boolean;
}

export type GameVersionFilter = 'all' | 'exceed' | 'konaste';

export interface UpscoreFeasibility {
  expectedPlayerVF: number;
  userVF: number;
  vfFitDelta: number;
  feasibilityPercent: number;
  feasibilityTier: 'VERY_HIGH' | 'MODERATE' | 'CHALLENGING' | 'HARD';
  label: string;
  explanation: string;
}

export interface UpscoreOpportunity {
  id: string;
  chart: KamaiChart;
  song: KamaiSong;
  currentScore: number;
  currentLamp: SDVXLamp;
  currentGrade: SDVXGrade;
  currentVF: number;
  targetScore: number;
  targetLamp: SDVXLamp;
  targetGrade: SDVXGrade;
  targetVF: number;
  netVFGain: number;
  category: 'near-s' | 'near-aaa-plus' | 'lamp-upgrade' | 'top50-pusher' | 'general';
  description: string;
  effortRating: number; // 1 (easiest) - 5 (hardest)
  sTierText?: string;
  levelNum: number;
  feasibility?: UpscoreFeasibility;
}

export interface FarmableOpportunity {
  id: string;
  chart: KamaiChart;
  song: KamaiSong;
  levelNum: number;
  difficulty: SDVXDifficulty;
  sTier?: KamaiTierInfo;
  clearTier?: KamaiTierInfo;
  individualDifference: boolean;
  projectedScore: number;
  projectedLamp: SDVXLamp;
  projectedVF: number;
  netVFGain: number;
  farmabilityScore: number;
  isPlayed: boolean;
  existingScore?: number;
  existingLamp?: SDVXLamp;
  primaryAdvantage: string;
  feasibility?: UpscoreFeasibility;
}

export type RoadmapStrategy =
  | 'most-feasible'
  | 'balanced'
  | 'fastest'
  | 'upscores-first'
  | 'farmables-only';

export type RoadmapTargetLamp = 'EXCESSIVE CLEAR' | 'ULTIMATE CHAIN' | 'CLEAR' | 'PERFECT ULTIMATE CHAIN';

export interface RoadmapStepAlternative {
  chart: KamaiChart;
  song: KamaiSong;
  type: 'upscore' | 'farmable';
  currentScore?: number;
  currentLamp?: SDVXLamp;
  targetScore: number;
  targetLamp: SDVXLamp;
  targetGrade?: SDVXGrade;
  chartVF: number;
  netVFGain: number;
  rationale: string;
  primaryFactor: string;
  feasibility?: UpscoreFeasibility;
}

export interface RoadmapStep {
  stepNumber: number;
  type: 'upscore' | 'farmable';
  chart: KamaiChart;
  song: KamaiSong;
  currentScore?: number;
  currentLamp?: SDVXLamp;
  targetScore: number;
  targetLamp: SDVXLamp;
  targetGrade?: SDVXGrade;
  chartVF: number;
  netVFGain: number;
  cumulativeProfileVF: number;
  completed: boolean;
  rationale: string;
  primaryFactor: string;
  feasibility?: UpscoreFeasibility;
  alternatives?: RoadmapStepAlternative[];
}

export interface ProfilePlan {
  username: string;
  version: VolforceVersion;
  currentVF: number;
  targetVF: number;
  deltaVFNeeded: number;
  top50Cutoff: number;
  currentClass: string;
  targetClass: string;
  top50Scores: AnalyzedScore[];
  levelDistribution: Record<number, number>;
  upscores: UpscoreOpportunity[];
  farmables: FarmableOpportunity[];
  roadmap: RoadmapStep[];
}
