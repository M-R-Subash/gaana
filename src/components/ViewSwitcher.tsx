import React from 'react';
import { useStudio } from '../context/StudioContext';
import { Layers, FileText, Sliders } from 'lucide-react';
import { ActiveTab } from '../types/studio';

export const ViewSwitcher: React.FC = () => {
  const { activeTab, setActiveTab, project } = useStudio();

  const vocalTracksCount = project.tracks.filter((t) => t.type === 'vocal').length;

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'timeline',
      label: 'Timeline',
      icon: <Layers className="w-4 h-4" />,
      badge: vocalTracksCount > 0 ? vocalTracksCount : undefined,
    },
    {
      id: 'lyrics',
      label: 'Lyrics',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'mixer',
      label: 'Mixer',
      icon: <Sliders className="w-4 h-4" />,
      badge: project.tracks.length > 0 ? project.tracks.length : undefined,
    },
  ];

  return (
    <div className="bg-studio-surface border-b border-studio-border px-3 py-1.5 flex items-center justify-center select-none flex-shrink-0">
      <div className="flex bg-studio-bg p-1 rounded-xl border border-studio-border w-full max-w-md">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all relative touch-press ${
                isActive
                  ? 'bg-studio-card text-white shadow-sm border border-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className={isActive ? 'text-studio-cyan' : 'text-zinc-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>

              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-studio-cyan/20 text-studio-cyan border border-studio-cyan/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

