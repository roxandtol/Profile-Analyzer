import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { ProfileSummary } from './components/ProfileSummary';
import { RoadmapView } from './components/RoadmapView';
import { UpscoresTab } from './components/UpscoresTab';
import { FarmableTab } from './components/FarmableTab';
import { Top50Tab } from './components/Top50Tab';
import { ExportModal } from './components/ExportModal';
import { TachiClient } from './api/tachiClient';
import { analyzeProfile, AnalyzerResult } from './core/analyzer';
import { findFarmables, getDefaultLevelRange } from './core/farmable';
import { generateRoadmap } from './core/roadmap';
import {
  GameVersionFilter,
  KamaiChart,
  KamaiPB,
  KamaiSong,
  KamaiUser,
  KamaiUserProfileResponse,
  RoadmapStep,
  RoadmapStepAlternative,
  RoadmapStrategy,
  SDVXLamp,
  VolforceVersion,
} from './core/types';
import { calculateChartVF } from './core/volforce';
import { calculateUpscoreFeasibility } from './core/upscoreFeasibility';
import { Route, Flame, Target, ListOrdered, Share2, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('sdvx_username') || 'zkldi';
  });
  const [version, setVersion] = useState<VolforceVersion>('vf7');
  const [konasteOnly, setKonasteOnly] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Raw data from API
  const [userAccount, setUserAccount] = useState<KamaiUser | null>(null);
  const [profile, setProfile] = useState<KamaiUserProfileResponse | null>(null);
  const [rawPBs, setRawPBs] = useState<KamaiPB[]>([]);
  const [rawCharts, setRawCharts] = useState<KamaiChart[]>([]);
  const [rawSongs, setRawSongs] = useState<KamaiSong[]>([]);
  const [catalogCharts, setCatalogCharts] = useState<KamaiChart[]>([]);
  const [catalogSongs, setCatalogSongs] = useState<KamaiSong[]>([]);

  // User Target & Preferences
  const [customTargetVF, setCustomTargetVF] = useState<number | null>(null);
  const [roadmapStrategy, setRoadmapStrategy] = useState<RoadmapStrategy>('most-feasible');
  const [roadmapTargetLamp, setRoadmapTargetLamp] = useState<SDVXLamp>('EXCESSIVE CLEAR');
  const [stepOverrides, setStepOverrides] = useState<Record<number, Partial<RoadmapStep>>>({});
  const [dismissedChartIDs, setDismissedChartIDs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'roadmap' | 'upscores' | 'farmable' | 'top50'>('roadmap');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const client = useMemo(() => {
    return new TachiClient();
  }, []);

  const versionFilter: GameVersionFilter = useMemo(
    () => (version === 'vf6' ? (konasteOnly ? 'konaste' : 'exceed') : 'all'),
    [version, konasteOnly],
  );

  // Load user data
  const loadUserData = async (targetUser: string) => {
    if (!targetUser.trim()) return;
    setLoading(true);
    setError(null);

    try {
      localStorage.setItem('sdvx_username', targetUser);
      const [accountResp, userProfile, pbsResp] = await Promise.all([
        client.getUser(targetUser).catch(() => null),
        client.getUserProfile(targetUser),
        client.getUserAllPBs(targetUser),
      ]);

      setUserAccount(accountResp);
      setProfile(userProfile);
      setRawPBs(pbsResp.pbs);
      setRawCharts(pbsResp.charts);
      setRawSongs(pbsResp.songs);
      setDismissedChartIDs(new Set());

      // Initial analysis to determine levels
      const initialAnalysis = analyzeProfile(
        pbsResp.pbs,
        pbsResp.charts,
        pbsResp.songs,
        version,
        versionFilter,
      );

      const target =
        customTargetVF ??
        Math.floor(initialAnalysis.currentProfileVF * 2) / 2 + 0.5;

      const { minLevel, maxLevel } = getDefaultLevelRange(target);
      const candidateLevels: number[] = [];
      for (let l = minLevel; l <= maxLevel; l++) candidateLevels.push(l);

      // Fetch level catalogs for farmable recommendations
      const catalog = await client.getMultiLevelCharts(targetUser, candidateLevels);
      setCatalogCharts(catalog.charts);
      setCatalogSongs(catalog.songs);
    } catch (err: any) {
      console.error('Failed to load user:', err);
      setError(err.message || 'Failed to load user data from Kamaitachi API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData(username);
  }, [version, konasteOnly]);

  // Perform Analysis
  const analysis: AnalyzerResult | null = useMemo(() => {
    if (!profile || rawPBs.length === 0) return null;
    return analyzeProfile(rawPBs, rawCharts, rawSongs, version, versionFilter);
  }, [profile, rawPBs, rawCharts, rawSongs, version, versionFilter]);

  // Merge PB and Catalog charts & songs
  const { allChartsMap, allSongsMap } = useMemo(() => {
    const chartsMap = new Map<string, KamaiChart>();
    const songsMap = new Map<string, KamaiSong>();

    for (const c of rawCharts) chartsMap.set(c.chartID, c);
    for (const c of catalogCharts) {
      if (!chartsMap.has(c.chartID)) chartsMap.set(c.chartID, c);
    }

    for (const s of rawSongs) songsMap.set(s.id, s);
    for (const s of catalogSongs) {
      if (!songsMap.has(s.id)) songsMap.set(s.id, s);
    }

    return { allChartsMap: chartsMap, allSongsMap: songsMap };
  }, [rawCharts, catalogCharts, rawSongs, catalogSongs]);

  // Target VF
  const targetVF = useMemo(() => {
    if (customTargetVF !== null) return customTargetVF;
    if (!analysis) return 18.0;
    return Math.floor(analysis.currentProfileVF * 2) / 2 + 0.5;
  }, [customTargetVF, analysis]);

  // Farmables List
  const farmables = useMemo(() => {
    if (!analysis) return [];

    const existingPBsMap = new Map<string, KamaiPB>();
    for (const pb of rawPBs) existingPBsMap.set(pb.chartID, pb);

    const top50ChartIDs = new Set(analysis.top50Scores.map((s) => s.chart.chartID));
    const { minLevel, maxLevel } = getDefaultLevelRange(targetVF);

    const res = findFarmables(
      Array.from(allChartsMap.values()),
      allSongsMap,
      {
        version,
        versionFilter,
        top50Cutoff: analysis.top50Cutoff,
        top50ChartIDs,
        existingPBsMap,
        minLevel,
        maxLevel,
        targetVF,
        targetLamp: roadmapTargetLamp,
        minFeasibility: 0,
      },
    );

    return res.filter((f) => !dismissedChartIDs.has(f.chart.chartID));
  }, [analysis, allChartsMap, allSongsMap, rawPBs, version, versionFilter, targetVF, roadmapTargetLamp, dismissedChartIDs]);

  // Filtered Upscores (without dismissed)
  const activeUpscores = useMemo(() => {
    if (!analysis) return [];
    return analysis.upscores.filter((u) => !dismissedChartIDs.has(u.chart.chartID));
  }, [analysis, dismissedChartIDs]);

  const handleStrategyChange = (newStrategy: RoadmapStrategy) => {
    setRoadmapStrategy(newStrategy);
    setStepOverrides({});
  };

  const handleTargetLampChange = (newLamp: SDVXLamp) => {
    setRoadmapTargetLamp(newLamp);
    setStepOverrides({});
  };

  const handleSwapStep = (stepNumber: number, alternative: RoadmapStepAlternative) => {
    const baseStep = baseRoadmap.find((s) => s.stepNumber === stepNumber);
    setStepOverrides((prev) => ({
      ...prev,
      [stepNumber]: {
        ...alternative,
        isHigherStuff: baseStep?.isHigherStuff,
      },
    }));
  };


  const handleChangeStepLamp = (stepNumber: number, newLamp: SDVXLamp) => {
    const baseStep = baseRoadmap.find((s) => s.stepNumber === stepNumber);
    if (!baseStep || !analysis) return;

    const currentOverride = stepOverrides[stepNumber] || {};
    const chart = currentOverride.chart || baseStep.chart;
    const targetScore = currentOverride.targetScore ?? baseStep.targetScore;
    const currentScore = currentOverride.currentScore ?? baseStep.currentScore;
    const currentLamp = currentOverride.currentLamp ?? baseStep.currentLamp;

    // Recalculate target VF with newLamp
    const newTargetVF = calculateChartVF(targetScore, newLamp, chart.levelNum, version);

    // Recalculate net VF gain
    let newNetGain = 0;
    if (currentScore !== undefined && currentScore > 0) {
      const isTop50 = analysis.top50Scores.some((s) => s.chart.chartID === chart.chartID);
      if (isTop50) {
        const existingVF = calculateChartVF(currentScore, currentLamp || 'CLEAR', chart.levelNum, version);
        newNetGain = Math.max(0, newTargetVF - existingVF);
      } else {
        newNetGain = Math.max(0, newTargetVF - analysis.top50Cutoff);
      }
    } else {
      newNetGain = Math.max(0, newTargetVF - analysis.top50Cutoff);
    }
    newNetGain = Math.round(newNetGain * 1000) / 1000;

    // Recalculate feasibility
    const newFeasibility = calculateUpscoreFeasibility(
      analysis.currentProfileVF,
      chart,
      currentScore || 0,
      targetScore,
      'S',
      newLamp,
    );

    const lampLabel =
      newLamp === 'ULTIMATE CHAIN'
        ? 'UC'
        : newLamp === 'MAXXIVE CLEAR'
        ? 'Maxxive Clear'
        : newLamp === 'EXCESSIVE CLEAR'
        ? 'Excessive Clear'
        : newLamp === 'PERFECT ULTIMATE CHAIN'
        ? 'PUC'
        : 'Clear';

    const primaryFactor =
      version === 'vf7'
        ? `Decimal ${chart.levelNum.toFixed(1)} S + ${lampLabel} (+${newNetGain.toFixed(3)} VF)`
        : `S + ${lampLabel} (+${newNetGain.toFixed(3)} VF)`;

    const rationale =
      newLamp === 'ULTIMATE CHAIN'
        ? `Full combo (UC) project (+${newNetGain.toFixed(3)} net profile VF). Boosts lamp coefficient to ${version === 'vf7' ? 106 : 105}.`
        : newLamp === 'MAXXIVE CLEAR'
        ? `Maxxive Clear (+${newNetGain.toFixed(3)} net profile VF). 104 coefficient.`
        : newLamp === 'EXCESSIVE CLEAR'
        ? `Excessive Clear (+${newNetGain.toFixed(3)} net profile VF). 102 coefficient.`
        : newLamp === 'PERFECT ULTIMATE CHAIN'
        ? `PUC perfection (+${newNetGain.toFixed(3)} net profile VF). 110 coefficient!`
        : `Normal Clear (+${newNetGain.toFixed(3)} net profile VF). 100 coefficient.`;

    setStepOverrides((prev) => ({
      ...prev,
      [stepNumber]: {
        ...baseStep,
        ...currentOverride,
        targetLamp: newLamp,
        chartVF: newTargetVF,
        netVFGain: newNetGain,
        feasibility: newFeasibility,
        primaryFactor,
        rationale,
      },
    }));
  };

  // Roadmap Steps
  const baseRoadmap = useMemo(() => {
    if (!analysis) return [];
    return generateRoadmap(
      analysis.currentProfileVF,
      targetVF,
      activeUpscores,
      farmables,
      version,
      roadmapStrategy,
      roadmapTargetLamp,
      40,
    );
  }, [analysis, targetVF, activeUpscores, farmables, version, roadmapStrategy, roadmapTargetLamp]);

  const roadmapSteps = useMemo(() => {
    let runningVF = analysis ? analysis.currentProfileVF : 0;
    const res = baseRoadmap.map((s) => {
      const override = stepOverrides[s.stepNumber];
      const merged: RoadmapStep = override ? ({ ...s, ...override } as RoadmapStep) : s;
      runningVF = Math.round((runningVF + merged.netVFGain) * 1000) / 1000;
      return {
        ...merged,
        cumulativeProfileVF: runningVF,
      };
    });
    const list = res as any;
    list.strategyUsed = (baseRoadmap as any).strategyUsed;
    list.originalStrategy = (baseRoadmap as any).originalStrategy;
    list.wasStrategyChanged = (baseRoadmap as any).wasStrategyChanged;
    list.strategyChangeReason = (baseRoadmap as any).strategyChangeReason;
    list.effectiveLamp = (baseRoadmap as any).effectiveLamp;
    list.targetReached = (baseRoadmap as any).targetReached;
    list.feasibleCount = (baseRoadmap as any).feasibleCount;
    list.higherStuffCount = (baseRoadmap as any).higherStuffCount;
    return list;
  }, [baseRoadmap, stepOverrides, analysis]);

  const handleDismissChart = (chartID: string) => {
    setDismissedChartIDs((prev) => {
      const next = new Set(prev);
      next.add(chartID);
      return next;
    });
    setStepOverrides({});
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        username={username}
        version={version}
        loading={loading}
        konasteOnly={konasteOnly}
        onSearch={(user) => {
          setUsername(user);
          loadUserData(user);
        }}
        onVersionChange={setVersion}
        onKonasteToggle={setKonasteOnly}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-300 flex items-center justify-between">
            <p>⚠️ {error}</p>
            <button
              onClick={() => loadUserData(username)}
              className="px-3 py-1 bg-rose-500 text-white rounded font-medium hover:bg-rose-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !analysis && (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-sdvx-cyan animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-mono">Fetching profile and chart catalogs from Kamaitachi...</p>
          </div>
        )}

        {/* Profile Loaded */}
        {analysis && profile && (
          <>
            <ProfileSummary
              username={username}
              userID={profile.gameStats.userID}
              currentVF={analysis.currentProfileVF}
              currentClass={analysis.currentClass}
              targetVF={targetVF}
              top50Cutoff={analysis.top50Cutoff}
              version={version}
              levelDistribution={analysis.levelDistribution}
              onTargetChange={(val) => setCustomTargetVF(val)}
              customPfpLocation={userAccount?.customPfpLocation}
              customBannerLocation={userAccount?.customBannerLocation}
            />

            {/* Navigation Tabs Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1c2438] pb-1">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('roadmap')}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all shrink-0 ${
                    activeTab === 'roadmap'
                      ? 'bg-sdvx-cyan text-gray-950 shadow-md shadow-sdvx-cyan/20'
                      : 'text-gray-400 hover:text-white hover:bg-[#141b2d]'
                  }`}
                >
                  <Route className="w-4 h-4 shrink-0" />
                  <span>Roadmap</span>
                  <span className="opacity-75 font-normal">({roadmapSteps.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('upscores')}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all shrink-0 ${
                    activeTab === 'upscores'
                      ? 'bg-sdvx-accent text-white shadow-md shadow-sdvx-accent/20'
                      : 'text-gray-400 hover:text-white hover:bg-[#141b2d]'
                  }`}
                >
                  <Flame className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Low-Hanging</span>
                  <span>Upscores</span>
                  <span className="opacity-75 font-normal">({activeUpscores.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('farmable')}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all shrink-0 ${
                    activeTab === 'farmable'
                      ? 'bg-emerald-400 text-gray-950 shadow-md shadow-emerald-400/20'
                      : 'text-gray-400 hover:text-white hover:bg-[#141b2d]'
                  }`}
                >
                  <Target className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Farmable</span>
                  <span>Hit List</span>
                  <span className="opacity-75 font-normal">({farmables.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('top50')}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all shrink-0 ${
                    activeTab === 'top50'
                      ? 'bg-slate-200 text-gray-950 shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-[#141b2d]'
                  }`}
                >
                  <ListOrdered className="w-4 h-4 shrink-0" />
                  <span>Top 50</span>
                </button>
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="w-full sm:w-auto justify-center px-3.5 py-2 rounded-lg bg-[#141b2d] border border-[#22304d] hover:border-sdvx-cyan text-gray-200 hover:text-white text-xs font-medium font-mono flex items-center gap-2 transition-all shadow-sm shrink-0"
              >
                <Share2 className="w-3.5 h-3.5 text-sdvx-cyan" />
                <span>Export Arcade Plan</span>
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'roadmap' && (
              <RoadmapView
                steps={roadmapSteps}
                currentVF={analysis.currentProfileVF}
                targetVF={targetVF}
                version={version}
                strategy={roadmapStrategy}
                targetLamp={roadmapTargetLamp}
                onStrategyChange={handleStrategyChange}
                onTargetLampChange={handleTargetLampChange}
                onChangeStepLamp={handleChangeStepLamp}
                onToggleComplete={() => {}}
                onDismissStep={handleDismissChart}
                onSwapStep={handleSwapStep}
              />
            )}

            {activeTab === 'upscores' && (
              <UpscoresTab upscores={activeUpscores} version={version} />
            )}

            {activeTab === 'farmable' && (
              <FarmableTab farmables={farmables} version={version} />
            )}

            {activeTab === 'top50' && (
              <Top50Tab
                top50Scores={analysis.top50Scores}
                version={version}
                cutoff={analysis.top50Cutoff}
              />
            )}

            {/* Export Modal */}
            <ExportModal
              isOpen={showExportModal}
              onClose={() => setShowExportModal(false)}
              username={username}
              currentVF={analysis.currentProfileVF}
              targetVF={targetVF}
              version={version}
              steps={roadmapSteps}
            />
          </>
        )}
      </main>

      <footer className="border-t border-[#1c2438] bg-[#0a0d14] py-6 text-center text-xs text-gray-500 font-mono">
        <p>SOUND VOLTEX Profile Analyzer & Volforce Route Planner</p>
        <p className="mt-1 text-[11px] text-gray-600">
          Powered by the Kamaitachi API (Tachi) & RG-Stats Volforce algorithm
        </p>
      </footer>
    </div>
  );
};
