import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText } from 'lucide-react';
import { RoadmapStep, VolforceVersion } from '../core/types';
import { formatChartLevel } from '../utils/format';
import { getKamaiChartUrl } from '../utils/tachiUrl';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  currentVF: number;
  targetVF: number;
  version: VolforceVersion;
  steps: RoadmapStep[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  username,
  currentVF,
  targetVF,
  version,
  steps,
}) => {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'markdown' | 'text'>('markdown');

  if (!isOpen) return null;

  const generateMarkdown = (): string => {
    let md = `# SDVX Volforce Roadmap: ${username}\n`;
    md += `- **Current Volforce**: ${currentVF.toFixed(3)} (${version.toUpperCase()})\n`;
    md += `- **Target Volforce**: ${targetVF.toFixed(3)}\n`;
    md += `- **Required Gain**: +${(targetVF - currentVF).toFixed(3)} VF\n`;
    md += `- **Total Steps**: ${steps.length}\n\n`;
    md += `## Arcade Action Plan\n\n`;

    for (const s of steps) {
      const type = s.isHigherStuff ? 'TARGET PUSHER' : s.type === 'upscore' ? 'UPSCORE' : 'FARMABLE';
      const targetStr = `${s.targetScore.toLocaleString()} (${s.targetLamp})`;
      const currStr = s.currentScore ? `Current: ${s.currentScore.toLocaleString()} -> ` : '';
      const feasStr = s.feasibility ? ` [Feasibility: ${s.feasibility.feasibilityPercent}%]` : '';
      const chartUrl = getKamaiChartUrl(s.chart.chartID);
      md += `- [ ] **#${s.stepNumber} [${type}]** [${s.song.title}](${chartUrl}) [${s.chart.difficulty} ${formatChartLevel(s.chart.levelNum, version)}]${feasStr}\n`;
      md += `  - Goal: ${currStr}${targetStr} | Net Gain: +${s.netVFGain.toFixed(3)} VF (Running: ${s.cumulativeProfileVF.toFixed(3)})\n`;
      md += `  - *Tip*: ${s.rationale}\n`;
    }

    return md;
  };

  const generatePlainText = (): string => {
    let txt = `=== SDVX VOLFORCE ROUTE: ${username} ===\n`;
    txt += `Current: ${currentVF.toFixed(3)} | Target: ${targetVF.toFixed(3)} (+${(targetVF - currentVF).toFixed(3)} VF)\n\n`;

    for (const s of steps) {
      const type = s.isHigherStuff ? 'PUSHER' : s.type === 'upscore' ? 'UP' : 'FARM';
      const feasStr = s.feasibility ? ` (${s.feasibility.feasibilityPercent}% feas)` : '';
      const chartUrl = getKamaiChartUrl(s.chart.chartID);
      txt += `[ ] #${s.stepNumber} [${type}] ${s.song.title} [${s.chart.difficulty} ${formatChartLevel(s.chart.levelNum, version)}]${feasStr}\n`;
      txt += `    Target: ${s.targetScore.toLocaleString()} | +${s.netVFGain.toFixed(3)} VF -> Running: ${s.cumulativeProfileVF.toFixed(3)}\n`;
      txt += `    Kamaitachi: ${chartUrl}\n`;
      txt += `    Note: ${s.rationale}\n\n`;
    }

    return txt;
  };

  const content = format === 'markdown' ? generateMarkdown() : generatePlainText();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sdvx_plan_${username}_${targetVF.toFixed(3)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f1422] border border-[#22304d] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-[#1f293d] bg-[#121826]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sdvx-cyan" />
            <h3 className="font-bold text-white text-sm">Export Arcade Session Plan</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Bar */}
        <div className="p-3 sm:p-4 border-b border-[#1f293d] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex bg-[#141b2d] p-1 rounded-lg border border-[#22304d] w-full sm:w-auto justify-center">
            <button
              onClick={() => setFormat('markdown')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded font-medium text-center transition-all ${
                format === 'markdown'
                  ? 'bg-sdvx-cyan text-gray-950 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Markdown (.md)
            </button>
            <button
              onClick={() => setFormat('text')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded font-medium text-center transition-all ${
                format === 'text'
                  ? 'bg-sdvx-cyan text-gray-950 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Mobile / Discord Text
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end sm:justify-start w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg bg-[#141b2d] border border-[#22304d] text-gray-200 hover:text-white hover:border-gray-500 font-medium flex items-center gap-1.5 transition-all text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg bg-sdvx-accent hover:bg-pink-600 text-white font-medium flex items-center gap-1.5 transition-all text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 font-mono text-xs text-gray-300 bg-[#0a0d14]">
          <pre className="whitespace-pre-wrap">{content}</pre>
        </div>
      </div>
    </div>
  );
};
