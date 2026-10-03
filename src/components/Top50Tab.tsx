import React from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import { AnalyzedScore, VolforceVersion } from '../core/types';
import { TachiServer } from '../api/tachiClient';
import { getDifficultyBadgeColor, getGradeBadgeColor, getLampBadgeColor } from '../utils/colors';
import { formatChartLevel } from '../utils/format';
import { getKamaiChartUrl } from '../utils/tachiUrl';

interface Top50TabProps {
  top50Scores: AnalyzedScore[];
  version: VolforceVersion;
  cutoff: number;
  server?: TachiServer;
}

export const Top50Tab: React.FC<Top50TabProps> = ({ top50Scores, version, cutoff, server }) => {
  return (
    <div className="space-y-4">
      {/* Intro Box */}
      <div className="bg-[#121826]/70 border border-[#1f293d] rounded-xl px-4 py-3 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-gray-300">
            The <strong>#50 cutoff floor ({cutoff.toFixed(3)} VF)</strong> is the gatekeeper of your profile. Scores ranked #41–#50 are the lowest contributors and will be automatically displaced whenever you register a new play or upscore above the cutoff.
          </p>
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="block md:hidden space-y-2.5">
        {top50Scores.map((s) => {
          const diffBadge = getDifficultyBadgeColor(s.chart.difficulty);
          const gradeBadge = getGradeBadgeColor(s.grade);
          const lampBadge = getLampBadgeColor(s.lamp);
          const isBottom10 = s.rank >= 41;

          return (
            <div
              key={s.chart.chartID}
              className={`border rounded-xl p-3 space-y-2 transition-colors ${
                isBottom10
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-[#0f1422] border-[#1f293d]'
              }`}
            >
              {/* Top: Rank, Difficulty, Volforce */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      s.rank === 1
                        ? 'bg-sdvx-gold/20 text-sdvx-gold border border-sdvx-gold/40'
                        : s.rank <= 3
                        ? 'bg-slate-200/20 text-slate-200 border border-slate-200/30'
                        : isBottom10
                        ? 'bg-amber-500/20 text-amber-300 font-black'
                        : 'bg-[#141b2d] text-gray-400 border border-[#202b40]'
                    }`}
                  >
                    #{s.rank}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-black font-mono border ${diffBadge.bg} ${diffBadge.text} ${diffBadge.border}`}
                  >
                    {s.chart.difficulty} {formatChartLevel(s.chart.levelNum, version)}
                  </span>
                </div>

                <div className="text-right font-mono">
                  <span className="text-white font-black text-sm">
                    {s.vf.toFixed(3)}
                  </span>
                  <span className="text-[10px] text-gray-500 ml-1 uppercase">{version}</span>
                </div>
              </div>

              {/* Title & Artist */}
              <div>
                <a
                  href={getKamaiChartUrl(s.chart.chartID, server)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white text-xs hover:text-sdvx-cyan transition-colors flex items-center gap-1 group"
                  title="View chart on Kamaitachi"
                >
                  <span className="truncate">{s.song.title}</span>
                  <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-sdvx-cyan transition-colors shrink-0" />
                </a>
                <p className="text-[11px] text-gray-400 truncate">{s.song.artist}</p>
              </div>

              {/* Score, Grade & Lamp */}
              <div className="flex items-center justify-between pt-1 border-t border-[#172033] font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-200 font-bold">{s.score.toLocaleString()}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${gradeBadge.bg} ${gradeBadge.text}`}>
                    {s.grade}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${lampBadge.bg} ${lampBadge.text} ${lampBadge.border}`}>
                  {s.lamp}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Top 50 Table (>= md) */}
      <div className="hidden md:block bg-[#0f1422] border border-[#1f293d] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121826] border-b border-[#1f293d] text-gray-400 font-mono uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Song / Difficulty</th>
                <th className="py-3 px-4">Score & Grade</th>
                <th className="py-3 px-4">Lamp</th>
                <th className="py-3 px-4 text-right">Chart Volforce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172033]">
              {top50Scores.map((s) => {
                const diffBadge = getDifficultyBadgeColor(s.chart.difficulty);
                const gradeBadge = getGradeBadgeColor(s.grade);
                const lampBadge = getLampBadgeColor(s.lamp);
                const isBottom10 = s.rank >= 41;

                return (
                  <tr
                    key={s.chart.chartID}
                    className={`transition-colors ${
                      isBottom10
                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                        : 'hover:bg-[#141b2d]/60'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center font-mono">
                      <span
                        className={`inline-block w-7 py-0.5 rounded text-xs font-bold ${
                          s.rank === 1
                            ? 'bg-sdvx-gold/20 text-sdvx-gold border border-sdvx-gold/40'
                            : s.rank <= 3
                            ? 'bg-slate-200/20 text-slate-200 border border-slate-200/30'
                            : isBottom10
                            ? 'bg-amber-500/20 text-amber-300 font-black'
                            : 'text-gray-400'
                        }`}
                      >
                        #{s.rank}
                      </span>
                    </td>

                    {/* Song & Difficulty */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-black font-mono border ${diffBadge.bg} ${diffBadge.text} ${diffBadge.border}`}
                        >
                          {s.chart.difficulty} {formatChartLevel(s.chart.levelNum, version)}
                        </span>
                        <div>
                          <a
                            href={getKamaiChartUrl(s.chart.chartID, server)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-white text-xs hover:text-sdvx-cyan transition-colors flex items-center gap-1 group"
                            title="View chart on Kamaitachi"
                          >
                            <span>{s.song.title}</span>
                            <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-sdvx-cyan transition-colors shrink-0" />
                          </a>
                          <p className="text-[11px] text-gray-400">{s.song.artist}</p>
                        </div>
                      </div>
                    </td>

                    {/* Score & Grade */}
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span className="text-gray-200 font-bold">{s.score.toLocaleString()}</span>
                      <span className={`ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold ${gradeBadge.bg} ${gradeBadge.text}`}>
                        {s.grade}
                      </span>
                    </td>

                    {/* Lamp */}
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${lampBadge.bg} ${lampBadge.text} ${lampBadge.border}`}>
                        {s.lamp}
                      </span>
                    </td>

                    {/* Volforce */}
                    <td className="py-3 px-4 text-right font-mono">
                      <span className="text-white font-black text-sm">
                        {s.vf.toFixed(3)}
                      </span>
                      <span className="text-gray-500 text-[10px] block uppercase">
                        {version}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
