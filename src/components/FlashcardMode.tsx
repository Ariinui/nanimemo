import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Shuffle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatsBar from '@/components/study/StatsBar';
import StudyProgress from '@/components/study/StudyProgress';
import { shuffle } from '@/lib/quiz';
import { fetchProgress, upsertProgress } from '@/lib/vocabApi';
import type { MasteryBox, VocabCard, VocabProgress } from '@/types/vocab';

interface FlashcardModeProps {
  cards: VocabCard[];
  userId: string;
  onBack: () => void;
}

type Rating = 'again' | 'hard' | 'good' | 'easy';

const RATINGS: { rating: Rating; label: string; emoji: string; key: string; className: string }[] = [
  { rating: 'again', label: 'Encore', emoji: '😰', key: '1', className: 'border-destructive/40 hover:border-destructive hover:bg-destructive/10 hover:text-red-300' },
  { rating: 'hard', label: 'Difficile', emoji: '🤔', key: '2', className: 'border-warning/40 hover:border-warning hover:bg-warning/10 hover:text-amber-300' },
  { rating: 'good', label: 'Bien', emoji: '😊', key: '3', className: 'border-success/40 hover:border-success hover:bg-success/10 hover:text-green-300' },
  { rating: 'easy', label: 'Facile', emoji: '🤩', key: '4', className: 'border-info/40 hover:border-info hover:bg-info/10 hover:text-blue-300' },
];

// Effet d'une note sur la boîte Leitner (mêmes boîtes que le mode Apprendre)
function nextBox(box: MasteryBox, rating: Rating): MasteryBox {
  if (rating === 'again') return 1;
  if (rating === 'hard') return box;
  return Math.min(5, box + (rating === 'easy' ? 2 : 1)) as MasteryBox;
}

export default function FlashcardMode({ cards, userId, onBack }: FlashcardModeProps) {
  const [order, setOrder] = useState<VocabCard[]>(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [toReview, setToReview] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);

  const progressRef = useRef<Map<string, VocabProgress>>(new Map());
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);

  const current = order[index];

  useEffect(() => {
    let cancelled = false;
    fetchProgress(userId, cards.map((c) => c.id))
      .then((map) => {
        if (!cancelled) progressRef.current = map;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, cards]);

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(order.length - 1, next)));
    setFlipped(false);
  };

  const rate = (rating: Rating) => {
    if (!current) return;
    const isGood = rating === 'good' || rating === 'easy';
    setKnown((prev) => {
      const next = new Set(prev);
      if (isGood) next.add(current.id);
      else next.delete(current.id);
      return next;
    });
    setToReview((prev) => {
      const next = new Set(prev);
      if (isGood) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
    setStreak((s) => (rating === 'again' ? 0 : s + 1));

    const prev = progressRef.current.get(current.id);
    const patch = {
      box: nextBox(prev?.box ?? 1, rating),
      correct_count: (prev?.correct_count ?? 0) + (isGood ? 1 : 0),
      wrong_count: (prev?.wrong_count ?? 0) + (rating === 'again' ? 1 : 0),
    };
    progressRef.current.set(current.id, {
      ...(prev as VocabProgress),
      ...patch,
      id: prev?.id ?? '',
      user_id: userId,
      card_id: current.id,
      last_seen_at: new Date().toISOString(),
    });
    void upsertProgress(userId, current.id, patch);

    goTo(index + 1);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        goTo(index + 1);
      } else if (e.code === 'ArrowLeft') {
        goTo(index - 1);
      } else {
        const match = RATINGS.find((r) => r.key === e.key);
        if (match) rate(match.rating);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, order.length, current]);

  if (!current) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Ce set ne contient aucune carte.</p>
        <Button variant="outline" onClick={onBack}>Retour</Button>
      </div>
    );
  }

  const handleShuffle = () => {
    setOrder(shuffle(cards));
    setIndex(0);
    setFlipped(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    didSwipe.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      didSwipe.current = true;
      if (dx < 0) goTo(index + 1);
      else goTo(index - 1);
    }
  };

  const handleCardClick = () => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    setFlipped((f) => !f);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="h-11 px-3" onClick={onBack}>
          <X className="h-4 w-4" />
          Fermer
        </Button>
        <Button variant="ghost" className="h-11 px-3" onClick={handleShuffle}>
          <Shuffle className="h-4 w-4" />
          Mélanger
        </Button>
      </div>

      <StudyProgress label={`Carte ${index + 1} / ${order.length}`} current={index + 1} total={order.length} />

      <div className="perspective-1000">
        <button
          type="button"
          onClick={handleCardClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`preserve-3d shadow-glow relative block min-h-64 w-full sm:min-h-72 cursor-pointer select-none rounded-3xl border bg-card text-center transition-transform duration-500 ease-out hover:border-white/20 ${
            flipped ? 'rotate-y-180' : ''
          }`}
        >
          <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl p-8">
            <span className="absolute right-4 top-4 rounded-full border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
              ↻ Toucher pour retourner
            </span>
            {current.image_url && (
              <img src={current.image_url} alt="" className="max-h-40 rounded-lg object-contain" />
            )}
            <p className="text-3xl font-bold leading-snug">{current.term}</p>
            <span className="absolute bottom-4 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              Terme
            </span>
          </div>
          <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl p-8">
            <span className="absolute right-4 top-4 rounded-full border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
              ↻ Toucher pour retourner
            </span>
            <p className="text-2xl font-semibold leading-snug">{current.definition}</p>
            <span className="absolute bottom-4 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              Définition
            </span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {RATINGS.map(({ rating, label, emoji, className }) => (
          <button
            key={rating}
            type="button"
            onClick={() => rate(rating)}
            className={`flex items-center justify-center gap-2 rounded-xl border bg-card px-3 py-3 text-sm font-semibold text-muted-foreground transition-all hover:-translate-y-0.5 ${className}`}
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => goTo(index + 1)}
          disabled={index === order.length - 1}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <StatsBar good={known.size} review={toReview.size} streak={streak} />
    </div>
  );
}
