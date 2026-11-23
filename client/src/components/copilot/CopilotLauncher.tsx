import React from 'react';
import { Sparkles } from 'lucide-react';

interface CopilotLauncherProps {
  onClick: () => void;
  isOpen: boolean;
}

export const CopilotLauncher: React.FC<CopilotLauncherProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-ai-600 to-indigo-600 hover:from-ai-500 hover:to-indigo-500 text-white font-heading font-semibold text-xs shadow-xl shadow-ai-900/30 transition-all transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-4 focus:ring-ai-400/30"
      aria-label="Open LabLink Copilot AI Assistant"
    >
      <div className="relative">
        <Sparkles className="w-4 h-4 text-ai-200 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
      </div>
      <span>LabLink Copilot</span>
    </button>
  );
};
