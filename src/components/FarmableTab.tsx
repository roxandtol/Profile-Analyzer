import React, { useState } from 'react';
import { Search, CheckSquare, Square, AlertTriangle, Sparkles, ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from 'lucide-react';
import { FarmableOpportunity, VolforceVersion } from '../core/types';
import { getDifficultyBadgeColor, getFeasibilityBadgeColor } from '../utils/colors';
import { formatChartLevel } from '../utils/format';
import { getKamaiChartUrl } from '../utils/tachiUrl';

interface FarmableTabProps {
  farmables: FarmableOpportunity[];
  version: VolforceVersion;
}

export type FarmableSortKey = 'gain' | 'feasibility' | 'diff';
export type SortDirection = 'desc' | 'asc';

export const FarmableTab: React.FC<FarmableTabProps> = ({ farmables, version }) => {
  const [search, setSearch] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [hideGimmicks, setHideGimmicks] = useState<boolean>(false);
  const [hideLowFeasibility, setHideLowFeasibility] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unplayed' | 'underplayed'>('all');
  const [sortKey, setSortKey] = useState<FarmableSortKey>('gain');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: FarmableSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const uniqueLevels = Array.from(
    new Set(farmables.map((f) => Math.floor(f.levelNum))),
  ).sort((a, b) => b - a);

  const filtered = farmables.filter((f) => {
    if (selectedLevel !== 'all' && Math.floor(f.levelNum) !== selectedLevel) return false;
    if (hideGimmicks && f.individualDifference) return false;
    if (hideLowFeasibility && (f.feasibility?.feasibilityPercent ?? 50) < 40) return false;
    if (statusFilter === 'unplayed' && f.isPlayed) return false;
    if (statusFilter === 'underplayed' && !f.isPlayed) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = f.song.title.toLowerCase().includes(q);
      const matchArtist = f.song.artist.toLowerCase().includes(q);
      return matchTitle || matchArtist;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortKey === 'feasibility') {
      const aFeas = a.feasibility?.feasibilityPercent ?? 0;
      const bFeas = b.feasibility?.feasibilityPercent ?? 0;
      comparison = aFeas - bFeas;
      if (comparison === 0) comparison = a.netVFGain - b.netVFGain;
    } else if (sortKey === 'diff') {
      comparison = a.levelNum - b.levelNum;
      if (comparison === 0) comparison = a.netVFGain - b.netVFGain;
    } else {
      comparison = a.netVFGain - b.netVFGain;
      if (comparison === 0) {
        const aFeas = a.feasibility?.feasibilityPercent ?? 0;
        const bFeas = b.feasibility?.feasibilityPercent ?? 0;
        comparison = aFeas - bFeas;
      }
    }
    return sortDirection === 'desc' ? -comparison : comparison;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-[#0f1422] border border-[#1f293d] rounded-2xl p-4 space-y-3.5 shadow-lg">
        {/* Row 1: Search & Level Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search farmable charts by title or artist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#141b2d] border border-[#22304d] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-sdvx-cyan transition-colors"
            />
          </div>

          {/* Level Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
            <span className="text-xs text-gray-400 font-mono shrink-0">Level:</span>
            <button
              onClick={() => setSelectedLevel('all')}
              className={`px-2.5 py-1.5 rounded text-xs font-mono shrink-0 transition-all ${
                selectedLevel === 'all'
                  ? 'bg-sdvx-cyan text-gray-950 font-bold shadow-sm'
                  : 'bg-[#141b2d] text-gray-400 hover:text-white border border-[#202b40]'
              }`}
            >
              All
            </button>
            {uniqueLevels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1.5 rounded text-xs font-mono shrink-0 transition-all ${
                  selectedLevel === lvl
                    ? 'bg-sdvx-cyan text-gray-950 font-bold shadow-sm'
                    : 'bg-[#141b2d] text-gray-400 hover:text-white border border-[#202b40]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Toggles, Status Filter & Sort Controls */}
        <div className="pt-3 border-t border-[#172033] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Gimmick, Feasibility & Status Toggles */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              onClick={() => setHideGimmicks(!hideGimmicks)}
              className={`flex items-center gap-1.5 transition-colors ${
                hideGimmicks ? 'text-sdvx-cyan font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              {hideGimmicks ? <CheckSquare className="w-4 h-4 text-sdvx-cyan" /> : <Square className="w-4 h-4 text-gray-500" />}
              Hide Gimmicks
            </button>

            <button
              onClick={() => setHideLowFeasibility(!hideLowFeasibility)}
              className={`flex items-center gap-1.5 transition-colors ${
                hideLowFeasibility ? 'text-sdvx-cyan font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Filter out charts with feasibility rating under 40%"
            >
              {hideLowFeasibility ? <CheckSquare className="w-4 h-4 text-sdvx-cyan" /> : <Square className="w-4 h-4 text-gray-500" />}
              Hide &lt;40% Feasibility
            </button>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#141b2d] border border-[#22304d] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none text-xs font-mono"
            >
              <option value="all">All Status</option>
              <option value="unplayed">Unplayed Only</option>
              <option value="underplayed">Underplayed (Has Score &lt; S)</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="text-xs text-gray-400 font-mono shrink-0">Sort by:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as FarmableSortKey)}
              className="bg-[#141b2d] border border-[#22304d] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none text-xs font-mono"
            >
              <option value="gain">Net VF Gain</option>
              <option value="feasibility">Feasibility %</option>
              <option value="diff">Chart Difficulty</option>
            </select>

            <button
              onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              title={`Direction: ${sortDirection.toUpperCase()} (Click to invert)`}
              className="px-2.5 py-1.5 rounded-lg bg-[#141b2d] border border-[#22304d] text-gray-300 hover:text-white hover:border-gray-500 transition-colors flex items-center gap-1 font-mono text-[11px]"
            >
              {sortDirection === 'desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-sdvx-cyan" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5 text-sdvx-cyan" />
              )}
              <span className="text-[10px] uppercase text-gray-400 font-bold">{sortDirection}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info notice about VF7 vs VF6 logic */}
      <div className="bg-[#121826]/70 border border-[#1f293d] rounded-xl px-4 py-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sdvx-cyan shrink-0" />
          <p className="text-gray-300">
            {version === 'vf7' ? (
              <>
                <strong>VF7 Optimization Active:</strong> High decimal levels (e.g. 18.7 vs 18.2) inherently grant higher VF yield in the mathematical formula. Recommendations are ranked primarily by net gain from <code>levelNum</code>, with community tier lists acting as the ease check.
              </>
            ) : (
              <>
                <strong>VF6 Optimization Active:</strong> Integer levels are floored. Charts within the same level yield identical base VF, so recommendations are ranked primarily by community S-tier (T8–T10).
              </>
            )}
          </p>
        </div>
        <span className="text-xs font-mono text-gray-400 shrink-0">{filtered.length} charts</span>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="block md:hidden space-y-3">
        {sorted.length === 0 ? (
          <div className="bg-[#0f1422] border border-[#1f293d] rounded-xl p-8 text-center text-gray-500 text-xs">
            No farmable charts match your active filters. Try lowering the minimum level or clearing search.
          </div>
        ) : (
          sorted.map((f) => {
            const diffBadge = getDifficultyBadgeColor(f.difficulty);
            const feasBadge = f.feasibility
              ? getFeasibilityBadgeColor(f.feasibility.feasibilityTier)
              : null;

            return (
              <div
                key={f.id}
                className="bg-[#0f1422] border border-[#1f293d] rounded-xl p-3.5 space-y-2.5 shadow-sm"
              >
                {/* Header row: Difficulty & Net Gain */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-black font-mono border whitespace-nowrap shrink-0 ${diffBadge.bg} ${diffBadge.text} ${diffBadge.border}`}
                    >
                      {f.difficulty} {formatChartLevel(f.levelNum, version)}
                    </span>
                    {feasBadge && f.feasibility && (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${feasBadge.bg} ${feasBadge.text} ${feasBadge.border}`}
                      >
                        {f.feasibility.feasibilityPercent}% Feasible
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="text-emerald-400 font-black text-sm">
                      +{f.netVFGain.toFixed(3)} VF
                    </span>
                  </div>
                </div>

                {/* Song Title & Artist */}
                <div>
                  <a
                    href={getKamaiChartUrl(f.chart.chartID)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-white text-xs hover:text-sdvx-cyan transition-colors flex items-center gap-1 group"
                    title="View chart on Kamaitachi"
                  >
                    <span>{f.song.title}</span>
                    <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-sdvx-cyan transition-colors shrink-0" />
                  </a>
                  <p className="text-[11px] text-gray-400 truncate">{f.song.artist}</p>
                </div>

                {/* Tags row: Tiers & Status */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#172033] text-[10px] font-mono">
                  {f.sTier?.text && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                      S: {f.sTier.text}
                    </span>
                  )}
                  {f.clearTier?.text && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                      Clear: {f.clearTier.text}
                    </span>
                  )}
                  {f.individualDifference && (
                    <span className="flex items-center gap-0.5 text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      Gimmick
                    </span>
                  )}

                  <span className="ml-auto">
                    {f.isPlayed ? (
                      <span className="text-amber-400 font-bold">
                        PB: {f.existingScore?.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sdvx-cyan font-bold">Unplayed</span>
                    )}
                  </span>
                </div>

                {/* Primary Advantage */}
                {f.primaryAdvantage && (
                  <div className="text-[11px] text-gray-300 bg-[#141b2d] border border-[#1f293d] rounded-lg px-2.5 py-1.5 font-mono">
                    {f.primaryAdvantage}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Farmables Table (>= md) */}
      <div className="hidden md:block bg-[#0f1422] border border-[#1f293d] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121826] border-b border-[#1f293d] text-gray-400 font-mono uppercase tracking-wider text-[11px]">
              <tr>
                <th
                  onClick={() => handleSort('diff')}
                  className="py-3 px-4 cursor-pointer select-none hover:text-white group transition-colors"
                  title="Click to sort by chart difficulty"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Song / Difficulty</span>
                    {sortKey === 'diff' ? (
                      sortDirection === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-sdvx-cyan" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5 text-sdvx-cyan" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Community Tiers</th>
                <th
                  onClick={() => handleSort('feasibility')}
                  className="py-3 px-4 whitespace-nowrap cursor-pointer select-none hover:text-white group transition-colors"
                  title="Click to sort by feasibility"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Feasibility</span>
                    {sortKey === 'feasibility' ? (
                      sortDirection === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-sdvx-cyan" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5 text-sdvx-cyan" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Status</th>
                <th
                  onClick={() => handleSort('gain')}
                  className="py-3 px-4 text-right cursor-pointer select-none hover:text-white group transition-colors"
                  title="Click to sort by net profile VF gain"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Net Profile VF Gain</span>
                    {sortKey === 'gain' ? (
                      sortDirection === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-sdvx-cyan" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5 text-sdvx-cyan" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Key Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172033]">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No farmable charts match your active filters. Try lowering the minimum level or clearing search.
                  </td>
                </tr>
              ) : (
                sorted.map((f) => {
                  const diffBadge = getDifficultyBadgeColor(f.difficulty);
                  const feasBadge = f.feasibility
                    ? getFeasibilityBadgeColor(f.feasibility.feasibilityTier)
                    : null;

                  return (
                    <tr key={f.id} className="hover:bg-[#141b2d]/60 transition-colors">
                      {/* Song & Difficulty */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-black font-mono border whitespace-nowrap shrink-0 ${diffBadge.bg} ${diffBadge.text} ${diffBadge.border}`}
                          >
                            {f.difficulty} {formatChartLevel(f.levelNum, version)}
                          </span>
                          <div className="min-w-0">
                            <a
                              href={getKamaiChartUrl(f.chart.chartID)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-white text-xs hover:text-sdvx-cyan transition-colors flex items-center gap-1 group"
                              title="View chart on Kamaitachi"
                            >
                              <span>{f.song.title}</span>
                              <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-sdvx-cyan transition-colors shrink-0" />
                            </a>
                            <p className="text-[11px] text-gray-400 truncate">{f.song.artist}</p>
                          </div>
                        </div>
                      </td>

                      {/* Community Tiers */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          {f.sTier?.text ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                              S: {f.sTier.text}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-[10px]">-</span>
                          )}

                          {f.clearTier?.text && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                              Clear: {f.clearTier.text}
                            </span>
                          )}

                          {f.individualDifference && (
                            <span className="flex items-center gap-0.5 text-amber-400 text-[10px]" title="Individual difference: Lasers / cross-hands / speed gimmicks">
                              <AlertTriangle className="w-3 h-3" />
                              Gimmick
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Feasibility */}
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {feasBadge && f.feasibility ? (
                          <span
                            title={`${f.feasibility.feasibilityTier.replace('_', ' ')}: ${f.feasibility.explanation}`}
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${feasBadge.bg} ${feasBadge.text} ${feasBadge.border}`}
                          >
                            {f.feasibility.feasibilityPercent}% Feasible
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 font-mono">
                        {f.isPlayed ? (
                          <div>
                            <span className="text-amber-400 font-bold text-[11px]">Underplayed</span>
                            <span className="text-gray-400 text-[10px] block">
                              PB: {f.existingScore?.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sdvx-cyan font-bold text-[11px]">Unplayed</span>
                        )}
                      </td>

                      {/* Net Gain */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="text-emerald-400 font-black text-sm">
                          +{f.netVFGain.toFixed(3)}
                        </span>
                        <span className="text-gray-500 text-[10px] block">
                          Chart S-VF: {f.projectedVF.toFixed(3)}
                        </span>
                      </td>

                      {/* Primary Advantage */}
                      <td className="py-3 px-4 text-gray-300 font-mono text-xs">
                        {f.primaryAdvantage}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
