import React, { useState } from 'react';
import { StudioProvider, useStudio } from './context/StudioContext';
import { Header } from './components/Header';
import { ViewSwitcher } from './components/ViewSwitcher';
import { TransportBar } from './components/TransportBar';
import { StudioTimeline } from './components/StudioTimeline';
import { LyricsView } from './components/LyricsView';
import { MixerView } from './components/MixerView';
import { SongSetupModal } from './components/SongSetupModal';
import { ExportModal } from './components/ExportModal';
import { HeadphonesBanner } from './components/HeadphonesBanner';

const StudioMain: React.FC = () => {
  const { activeTab } = useStudio();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-bg text-studio-text">
      {/* Header */}
      <Header
        onOpenSetup={() => setIsSetupOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Headphone Advisory Banner */}
      <HeadphonesBanner />

      {/* Mobile View Switcher Tabs */}
      <ViewSwitcher />

      {/* Primary Workspace View */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'timeline' && (
          <StudioTimeline onOpenSetup={() => setIsSetupOpen(true)} />
        )}
        {activeTab === 'lyrics' && <LyricsView />}
        {activeTab === 'mixer' && <MixerView />}
      </main>

      {/* Bottom Transport Bar */}
      <TransportBar />

      {/* Modals */}
      <SongSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <StudioProvider>
      <StudioMain />
    </StudioProvider>
  );
};

export default App;

