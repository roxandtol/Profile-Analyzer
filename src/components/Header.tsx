import React, { useState } from 'react';
import { Search, Zap, Monitor, Gamepad2 } from 'lucide-react';
import { VolforceVersion } from '../core/types';

interface HeaderProps {
  username: string;
  version: VolforceVersion;
  loading: boolean;
  konasteOnly: boolean;
  onSearch: (user: string) => void;
  onVersionChange: (version: VolforceVersion) => void;
  onKonasteToggle: (konasteOnly: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  username,
  version,
  loading,
  konasteOnly,
  onSearch,
  onVersionChange,
  onKonasteToggle,
}) => {
  const [inputUser, setInputUser] = useState(username);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUser.trim()) {
      onSearch(inputUser.trim());
    }
  };

  return (
    <header className="border-b border-[#1c2438] bg-[#0c101a]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 lg:py-0 lg:h-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 lg:gap-4">
        {/* Brand & Mobile Controls Row */}
        <div className="flex items-center justify-between gap-3 w-full lg:w-auto">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sdvx-accent to-sdvx-cyan flex items-center justify-center shadow-lg shadow-sdvx-accent/20 shrink-0">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold tracking-wider text-sm sm:text-base text-transparent bg-clip-text bg-gradient-to-r from-sdvx-accent via-pink-400 to-sdvx-cyan whitespace-nowrap">
                  VOLFORCE ROUTE
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sdvx-card border border-sdvx-border text-gray-400">
                  SDVX
                </span>
              </div>
              <p className="text-[11px] text-gray-400 hidden xl:block">Kamaitachi Profile Analyzer & Plan Generator</p>
            </div>
          </div>

          {/* Controls on Mobile & Tablet (visible on < lg) */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            {/* Version Toggle */}
            <div className="flex bg-[#121826] p-0.5 rounded-lg border border-[#202b40]">
              <button
                type="button"
                onClick={() => onVersionChange('vf7')}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                  version === 'vf7'
                    ? 'bg-sdvx-cyan text-gray-950 shadow-sm'
                    : 'text-gray-400'
                }`}
              >
                VF7
              </button>
              <button
                type="button"
                onClick={() => onVersionChange('vf6')}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                  version === 'vf6'
                    ? 'bg-sdvx-accent text-white shadow-sm'
                    : 'text-gray-400'
                }`}
              >
                VF6
              </button>
            </div>

            {/* Konaste toggle on mobile */}
            {version === 'vf6' && (
              <button
                type="button"
                onClick={() => onKonasteToggle(!konasteOnly)}
                title={konasteOnly ? 'Konaste PC' : 'Exceed Gear'}
                className={`p-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                  konasteOnly
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-[#121826] border-[#202b40] text-gray-400'
                }`}
              >
                {konasteOnly ? <Monitor className="w-4 h-4 text-purple-400" /> : <Gamepad2 className="w-4 h-4 text-amber-400" />}
              </button>
            )}
          </div>
        </div>

        {/* Search Bar (Full width on mobile/tablet, centered on desktop) */}
        <form onSubmit={handleSubmit} className="w-full lg:flex-1 lg:max-w-md relative min-w-0">
          <input
            type="text"
            value={inputUser}
            onChange={(e) => setInputUser(e.target.value)}
            placeholder="Enter Kamaitachi username or ID..."
            className="w-full bg-[#121826] border border-[#202b40] rounded-lg pl-9 pr-24 py-2 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-sdvx-cyan focus:ring-1 focus:ring-sdvx-cyan transition-colors"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            disabled={loading || !inputUser.trim()}
            className="absolute right-1 top-1 bottom-1 px-3 bg-gradient-to-r from-sdvx-accent to-pink-600 hover:from-pink-600 hover:to-sdvx-accent disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-all"
          >
            {loading ? (
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              'Analyze'
            )}
          </button>
        </form>

        {/* Desktop Controls (hidden on mobile/tablet, visible only on lg:) */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {/* VF6 Konaste vs Arcade Exceed Gear Toggle */}
          {version === 'vf6' && (
            <button
              onClick={() => onKonasteToggle(!konasteOnly)}
              title={
                konasteOnly
                  ? 'Konaste PC Only: filtering to songs playable on Konaste'
                  : 'Arcade Exceed Gear: click to filter to Konaste PC songs'
              }
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                konasteOnly
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm'
                  : 'bg-[#121826] border-[#202b40] text-gray-400 hover:text-white'
              }`}
            >
              {konasteOnly ? <Monitor className="w-3.5 h-3.5 text-purple-400" /> : <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />}
              <span>{konasteOnly ? 'Konaste (PC)' : 'Exceed Gear'}</span>
            </button>
          )}

          {/* Version Toggle */}
          <div className="flex bg-[#121826] p-1 rounded-lg border border-[#202b40]">
            <button
              onClick={() => onVersionChange('vf7')}
              title="VF7: Nabla/Konaste with decimal levelNum & UC buff (106)"
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                version === 'vf7'
                  ? 'bg-sdvx-cyan text-gray-950 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              VF7 (Decimal)
            </button>
            <button
              onClick={() => onVersionChange('vf6')}
              title="VF6: SDVX6 Exceed Gear standard with integer levels"
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                version === 'vf6'
                  ? 'bg-sdvx-accent text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              VF6 (Exceed)
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
