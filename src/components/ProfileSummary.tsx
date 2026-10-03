import React, { useState, useEffect } from 'react';
import { Target, ShieldAlert, Award, Layers, ExternalLink } from 'lucide-react';
import { VolforceVersion } from '../core/types';
import { TachiServer } from '../api/tachiClient';
import { getClassColor, vfToClass } from '../core/volforce';
import { getKamaiUserPfpUrl, getKamaiUserUrl } from '../utils/tachiUrl';

interface ProfileSummaryProps {
  username: string;
  userID: number;
  currentVF: number;
  currentClass: string;
  targetVF: number;
  top50Cutoff: number;
  version: VolforceVersion;
  levelDistribution: Record<number, number>;
  onTargetChange: (target: number) => void;
  server?: TachiServer;
}

export const ProfileSummary: React.FC<ProfileSummaryProps> = ({
  username,
  userID,
  currentVF,
  currentClass,
  targetVF,
  top50Cutoff,
  version,
  levelDistribution,
  onTargetChange,
  server,
}) => {
  const currentBadgeColor = getClassColor(currentClass);
  const targetClass = vfToClass(targetVF);
  const targetBadgeColor = getClassColor(targetClass);

  const deltaNeeded = Math.max(0, targetVF - currentVF);

  const [pfpError, setPfpError] = useState(false);
  const pfpUrl = getKamaiUserPfpUrl(userID, server);
  const profileUrl = getKamaiUserUrl(username, server);

  useEffect(() => {
    setPfpError(false);
  }, [userID, server]);

  // Suggested Target Presets (strictly higher than currentVF)
  const ALL_CLASS_MILESTONES = [
    { label: 'Eldora I', value: 18.0 },
    { label: 'Eldora II', value: 18.25 },
    { label: 'Eldora III', value: 18.5 },
    { label: 'Eldora IV', value: 18.75 },
    { label: 'Crimson I', value: 19.0 },
    { label: 'Crimson II', value: 19.25 },
    { label: 'Crimson III', value: 19.5 },
    { label: 'Crimson IV', value: 19.75 },
    { label: 'Imperial I', value: 20.0 },
    { label: 'Imperial II', value: 20.5 },
    { label: 'Imperial III', value: 21.0 },
    { label: 'Imperial IV', value: 21.5 },
    { label: 'Imperial V', value: 22.0 },
  ];

  const nextSubtier = Math.round((Math.floor(currentVF * 4) / 4 + 0.25) * 1000) / 1000;
  const nextHalfTier = Math.round((Math.floor(currentVF * 2) / 2 + 0.5) * 1000) / 1000;

  const presets: { label: string; value: number }[] = [
    { label: `+0.25 Subtier (${nextSubtier.toFixed(3)})`, value: nextSubtier },
  ];

  if (nextHalfTier > nextSubtier + 0.005) {
    presets.push({ label: `+0.50 Half-Tier (${nextHalfTier.toFixed(3)})`, value: nextHalfTier });
  }

  const upcomingClasses = ALL_CLASS_MILESTONES.filter((m) => m.value > currentVF + 0.005).slice(0, 3);
  for (const m of upcomingClasses) {
    if (!presets.some((p) => Math.abs(p.value - m.value) < 0.005)) {
      presets.push({ label: `${m.label} (${m.value.toFixed(3)})`, value: m.value });
    }
  }

  const sortedLevels = Object.keys(levelDistribution)
    .map(Number)
    .sort((a, b) => b - a);

  const [showCompositionMobile, setShowCompositionMobile] = React.useState(false);

  return (
    <div className="bg-[#0f1422] border border-[#1f293d] rounded-2xl p-3.5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-sdvx-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-sdvx-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 items-center">
        {/* Left Column: Player & Current VF */}
        <div className="lg:col-span-4 flex flex-col gap-2.5 sm:gap-3">
          <div className="flex items-center gap-3">
            {/* Kamaitachi User Avatar */}
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`View ${username}'s profile on Kamaitachi`}
              className="group relative block shrink-0"
            >
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-[#161f33] border-2 border-[#2b3a58] group-hover:border-sdvx-cyan overflow-hidden flex items-center justify-center shadow-lg transition-all shrink-0">
                {!pfpError ? (
                  <img
                    src={pfpUrl}
                    alt={username}
                    onError={() => setPfpError(true)}
                    className="w-full h-full object-cover rounded-[10px]"
                  />
                ) : (
                  <span className="text-base sm:text-xl font-bold text-sdvx-cyan">
                    {username.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </a>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base sm:text-xl font-black text-white hover:text-sdvx-cyan transition-colors truncate flex items-center gap-1 group"
                  title="View profile on Kamaitachi"
                >
                  <span className="truncate">{username}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-sdvx-cyan transition-colors shrink-0" />
                </a>
                <span className="text-xs text-gray-500 font-mono shrink-0">#{userID}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider border ${currentBadgeColor.bg} ${currentBadgeColor.text} ${currentBadgeColor.border} ${currentBadgeColor.glow}`}
                >
                  <Award className="w-3.5 h-3.5" />
                  {currentClass}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#141b2d] border border-[#22304d] rounded-xl p-3 sm:p-4 flex items-baseline justify-between mt-0.5 sm:mt-2">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider">Current Volforce</p>
              <div className="flex items-baseline gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {currentVF.toFixed(3)}
                </span>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-sdvx-cyan uppercase">
                  {version}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider">#50 Cutoff Floor</p>
              <div className="flex items-baseline justify-end gap-1 mt-0.5 sm:mt-1" title="The 50th chart in your profile. Any new play must exceed this value to increase your total VF!">
                <span className="text-lg sm:text-xl font-black font-mono text-gray-300">
                  {top50Cutoff.toFixed(3)}
                </span>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Target Volforce & Presets */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-sdvx-accent" />
              Target Volforce Goal
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${targetBadgeColor.bg} ${targetBadgeColor.text} ${targetBadgeColor.border}`}
            >
              {targetClass}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-0">
              <input
                type="number"
                step="0.05"
                min="0"
                max="24"
                value={targetVF}
                onChange={(e) => onTargetChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#141b2d] border border-[#22304d] rounded-xl px-3 sm:px-4 py-1.5 sm:py-2.5 text-lg sm:text-2xl font-black font-mono text-white focus:outline-none focus:border-sdvx-accent focus:ring-1 focus:ring-sdvx-accent"
              />
              <span className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">
                VF
              </span>
            </div>

            <div className="bg-[#141b2d] border border-[#22304d] rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-right shrink-0">
              <span className="text-[9px] sm:text-[10px] uppercase text-gray-400 tracking-wider">Required Gain</span>
              <p className="text-base sm:text-lg font-black font-mono text-sdvx-accent">
                +{deltaNeeded.toFixed(3)}
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => onTargetChange(p.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  Math.abs(targetVF - p.value) < 0.001
                    ? 'bg-sdvx-accent text-white font-bold'
                    : 'bg-[#141b2d] hover:bg-[#1c263f] text-gray-300 border border-[#22304d]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Mobile Collapsible Top 50 Composition */}
          <div className="lg:hidden mt-1">
            <button
              type="button"
              onClick={() => setShowCompositionMobile(!showCompositionMobile)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-[#141b2d] border border-[#22304d] text-xs font-mono text-gray-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                <Layers className="w-3.5 h-3.5 text-sdvx-cyan shrink-0" />
                <span className="font-bold shrink-0">Top 50:</span>
                <span className="text-gray-400 truncate text-[11px]">
                  {sortedLevels.map((lvl) => `Lv.${lvl}: ${levelDistribution[lvl]}`).join(' • ')}
                </span>
              </div>
              <span className="text-[11px] text-sdvx-cyan font-bold shrink-0 ml-2">
                {showCompositionMobile ? '▲ Hide' : '▼ Bars'}
              </span>
            </button>

            {showCompositionMobile && (
              <div className="mt-2 bg-[#141b2d]/80 border border-[#22304d] rounded-xl p-3 space-y-2">
                <div className="space-y-1.5">
                  {sortedLevels.map((lvl) => {
                    const count = levelDistribution[lvl] || 0;
                    const pct = (count / 50) * 100;
                    return (
                      <div key={lvl} className="flex items-center gap-2 text-xs font-mono">
                        <span className="w-10 font-bold text-gray-300">Lv.{lvl}</span>
                        <div className="flex-1 bg-[#0c101a] h-2.5 rounded-full overflow-hidden border border-[#1b263d]">
                          <div
                            className="bg-gradient-to-r from-sdvx-cyan to-sdvx-accent h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-gray-400 font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-[#1f293d] text-[10px] text-gray-400 leading-tight">
                  {version === 'vf7' ? (
                    <span className="text-cyan-300/90">
                      ✨ <strong>VF7 Mode:</strong> Decimal levels scale VF yield. High decimals prioritized.
                    </span>
                  ) : (
                    <span className="text-pink-300/90">
                      ✨ <strong>VF6 Mode:</strong> Floored integer levels. Easy community S-tiers prioritized.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Level Distribution Breakdown (Desktop only >= lg) */}
        <div className="hidden lg:flex lg:col-span-3 bg-[#141b2d]/60 border border-[#22304d] rounded-xl p-4 flex-col justify-between self-stretch">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sdvx-cyan" />
              Top 50 Composition
            </span>
            <span className="text-xs text-gray-400 font-mono">50 plays</span>
          </div>

          <div className="space-y-1.5">
            {sortedLevels.map((lvl) => {
              const count = levelDistribution[lvl] || 0;
              const pct = (count / 50) * 100;
              return (
                <div key={lvl} className="flex items-center gap-2 text-xs font-mono">
                  <span className="w-10 font-bold text-gray-300">Lv.{lvl}</span>
                  <div className="flex-1 bg-[#0c101a] h-2.5 rounded-full overflow-hidden border border-[#1b263d]">
                    <div
                      className="bg-gradient-to-r from-sdvx-cyan to-sdvx-accent h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-gray-400 font-medium">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Strategy Tip */}
          <div className="mt-3 pt-2 border-t border-[#1f293d] text-[11px] text-gray-400 leading-tight">
            {version === 'vf7' ? (
              <span className="text-cyan-300/90">
                ✨ <strong>VF7 Mode:</strong> Decimal <code>levelNum</code> directly scales VF gain. Recommendations prioritize high decimals first.
              </span>
            ) : (
              <span className="text-pink-300/90">
                ✨ <strong>VF6 Mode:</strong> Floored integer levels. Recommendations prioritize easy community S-tiers (T8–T10).
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
