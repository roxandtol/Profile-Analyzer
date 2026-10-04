import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  X,
  Sparkles,
  ArrowRight,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Award,
  CheckSquare,
  Square,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  RoadmapStep,
  RoadmapStepAlternative,
  RoadmapStrategy,
  SDVXLamp,
  VolforceVersion,
} from '../core/types';
import { getDifficultyBadgeColor, getFeasibilityBadgeColor, getLampBadgeColor } from '../utils/colors';
import { formatChartLevel } from '../utils/format';
import { getKamaiChartUrl } from '../utils/tachiUrl';

interface RoadmapViewProps {
  steps: RoadmapStep[];
  currentVF: number;
  targetVF: number;
  version: VolforceVersion;
  strategy: RoadmapStrategy;
  targetLamp?: SDVXLamp;
  onStrategyChange: (strategy: RoadmapStrategy) => void;
  onTargetLampChange?: (lamp: SDVXLamp) => void;
  onChangeStepLamp?: (stepNumber: number, lamp: SDVXLamp) => void;
  onToggleComplete: (stepNumber: number) => void;
  onDismissStep: (chartID: string) => void;
  onSwapStep?: (stepNumber: number, alternative: RoadmapStepAlternative) => void;
}

const STRATEGIES: { id: RoadmapStrategy; label: string; desc: string; icon: string }[] = [
  {
    id: 'most-feasible',
    label: 'Most Feasible',
    desc: 'Prioritizes highest confidence % charts and easiest upscores first',
    icon: '🌟',
  },
  {
    id: 'balanced',
    label: 'Balanced Growth',
    desc: 'Combines solid VF gain with achievable feasibility',
    icon: '⚖️',
  },
  {
    id: 'fastest',
    label: 'Fastest Gain',
    desc: 'Maximizes VF gain per play to reach goal in fewest steps',
    icon: '⚡',
  },
  {
    id: 'upscores-first',
    label: 'Upscores First',
    desc: 'Finishes all existing PBs and lamp upgrades before unplayed songs',
    icon: '🎯',
  },
  {
    id: 'farmables-only',
    label: 'Fresh Charts Only',
    desc: 'Only recommends unplayed songs',
    icon: '🎵',
  },
];

const TARGET_LAMPS: { id: SDVXLamp; label: string; desc: string; icon: string; coefVF7: string; coefVF6: string }[] = [
  {
    id: 'EXCESSIVE CLEAR',
    label: 'Excessive Clear',
    desc: 'Standard hard-gauge clear (102% coefficient) - official SDVX high-tier benchmark',
    icon: '⚡',
    coefVF7: '102%',
    coefVF6: '102%',
  },
  {
    id: 'MAXXIVE CLEAR',
    label: 'Maxxive Clear',
    desc: 'Maxxive rate clear (104% coefficient) - high precision clear gauge',
    icon: '🔥',
    coefVF7: '104%',
    coefVF6: '104%',
  },
  {
    id: 'ULTIMATE CHAIN',
    label: 'Ultimate Chain (UC)',
    desc: 'Full combo push (0 misses) - massive +106% (VF7) / +105% (VF6) Volforce yield',
    icon: '🏆',
    coefVF7: '106%',
    coefVF6: '105%',
  },
  {
    id: 'CLEAR',
    label: 'Normal Clear',
    desc: 'Standard 70% effective rate clear (100% coefficient) - safe consistency goal',
    icon: '🟢',
    coefVF7: '100%',
    coefVF6: '100%',
  },
];

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  steps,
  currentVF,
  targetVF,
  version,
  strategy,
  targetLamp = 'EXCESSIVE CLEAR',
  onStrategyChange,
  onTargetLampChange,
  onChangeStepLamp,
  onToggleComplete,
  onDismissStep,
  onSwapStep,
}) => {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [hideLowFeasibility, setHideLowFeasibility] = useState<boolean>(true);

  const displayedSteps = hideLowFeasibility
    ? steps.filter((s) => (s.feasibility?.feasibilityPercent ?? 50) >= 40)
    : steps;

  const toggleStep = (stepNumber: number) => {
    const next = new Set(completedSteps);
    if (next.has(stepNumber)) {
      next.delete(stepNumber);
    } else {
      next.add(stepNumber);
    }
    setCompletedSteps(next);
    onToggleComplete(stepNumber);
  };

  // Calculate banked VF from checked steps
  const bankedVF = displayedSteps
    .filter((s) => completedSteps.has(s.stepNumber))
    .reduce((sum, s) => sum + s.netVFGain, 0);

  const simulatedVF = Math.min(targetVF, Math.round((currentVF + bankedVF) * 1000) / 1000);
  const remainingDelta = Math.max(0, targetVF - simulatedVF);
  const progressPercent = Math.min(
    100,
    Math.max(0, ((simulatedVF - currentVF) / Math.max(0.001, targetVF - currentVF)) * 100),
  );

  return (
    <div className="space-y-6">
      {/* Strategy & Target Lamp Control Bar */}
      <div className="bg-[#0f1422] border border-[#1f293d] rounded-2xl p-4 space-y-3 shadow-lg">
        {/* Row 1: Strategy Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sdvx-cyan shrink-0" />
            <span className="text-xs font-bold text-gray-200 uppercase tracking-wider font-mono">
              Roadmap Strategy:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {STRATEGIES.map((s) => {
              const isSelected = strategy === s.id;
              const isEffective = (steps as any).strategyUsed === s.id && (steps as any).wasStrategyChanged;
              return (
                <button
                  key={s.id}
                  onClick={() => onStrategyChange(s.id)}
                  title={s.desc}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-sdvx-cyan text-gray-950 font-bold shadow-md shadow-sdvx-cyan/20 scale-[1.02]'
                      : isEffective
                      ? 'bg-sdvx-cyan/20 border border-sdvx-cyan text-sdvx-cyan font-bold ring-1 ring-sdvx-cyan/50'
                      : 'bg-[#141b2d] border border-[#202b40] text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                  {isEffective && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-sdvx-cyan text-gray-950 font-black">
                      ACTIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Target Lamp Goal Selector */}
        {onTargetLampChange && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1a2336]">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider font-mono">
                Target Lamp Goal:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TARGET_LAMPS.map((l) => {
                const isActive = targetLamp === l.id;
                const coef = version === 'vf7' ? l.coefVF7 : l.coefVF6;
                return (
                  <button
                    key={l.id}
                    onClick={() => onTargetLampChange(l.id)}
                    title={l.desc}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 border ${
                      isActive
                        ? l.id === 'ULTIMATE CHAIN'
                          ? 'bg-rose-500/25 border-rose-500 text-rose-300 font-bold shadow-md shadow-rose-500/20 scale-[1.02]'
                          : l.id === 'MAXXIVE CLEAR'
                          ? 'bg-amber-500/25 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/20 scale-[1.02]'
                          : l.id === 'EXCESSIVE CLEAR'
                          ? 'bg-purple-500/25 border-purple-500 text-purple-300 font-bold shadow-md shadow-purple-500/20 scale-[1.02]'
                          : 'bg-emerald-500/25 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-500/20 scale-[1.02]'
                        : 'bg-[#141b2d] border-[#202b40] text-gray-400 hover:text-white hover:border-gray-500'
                    }`}
                  >
                    <span>{l.icon}</span>
                    <span>{l.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-gray-300 border border-white/10">
                      {coef}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Progress Header Card */}
      <div className="bg-[#0f1422] border border-[#1f293d] rounded-2xl p-6 shadow-xl">
        {(steps as any).wasStrategyChanged && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-sdvx-cyan/10 border border-sdvx-cyan/30 text-xs text-sdvx-cyan shadow-sm">
            <Sparkles className="w-4 h-4 text-sdvx-cyan shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white uppercase tracking-wider text-[11px] mr-2 px-1.5 py-0.5 rounded bg-sdvx-cyan/20 border border-sdvx-cyan/40">
                Strategy Auto-Adjusted
              </span>
              <span className="text-gray-300">{(steps as any).strategyChangeReason}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wider text-gray-300">
                Roadmap Progression
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-sdvx-cyan/10 border border-sdvx-cyan/30 text-sdvx-cyan font-bold">
                {displayedSteps.length} Steps
              </span>
              <button
                onClick={() => setHideLowFeasibility(!hideLowFeasibility)}
                className={`ml-2 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium flex items-center gap-1.5 border transition-all ${
                  hideLowFeasibility
                    ? 'bg-sdvx-cyan/20 border-sdvx-cyan text-sdvx-cyan font-bold shadow-sm'
                    : 'bg-[#141b2d] border-[#202b40] text-gray-400 hover:text-white'
                }`}
                title="Filter out roadmap goals with feasibility rating under 40%"
              >
                {hideLowFeasibility ? (
                  <CheckSquare className="w-3.5 h-3.5 text-sdvx-cyan" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-gray-500" />
                )}
                <span>Hide &lt;40% Feasibility</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Check off goals as you achieve them in the arcade to update your simulated profile VF!
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-[#141b2d] px-3 py-1.5 rounded-lg border border-[#22304d]">
              <span className="text-gray-400">Banked Gain: </span>
              <span className="text-emerald-400 font-bold">+{bankedVF.toFixed(3)} VF</span>
            </div>
            <div className="bg-[#141b2d] px-3 py-1.5 rounded-lg border border-[#22304d]">
              <span className="text-gray-400">Remaining: </span>
              <span className="text-sdvx-accent font-bold">+{remainingDelta.toFixed(3)} VF</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-400">
              Simulated: <strong className="text-white">{simulatedVF.toFixed(3)}</strong>
            </span>
            <span className="text-gray-400">
              Goal: <strong className="text-sdvx-cyan">{targetVF.toFixed(3)}</strong>
            </span>
          </div>
          <div className="w-full bg-[#0a0d14] h-3.5 rounded-full overflow-hidden border border-[#22304d] p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sdvx-cyan via-pink-500 to-sdvx-accent transition-all duration-300 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {steps.length >= 50 && steps[steps.length - 1]?.cumulativeProfileVF < targetVF && (
          <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Top 50 Limit Reached (50 Scores Max): </span>
              Because Volforce is calculated strictly from your top 50 plays, a roadmap cannot exceed 50 scores.
              Completing all 50 steps reaches <strong className="text-white">{steps[steps.length - 1].cumulativeProfileVF.toFixed(3)} VF</strong>.
              To reach <strong className="text-white">{targetVF.toFixed(3)} VF</strong>, consider targeting higher difficulty charts or aiming for UC / Maxxive Clear lamps.
            </div>
          </div>
        )}
      </div>

      {displayedSteps.length === 0 ? (
        <div className="bg-[#0f1422] border border-[#1f293d] rounded-2xl p-12 text-center">
          <Sparkles className="w-12 h-12 text-sdvx-cyan mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Target Volforce Reached!</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            Your current profile Volforce already meets or exceeds your target. Select a higher target preset above to generate an ambitious new roadmap!
          </p>
        </div>
      ) : (
        /* Steps List */
        <div className="space-y-3">
          {displayedSteps.map((step) => {
            const isDone = completedSteps.has(step.stepNumber);
            const diffBadge = getDifficultyBadgeColor(step.chart.difficulty);
            const feasBadge = step.feasibility
              ? getFeasibilityBadgeColor(step.feasibility.feasibilityTier)
              : null;

            return (
              <div
                key={`${step.chart.chartID}-${step.stepNumber}`}
                className={`border rounded-xl p-4 transition-all duration-200 ${
                  isDone
                    ? 'bg-[#101b24]/60 border-emerald-500/40 shadow-sm'
                    : 'bg-[#0f1422] border-[#1f293d] hover:border-[#2b3a58]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  {/* Left: Checkbox & Step Number */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <button
                      onClick={() => toggleStep(step.stepNumber)}
                      className="mt-0.5 text-gray-500 hover:text-emerald-400 transition-colors"
                      title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 fill-emerald-400/20" />
                      ) : (
                        <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 hover:text-gray-400" />
                      )}
                    </button>

                    <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#141b2d] border border-[#22304d] flex items-center justify-center text-[11px] sm:text-xs font-mono font-bold text-gray-300 shrink-0">
                      #{step.stepNumber}
                    </span>

                    <span
                      className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider border ${
                        step.type === 'upscore'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-sdvx-cyan/10 text-sdvx-cyan border-sdvx-cyan/30'
                      }`}
                    >
                      {step.type}
                    </span>

                    {feasBadge && step.feasibility && (
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold border whitespace-nowrap ${feasBadge.bg} ${feasBadge.text} ${feasBadge.border}`}
                        title={step.feasibility.explanation}
                      >
                        {step.feasibility.feasibilityPercent}% Feasible
                      </span>
                    )}
                  </div>

                  {/* Right: Net VF Gain & Dismiss */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                          +{step.netVFGain.toFixed(3)}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-mono text-gray-400">VF</span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-mono text-gray-500 block">
                        Run: {step.cumulativeProfileVF.toFixed(3)}
                      </span>
                    </div>

                    <button
                      onClick={() => onDismissStep(step.chart.chartID)}
                      className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Dismiss song from plan"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                {/* Song Information & Difficulty */}
                <div className="mt-2.5 sm:mt-3 pl-0 sm:pl-9">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span
                      className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs font-black font-mono border whitespace-nowrap shrink-0 ${diffBadge.bg} ${diffBadge.text} ${diffBadge.border}`}
                    >
                      {step.chart.difficulty} {formatChartLevel(step.chart.levelNum, version)}
                    </span>
                    <a
                      href={getKamaiChartUrl(step.chart.chartID)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm font-bold text-white hover:text-sdvx-cyan transition-colors flex items-center gap-1.5 group break-all"
                      title="View chart on Kamaitachi"
                    >
                      <span>{step.song.title}</span>
                      <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 group-hover:text-sdvx-cyan transition-colors shrink-0" />
                    </a>
                    <span className="text-[11px] sm:text-xs text-gray-400 font-medium">by {step.song.artist}</span>
                  </div>

                  {/* Target Strategy & Rationale */}
                  <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3 text-xs bg-[#141b2d]/60 border border-[#202b40] rounded-lg p-2 sm:p-2.5">
                    <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs">
                      {step.currentScore ? (
                        <>
                          <span className="text-gray-400">{step.currentScore.toLocaleString()}</span>
                          <ArrowRight className="w-3 h-3 text-gray-500 shrink-0" />
                          <span className="font-bold text-sdvx-accent">
                            {step.targetScore.toLocaleString()} ({step.targetGrade || 'S'})
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-400">Unplayed</span>
                          <ArrowRight className="w-3 h-3 text-gray-500 shrink-0" />
                          <span className="font-bold text-sdvx-cyan">
                            {step.targetScore.toLocaleString()} ({step.targetGrade || 'S'})
                          </span>
                        </>
                      )}
                    </div>

                    {/* Step Lamp Switcher */}
                    <div className="flex items-center gap-1 bg-[#0a0d14] px-1.5 py-0.5 rounded-lg border border-[#202b40] max-w-full overflow-x-auto">
                      <span className="text-[10px] text-gray-400 font-mono font-medium mr-0.5 sm:mr-1 shrink-0">Lamp:</span>
                      <button
                        type="button"
                        onClick={() => onChangeStepLamp?.(step.stepNumber, 'CLEAR')}
                        className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold transition-all border shrink-0 ${
                          step.targetLamp === 'CLEAR'
                            ? 'bg-emerald-500/25 text-emerald-400 border-emerald-500/60 shadow-sm'
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                        title="Normal Clear (100% lamp coefficient)"
                      >
                        <span className="sm:hidden">CLR</span>
                        <span className="hidden sm:inline">CLEAR (100%)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeStepLamp?.(step.stepNumber, 'EXCESSIVE CLEAR')}
                        className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold transition-all border shrink-0 ${
                          step.targetLamp === 'EXCESSIVE CLEAR'
                            ? 'bg-purple-500/25 text-purple-400 border-purple-500/60 shadow-sm'
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                        title="Excessive Clear (102% lamp coefficient)"
                      >
                        <span className="sm:hidden">EXC</span>
                        <span className="hidden sm:inline">EXCESSIVE (102%)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeStepLamp?.(step.stepNumber, 'MAXXIVE CLEAR')}
                        className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold transition-all border shrink-0 ${
                          step.targetLamp === 'MAXXIVE CLEAR'
                            ? 'bg-amber-500/25 text-amber-400 border-amber-500/60 shadow-sm'
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                        title="Maxxive Clear (104% lamp coefficient)"
                      >
                        <span className="sm:hidden">MAX</span>
                        <span className="hidden sm:inline">MAXXIVE (104%)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeStepLamp?.(step.stepNumber, 'ULTIMATE CHAIN')}
                        className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold transition-all border shrink-0 ${
                          step.targetLamp === 'ULTIMATE CHAIN'
                            ? 'bg-rose-500/25 text-rose-400 border-rose-500/60 shadow-sm'
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                        title={`Ultimate Chain - Full Combo (${version === 'vf7' ? '106%' : '105%'} lamp coefficient)`}
                      >
                        <span className="sm:hidden">UC</span>
                        <span className="hidden sm:inline">UC ({version === 'vf7' ? '106%' : '105%'})</span>
                      </button>
                    </div>

                    <span className="text-gray-600 hidden sm:inline">|</span>

                    <span className="text-gray-300 font-mono text-[10px] sm:text-[11px]">
                      {step.primaryFactor}
                    </span>

                    <span className="text-gray-600 hidden sm:inline">|</span>

                    <p className="text-gray-400 text-[10px] sm:text-[11px] flex-1 min-w-[200px]">
                      💡 {step.rationale}
                    </p>
                  </div>

                  {/* Feasible Alternatives Drawer */}
                  {step.alternatives && step.alternatives.length > 0 && (
                    <div className="mt-2.5">
                      <button
                        onClick={() =>
                          setExpandedStep(
                            expandedStep === step.stepNumber ? null : step.stepNumber,
                          )
                        }
                        className="text-[11px] font-mono font-medium text-gray-400 hover:text-sdvx-cyan flex items-center gap-1.5 transition-colors"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-sdvx-cyan" />
                        <span>{step.alternatives.length} Feasible Alternative Options</span>
                        {expandedStep === step.stepNumber ? (
                          <ChevronUp className="w-3 h-3 text-sdvx-cyan" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        )}
                      </button>

                      {expandedStep === step.stepNumber && (
                        <div className="mt-2 space-y-1.5 bg-[#0a0d14] border border-[#1f293d] rounded-lg p-2.5 shadow-inner">
                          <p className="text-[10px] text-gray-400 font-mono mb-1.5">
                            Prefer a different song? Swap this step with any of these equally feasible options:
                          </p>
                          {step.alternatives.map((alt) => {
                            const altDiffBadge = getDifficultyBadgeColor(alt.chart.difficulty);
                            const altFeasBadge = alt.feasibility
                              ? getFeasibilityBadgeColor(alt.feasibility.feasibilityTier)
                              : null;
                            const altLampBadge = getLampBadgeColor(alt.targetLamp);

                            return (
                              <div
                                key={alt.chart.chartID}
                                className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-[#121826] border border-[#202b40] hover:border-[#2f3d5c] transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono border whitespace-nowrap shrink-0 ${altDiffBadge.bg} ${altDiffBadge.text} ${altDiffBadge.border}`}
                                  >
                                    {alt.chart.difficulty} {formatChartLevel(alt.chart.levelNum, version)}
                                  </span>
                                  <div>
                                    <a
                                      href={getKamaiChartUrl(alt.chart.chartID)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs font-bold text-white hover:text-sdvx-cyan transition-colors flex items-center gap-1 group"
                                      title="View chart on Kamaitachi"
                                    >
                                      <span>{alt.song.title}</span>
                                      <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-sdvx-cyan transition-colors shrink-0" />
                                    </a>
                                    <p className="text-[10px] text-gray-400">{alt.song.artist}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${altLampBadge.bg} ${altLampBadge.text} ${altLampBadge.border}`}
                                  >
                                    {alt.targetLamp === 'ULTIMATE CHAIN'
                                      ? 'UC'
                                      : alt.targetLamp === 'MAXXIVE CLEAR'
                                      ? 'MAX'
                                      : alt.targetLamp === 'EXCESSIVE CLEAR'
                                      ? 'EXC'
                                      : 'CLR'}
                                  </span>
                                  {altFeasBadge && alt.feasibility && (
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border whitespace-nowrap ${altFeasBadge.bg} ${altFeasBadge.text} ${altFeasBadge.border}`}
                                    >
                                      {alt.feasibility.feasibilityPercent}% Feasible
                                    </span>
                                  )}
                                  <span className="text-xs font-mono font-bold text-emerald-400">
                                    +{alt.netVFGain.toFixed(3)} VF
                                  </span>
                                  {onSwapStep && (
                                    <button
                                      onClick={() => {
                                        onSwapStep(step.stepNumber, alt);
                                        setExpandedStep(null);
                                      }}
                                      className="px-2.5 py-1 rounded bg-sdvx-cyan/15 hover:bg-sdvx-cyan hover:text-gray-950 border border-sdvx-cyan/40 text-sdvx-cyan text-[10px] font-bold font-mono transition-all shadow-sm"
                                    >
                                      Swap In
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
