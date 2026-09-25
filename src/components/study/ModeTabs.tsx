import { BookOpen, Brain, FileCheck2, Layers, Shuffle } from 'lucide-react';
import type { StudyMode } from '@/types/vocab';

export const MODE_TABS: { mode: StudyMode; label: string; icon: typeof Layers }[] = [
  { mode: 'cards', label: 'Cartes', icon: Layers },
  { mode: 'learn', label: 'Apprendre', icon: Brain },
  { mode: 'match', label: 'Associer', icon: Shuffle },
  { mode: 'test', label: 'Test', icon: FileCheck2 },
  { mode: 'lesson', label: 'Leçon', icon: BookOpen },
];

interface ModeTabsProps {
  active: StudyMode;
  onChange: (mode: StudyMode) => void;
  disabledModes?: StudyMode[];
}

export default function ModeTabs({ active, onChange, disabledModes = [] }: ModeTabsProps) {
  return (
    <div className="mx-auto w-full max-w-2xl shrink-0 px-3 pt-2">
      <div className="flex gap-0.5 rounded-2xl border bg-card p-1">
        {MODE_TABS.map(({ mode, label, icon: Icon }) => {
          const isActive = mode === active;
          return (
            <button
              key={mode}
              type="button"
              disabled={disabledModes.includes(mode)}
              onClick={() => onChange(mode)}
              className={`flex min-h-12 min-w-11 flex-auto flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.75rem] font-semibold tracking-tight transition-all disabled:opacity-40 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm ${
                isActive
                  ? 'bg-brand-gradient text-primary-foreground shadow-md shadow-primary/30'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
