import React, { useState } from 'react';
import { useStudio } from '../context/StudioContext';
import {
  FileText,
  Edit3,
  Check,
  Upload,
  Sparkles,
  Type,
} from 'lucide-react';
import { DEMO_LYRICS } from '../audio/demoSong';

export const LyricsView: React.FC = () => {
  const { project, setLyrics } = useStudio();
  const [isEditing, setIsEditing] = useState(false);
  const [tempLyrics, setTempLyrics] = useState(project.lyrics);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  const handleSave = () => {
    setLyrics(tempLyrics);
    setIsEditing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setTempLyrics(content);
        setLyrics(content);
        setIsEditing(false);
      }
    };
    reader.readAsText(file);
  };

  const fontSizeClasses = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-loose',
    lg: 'text-lg leading-loose',
    xl: 'text-xl leading-loose',
  };

  return (
    <div className="flex-1 flex flex-col bg-studio-bg overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="h-11 bg-studio-surface border-b border-studio-border px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-studio-cyan" />
          <span className="text-xs font-bold text-zinc-200">
            Karaoke Lyrics Prompter
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Font Size Selector */}
          <div className="flex items-center bg-studio-card border border-studio-border rounded-lg p-0.5">
            <button
              onClick={() => {
                const sizes: ('sm' | 'base' | 'lg' | 'xl')[] = ['sm', 'base', 'lg', 'xl'];
                const idx = sizes.indexOf(fontSize);
                if (idx > 0) setFontSize(sizes[idx - 1]);
              }}
              className="p-1 text-zinc-400 hover:text-white"
              title="Decrease Font Size"
            >
              <Type className="w-3 h-3" />
              <span className="sr-only">A-</span>
            </button>
            <span className="text-[10px] text-zinc-500 font-mono px-1">
              {fontSize.toUpperCase()}
            </span>
            <button
              onClick={() => {
                const sizes: ('sm' | 'base' | 'lg' | 'xl')[] = ['sm', 'base', 'lg', 'xl'];
                const idx = sizes.indexOf(fontSize);
                if (idx < sizes.length - 1) setFontSize(sizes[idx + 1]);
              }}
              className="p-1 text-zinc-400 hover:text-white"
              title="Increase Font Size"
            >
              <Type className="w-4 h-4" />
              <span className="sr-only">A+</span>
            </button>
          </div>

          {/* Edit / Save toggle */}
          {isEditing ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-studio-cyan text-zinc-950 font-bold text-xs shadow-sm active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              Done
            </button>
          ) : (
            <button
              onClick={() => {
                setTempLyrics(project.lyrics);
                setIsEditing(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-studio-card border border-studio-border text-zinc-200 hover:text-white font-medium text-xs active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Main Lyrics Area (Completely Independent Scroll Container) */}
      <div className="flex-1 overflow-y-auto px-4 py-6 overscroll-contain">
        {isEditing ? (
          <div className="max-w-xl mx-auto flex flex-col h-full gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400 font-medium">
                Paste or type song lyrics below:
              </label>

              <div className="flex items-center gap-2">
                {/* Upload .txt */}
                <label className="flex items-center gap-1 text-xs text-studio-cyan cursor-pointer hover:underline">
                  <Upload className="w-3 h-3" />
                  <span>Upload .txt</span>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Sample lyrics */}
                <button
                  type="button"
                  onClick={() => setTempLyrics(DEMO_LYRICS)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Demo Lyrics</span>
                </button>
              </div>
            </div>

            <textarea
              value={tempLyrics}
              onChange={(e) => setTempLyrics(e.target.value)}
              placeholder="Paste your lyrics here..."
              rows={16}
              className="w-full flex-1 p-3 rounded-xl bg-studio-card border border-studio-border text-zinc-100 font-sans text-sm focus:outline-none focus:border-studio-cyan resize-none leading-relaxed"
            />
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            {project.lyrics.trim() ? (
              <div
                className={`whitespace-pre-wrap font-sans text-zinc-200 tracking-wide text-center sm:text-left ${fontSizeClasses[fontSize]}`}
              >
                {project.lyrics}
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-zinc-300 mb-1">
                  No Lyrics Added Yet
                </h3>
                <p className="text-xs text-zinc-500 mb-4">
                  Add song lyrics to view and scroll them easily while singing along.
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-xl bg-studio-card border border-studio-border text-studio-cyan font-semibold text-xs hover:bg-studio-hover active:scale-95"
                >
                  Add Song Lyrics
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

