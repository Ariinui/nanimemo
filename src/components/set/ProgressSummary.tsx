import { ArrowRight } from 'lucide-react';
import type { CardStatus, ProgressCounts } from '@/lib/setProgress';

interface ProgressSummaryProps {
  counts: ProgressCounts;
  onSelect: (status: CardStatus) => void;
}

const ROWS: { status: CardStatus; label: string; color: string; track: string }[] = [
  { status: 'new', label: 'Pas encore étudiée', color: 'hsl(var(--muted-foreground))', track: 'hsl(var(--muted-foreground) / 0.25)' },
  { status: 'learning', label: "En cours d'apprentissage", color: 'hsl(var(--warning))', track: 'hsl(var(--warning) / 0.25)' },
  { status: 'mastered', label: 'Maîtrisés', color: 'hsl(var(--success))', track: 'hsl(var(--success) / 0.25)' },
];

function Ring({ value, total, color, track }: { value: number; total: number; color: string; track: string }) {
  const r = 24;
  const circumference = 2 * Math.PI * r;
  const fraction = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke={track} strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${fraction * circumference} ${circumference}`}
        />
      </svg>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </span>
  );
}

export default function ProgressSummary({ counts, onSelect }: ProgressSummaryProps) {
  return (
    <section aria-labelledby="progress-title">
      <h2 id="progress-title" className="text-xl font-bold">Votre progression</h2>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        Votre progression est basée sur vos réponses dans les modes Cartes et Apprendre : un terme est maîtrisé
        quand vous l'avez réussi plusieurs fois de suite.
      </p>
      <div className="mt-4 space-y-2.5">
        {ROWS.map(({ status, label, color, track }) => {
          const value = counts[status];
          return (
            <button
              key={status}
              type="button"
              onClick={() => onSelect(status)}
              disabled={value === 0}
              className="flex min-h-[4.5rem] w-full items-center gap-4 rounded-2xl border bg-secondary/70 px-4 py-2.5 text-left transition-colors hover:bg-secondary disabled:cursor-default disabled:hover:bg-secondary/70"
            >
              <Ring value={value} total={counts.total} color={color} track={track} />
              <span className={`flex-1 text-lg font-semibold ${status === 'new' || value === 0 ? 'text-muted-foreground' : ''}`}>
                {label}
              </span>
              {value > 0 && <ArrowRight className="h-5 w-5 shrink-0" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
