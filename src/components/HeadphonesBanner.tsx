import React, { useState } from 'react';
import { Headphones, X } from 'lucide-react';

export const HeadphonesBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-zinc-900/90 border-b border-zinc-800 px-3 py-1 flex items-center justify-between text-[11px] text-zinc-300 select-none flex-shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <Headphones className="w-3.5 h-3.5 text-studio-cyan flex-shrink-0" />
        <span className="truncate">
          <strong className="text-zinc-100">Studio Tip:</strong> Wear headphones for 100% clean vocals without speaker bleed.
        </span>
      </div>
      <button
        onClick={() => setIsDismissed(true)}
        className="p-1 text-zinc-500 hover:text-zinc-200 ml-2 flex-shrink-0"
        title="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

