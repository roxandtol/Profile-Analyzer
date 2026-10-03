import React, { useState } from 'react';
import { Search, ArrowDown, ArrowUp, ArrowUpDown, CheckSquare, Square, ExternalLink } from 'lucide-react';
import { UpscoreOpportunity, VolforceVersion } from '../core/types';
import { TachiServer } from '../api/tachiClient';
import { getDifficultyBadgeColor, getLampBadgeColor, getFeasibilityBadgeColor } from '../utils/colors';
import { formatChartLevel } from '../utils/format';
import { getKamaiChartUrl } from '../utils/tachiUrl';

interface UpscoresTabProps {
  upscores: UpscoreOpportunity[];
  version: VolforceVersion;
  server?: TachiServer;
}

export type UpscoreSortKey = 'gain' | 'feasibility' | 'diff';
export type SortDirection = 'desc' | 'asc';

export const UpscoresTab: React.FC<UpscoresTabProps> = ({ upscores, version, server }) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [hideLowFeasibility, setHideLowFeasibility] = useState<boolean>(true);
  const [sortKey, setSortKey] = useState<UpscoreSortKey>('gain');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: UpscoreSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const categories = [
    { id: 'all', label: 'All Upscores', count: upscores.length },
    { id: 'near-s', label: 'Near S (<50k to 9.9m)', count: upscores.filter((u) => u.category === 'near-s').length },
    { id: 'near-aaa-plus', label: 'Near AAA+', count: upscores.filter((u) => u.category === 'near-aaa-plus').length },
    { id: 'lamp-upgrade', label: 'Lamp Upgrades', count: upscores.filter((u) => u.category === 'lamp-upgrade').length },
    { id: 'top50-pusher', label: 'Rank 51-100 Contenders', count: upscores.filter((u) => u.category === 'top50-pusher').length },
  ];

  const uniqueLevels = Array.from(
    new Set(upscores.map((u) => Math.floor(u.levelNum))),
  ).sort((a, b) => b - a);

  const filtered = upscores.filter((u) => {
    if (filterCategory !== 'all' && u.category !== filterCategory) return false;
    if (selectedLevel !== 'all' && Math.floor(u.levelNum) !== selectedLevel) return false;
    if (hideLowFeasibility && (u.feasibility?.feasibilityPercent ?? 50) < 40) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = u.song.title.toLowerCase().includes(q);
      const matchArtist = u.song.artist.toLowerCase().includes(q);
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
              placeholder="Search by song title or artist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#141b2d] border border-[#22304d] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-sdvx-cyan transition-colors"
            />
          </div>

          {/* Level Filter */}
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

        {/* Row 2: Feasibility Filter Toggle & Sort Controls */}
        <div className="pt-3 border-t border-[#172033] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Feasibility Filter Toggle */}
          <div className="flex items-center">
            <button
              onClick={() => setHideLowFeasibility(!hideLowFeasibility)}
              className={`flex items-center gap-1.5 transition-colors ${
                hideLowFeasibility ? 'text-sdvx-cyan font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Filter out upscores with feasibility rating under 40%"
            >
              {hideLowFeasibility ? <CheckSquare className="w-4 h-4 text-sdvx-cyan" /> : <Square className="w-4 h-4 text-gray-500" />}
              Hide &lt;40% Feasibility
            </button>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="text-xs text-gray-400 font-mono shrink-0">Sort by:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as UpscoreSortKey)}
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

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-full sm:flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border transition-all shrink-0 ${
              filterCategory === cat.id
                ? 'bg-sdvx-accent/15 border-sdvx-accent text-sdvx-accent font-bold'
                : 'bg-[#0f1422] border-[#1f293d] text-gray-400 hover:text-white'
            }`}
          >
            <span>{cat.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#141b2d] border border-[#22304d]">
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Mobile Card List (< md) */}
      <div className="block md:hidden space-y-3">
        {sorted.length === 0 ? (
          <div className="bg-[#0f1422] border border-[#1f293d] rounded-xl p-8 text-center text-gray-500 text-xs">
            No upscore opportunities match your active filters.
          </div>
        ) : (
          sorted.map((u) => {
            const diffBadge = getDifficultyBadgeColor(u.chart.difficulty);
            const lampBadge = getLampBadgeColor(u.currentLamp);
            const feasBadge = u.feasibility
              ? getFeasibilityBadgeColor(u.feasibility.feasibilityTier)
              : null;

            return (
              <div
                key={u.id}
                className="bg-[#0f1422] border border-[#1f293d] rounded-xl p-3.5 space-y-2.5 shadow-sm"
              >
                {/* Header: Difficulty & Net Gain */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-black font-mono border whitespace-nowrap shrink-0 ${diffBadge.bg} ${diffBadge.text} ${diffBadge.border}`}
                    >
                      {u.chart.difficulty} {formatChartLevel(u.levelNum, version)}
                    </span>
                    {feasBadge && u.feasibility && (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${feasBadge.bg} ${feasBadge.text} ${feasBadge.border}`}
                      >
                        {u.feasibility.feasibilityPercent}% Feasible
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="text-emerald-400 font-black text-sm">
                      +{u.netVFGain.toFixed(3)} VF
                    </span>
                  </div>
                </div>

                {/* Song Title & Artist */}
                <div>
                  <a
                    href={getKamaiChartUrl(u.chart.chartID, server)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-white text-xs hover:text-sdvx-cyan transition-colors flex items-center gap-1 group"
                    title="View chart on Kamaitachi"
                  >
                    <span>{u.song.title}</span>
                    <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-sdvx-cyan transition-colors shrink-0" />
                  </a>
                  <p className="text-[11px] text-gray-400 truncate">{u.song.artist}</p>
                </div>

                {/* Score Progression Row */}
                <div className="bg-[#141b2d] border border-[#1f293d] rounded-lg p-2.5 flex items-center justify-between gap-2 font-mono text-xs">
                  <div className="min-w-0">
                    <span className="text-gray-400 text-[10px] block">Current</span>
                    <div className="flex items-center gap-1 mt-0.5 whitespace-nowrap">
                      <span className="text-gray-200 font-bold whitespace-nowrap">{u.currentScore.toLocaleString()}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap font-medium ${lampBadge.bg} ${lampBadge.text} ${lampBadge.border}`}>
                        {u.currentLamp}
                      </span>
                    </div>
                  </div>

                  <span className="text-gray-500 text-sm shrink-0">→</span>

                  <div className="text-right min-w-0">
                    <span className="text-sdvx-accent text-[10px] block font-bold">Goal Target</span>
                    <div className="flex items-center gap-1 justify-end mt-0.5 whitespace-nowrap">
                      <span className="text-sdvx-accent font-bold whitespace-nowrap">{u.targetScore.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-300 font-bold">({u.targetGrade})</span>
                    </div>
                  </div>
                </div>

                {/* Rationale & Category */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider ${
                        u.category === 'near-s'
                          ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30'
                          : u.category === 'near-aaa-plus'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : u.category === 'lamp-upgrade'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {u.category}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                      Goal Lamp: {u.targetLamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {u.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Upscores Table (>= md) */}
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
                <th className="py-3 px-4">Current Score</th>
                <th className="py-3 px-4">Target Goal</th>
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
                <th
                  onClick={() => handleSort('gain')}
                  className="py-3 px-4 text-right cursor-pointer select-none hover:text-white group transition-colors"
                  title="Click to sort by net VF gain"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Net VF Gain</span>
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
                <th className="py-3 px-4">Opportunity Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172033]">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No upscore opportunities match your active filters.
                  </td>
                </tr>
              ) : (
                sorted.map((u) => {
                  const diffBadge = getDifficultyBadgeColor(u.chart.difficulty);
                  const lampBadge = getLampBadgeColor(u.currentLamp);
                  const feasBadge = u.feasibility
                    ? getFeasibilityBadgeColor(u.feasibility.feasibilityTier)
                    : null;

                  return (
                    <tr key={u.id} className="hover:bg-[#141b2d]/60 transition-colors">
                      {/* Song & Difficulty */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-black font-mono border whitespace-nowrap shrink-0 ${diffBadge.bg} ${diffBadge.text} ${diffBadge.border}`}
                          >
                            {u.chart.difficulty} {formatChartLevel(u.levelNum, version)}
                          </span>
                          <div className="min-w-0">
                            <a
                              href={getKamaiChartUrl(u.chart.chartID, server)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-white text-xs hover:text-sdvx-cyan transition-colors flex items-center gap-1 group"
                              title="View chart on Kamaitachi"
                            >
                              <span>{u.song.title}</span>
                              <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-sdvx-cyan transition-colors shrink-0" />
                            </a>
                            <p className="text-[11px] text-gray-400 truncate">{u.song.artist}</p>
                          </div>
                        </div>
                      </td>

                      {/* Current Score */}
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <span className="text-gray-200 font-bold">{u.currentScore.toLocaleString()}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                          <span className="text-gray-400 text-[10px] shrink-0">{u.currentGrade}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap font-medium ${lampBadge.bg} ${lampBadge.text} ${lampBadge.border}`}>
                            {u.currentLamp}
                          </span>
                        </div>
                      </td>

                      {/* Target Goal */}
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-sdvx-accent font-bold">
                            {u.targetScore.toLocaleString()} ({u.targetGrade})
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-0.5 block whitespace-nowrap">
                          Goal Lamp: {u.targetLamp}
                        </span>
                      </td>

                      {/* Feasibility */}
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        {feasBadge && u.feasibility ? (
                          <span
                            title={`${u.feasibility.feasibilityTier.replace('_', ' ')}: ${u.feasibility.explanation}`}
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${feasBadge.bg} ${feasBadge.text} ${feasBadge.border}`}
                          >
                            {u.feasibility.feasibilityPercent}% Feasible
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Net Gain */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="text-emerald-400 font-black text-sm">
                          +{u.netVFGain.toFixed(3)}
                        </span>
                        <span className="text-gray-500 text-[10px] block">
                          Chart VF: {u.targetVF.toFixed(3)}
                        </span>
                      </td>

                      {/* Rationale / Category */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-1 ${
                            u.category === 'near-s'
                              ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30'
                              : u.category === 'near-aaa-plus'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : u.category === 'lamp-upgrade'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {u.category}
                        </span>
                        <p className="text-[11px] text-gray-400 max-w-sm">
                          {u.description}
                        </p>
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
