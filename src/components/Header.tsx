import React, { useState } from 'react';
import { useStudio } from '../context/StudioContext';
import {
  Undo2,
  Redo2,
  Download,
  Music,
  Edit2,
  Check,
  Disc3,
} from 'lucide-react';

interface HeaderProps {
  onOpenSetup: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSetup, onOpenExport }) => {
  const {
    project,
    setProjectName,
    canUndo,
    canRedo,
    undo,
    redo,
    playbackStatus,
  } = useStudio();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);

  const handleTitleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (titleInput.trim()) {
      setProjectName(titleInput.trim());
    } else {
      setTitleInput(project.name);
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-14 bg-studio-surface border-b border-studio-border px-3 sm:px-4 flex items-center justify-between select-none z-30 flex-shrink-0">
      {/* Brand & Studio Status */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-studio-card border border-studio-border text-studio-cyan flex-shrink-0">
          <Disc3
            className={`w-4 h-4 ${
              playbackStatus === 'playing'
                ? 'animate-spin text-studio-cyan'
                : playbackStatus === 'recording'
                ? 'text-studio-red animate-pulse'
                : 'text-zinc-400'
            }`}
          />
        </div>

        {/* Project Name or Editing input */}
        {isEditingTitle ? (
          <form onSubmit={handleTitleSubmit} className="flex items-center gap-1">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={() => handleTitleSubmit()}
              autoFocus
              className="bg-studio-bg border border-studio-cyan text-sm px-2 py-0.5 rounded text-white font-medium focus:outline-none max-w-[150px] sm:max-w-[200px]"
            />
            <button
              type="submit"
              className="p-1 text-studio-cyan hover:text-white"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div
            onClick={() => {
              setTitleInput(project.name);
              setIsEditingTitle(true);
            }}
            className="flex items-center gap-1.5 cursor-pointer group min-w-0"
            title="Click to rename project"
          >
            <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate max-w-[130px] sm:max-w-[200px]">
              {project.name}
            </span>
            <Edit2 className="w-3 h-3 text-zinc-500 opacity-60 group-hover:opacity-100 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* Right Controls: Undo/Redo, Setup, Export */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-2 rounded-lg border border-studio-border transition-colors ${
            canUndo
              ? 'bg-studio-card text-zinc-200 hover:bg-studio-hover active:scale-95'
              : 'bg-studio-surface text-zinc-600 border-zinc-800 cursor-not-allowed opacity-40'
          }`}
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-2 rounded-lg border border-studio-border transition-colors ${
            canRedo
              ? 'bg-studio-card text-zinc-200 hover:bg-studio-hover active:scale-95'
              : 'bg-studio-surface text-zinc-600 border-zinc-800 cursor-not-allowed opacity-40'
          }`}
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Song Setup Button */}
        <button
          onClick={onOpenSetup}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-studio-card border border-studio-border hover:bg-studio-hover active:scale-95 text-zinc-200 text-xs font-medium transition-colors"
          title="Change Instrumental / Lyrics"
        >
          <Music className="w-3.5 h-3.5 text-studio-cyan" />
          <span className="hidden xs:inline">Song</span> Setup
        </button>

        {/* Instant Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-sm transition-colors"
          title="Export final MP3 mix"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};

