import { Check, Flame, X } from 'lucide-react';

interface StatsBarProps {
  good: number;
  review: number;
  streak: number;
}

export default function StatsBar({ good, review, streak }: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 rounded-2xl border bg-card px-4 py-3">
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-lg font-bold text-success">
          <Check className="h-4 w-4" />
          {good}
        </div>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bien</p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-lg font-bold text-destructive">
          <X className="h-4 w-4" />
          {review}
        </div>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">À revoir</p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-lg font-bold text-warning">
          <Flame className="h-4 w-4" />
          {streak}
        </div>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Série</p>
      </div>
    </div>
  );
}
