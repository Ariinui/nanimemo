import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface StudyTopBarProps {
  onBack: () => void;
  backLabel?: string;
  right?: ReactNode;
  children: ReactNode;
}

// Une seule ligne de 44px : fermer + contenu central (progression) + action à droite.
export default function StudyTopBar({ onBack, backLabel = 'Fermer', right, children }: StudyTopBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 rounded-full"
        onClick={onBack}
        aria-label={backLabel}
        title={backLabel}
      >
        <X className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1">{children}</div>
      {right}
    </div>
  );
}
