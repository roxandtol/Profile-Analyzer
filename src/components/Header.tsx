import React, { useState } from 'react';
import { Search, Settings, Zap, Database, Key, Monitor, Gamepad2 } from 'lucide-react';
import { TachiServer } from '../api/tachiClient';
import { VolforceVersion } from '../core/types';

interface HeaderProps {
  username: string;
  server: TachiServer;
  version: VolforceVersion;
  apiKey?: string;
  loading: boolean;
  konasteOnly: boolean;
  onSearch: (user: string) => void;
  onServerChange: (server: TachiServer) => void;
  onVersionChange: (version: VolforceVersion) => void;
  onKonasteToggle: (konasteOnly: boolean) => void;
  onApiKeySave: (key: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  username,
  server,
  version,
  apiKey,
  loading,
  konasteOnly,
  onSearch,
  onServerChange,
  onVersionChange,
  onKonasteToggle,
  onApiKeySave,
}) => {
  const [inputUser, setInputUser] = useState(username);
  const [showSettings, setShowSettings] = useState(false);
  const [inputKey, setInputKey] = useState(apiKey || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUser.trim()) {
      onSearch(inputUser.trim());
    }
  };

  const handleKeySave = () => {
    onApiKeySave(inputKey.trim());
    setShowSettings(false);
  };

  return (
    <header className="border-b border-[#1c2438] bg-[#0c101a]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sdvx-accent to-sdvx-cyan flex items-center justify-center shadow-lg shadow-sdvx-accent/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sdvx-accent via-pink-400 to-sdvx-cyan">
                VOLFORCE ROUTE
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sdvx-card border border-sdvx-border text-gray-400">
                SDVX
              </span>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">Kamaitachi Profile Analyzer & Plan Generator</p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="flex-1 max-w-md relative">
          <input
            type="text"
            value={inputUser}
            onChange={(e) => setInputUser(e.target.value)}
            placeholder="Enter Kamaitachi username or ID..."
            className="w-full bg-[#121826] border border-[#202b40] rounded-lg pl-10 pr-24 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-sdvx-cyan focus:ring-1 focus:ring-sdvx-cyan transition-colors"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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

        {/* Controls */}
        <div className="flex items-center gap-2">
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

          {/* Settings / API Key Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition-colors relative ${
              apiKey
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-[#202b40] bg-[#121826] text-gray-400 hover:text-white'
            }`}
            title="Settings & API Key"
          >
            <Settings className="w-4 h-4" />
            {apiKey && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1" />
            )}
          </button>
        </div>
      </div>

      {/* Settings Modal Drawer */}
      {showSettings && (
        <div className="border-t border-[#1c2438] bg-[#0f1422] p-4 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-sdvx-cyan" />
              <span className="font-semibold text-gray-300">Server:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onServerChange('kamai')}
                  className={`px-3 py-1 rounded border text-xs ${
                    server === 'kamai'
                      ? 'border-sdvx-cyan bg-sdvx-cyan/10 text-sdvx-cyan font-bold'
                      : 'border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  Kamaitachi (Official)
                </button>
                <button
                  onClick={() => onServerChange('boku')}
                  className={`px-3 py-1 rounded border text-xs ${
                    server === 'boku'
                      ? 'border-sdvx-cyan bg-sdvx-cyan/10 text-sdvx-cyan font-bold'
                      : 'border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  Bokutachi
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Key className="w-4 h-4 text-sdvx-accent" />
              <input
                type="password"
                placeholder="Optional API Token (for private profiles)"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="flex-1 bg-[#151c2e] border border-gray-700 rounded px-3 py-1 text-gray-200 text-xs focus:outline-none focus:border-sdvx-accent"
              />
              <button
                onClick={handleKeySave}
                className="px-3 py-1 bg-sdvx-accent text-white rounded font-medium hover:bg-pink-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
