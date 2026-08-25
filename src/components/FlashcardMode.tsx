import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Shuffle, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shuffle } from '@/lib/quiz';
import type { VocabCard } from '@/types/vocab';

interface FlashcardModeProps {
  cards: VocabCard[];
  onBack: () => void;
}

export default function FlashcardMode({ cards, onBack }: FlashcardModeProps) {
  const [order, setOrder] = useState<VocabCard[]>(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(new Set());

  const current = order[index];
  const progressPct = useMemo(() => ((index + 1) / order.length) * 100, [index, order.length]);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);

  if (!current) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Ce set ne contient aucune carte.</p>
        <Button variant="outline" onClick={onBack}>Retour</Button>
      </div>
    );
  }

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(order.length - 1, next)));
    setFlipped(false);
  };

  const toggleStar = () => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
  };

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
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="h-4 w-4" />
          Fermer
        </Button>
        <span className="text-sm text-muted-foreground">{index + 1} / {order.length}</span>
        <Button variant="ghost" size="sm" onClick={handleShuffle}>
          <Shuffle className="h-4 w-4" />
          Mélanger
        </Button>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <button
        type="button"
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="perspective-1000 flex min-h-72 w-full cursor-pointer select-none items-center justify-center rounded-2xl border bg-card p-8 text-center shadow-sm"
      >
        <div className="flex flex-col items-center gap-4">
          {current.image_url && (
            <img
              src={current.image_url}
              alt=""
              className="max-h-40 rounded-lg object-contain"
            />
          )}
          <p className="text-2xl font-semibold">
            {flipped ? current.definition : current.term}
          </p>
          <p className="text-xs text-muted-foreground">
            {flipped ? 'Définition' : 'Terme'} · toucher pour retourner · balayer pour naviguer
          </p>
        </div>
      </button>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Button
          variant={starred.has(current.id) ? 'default' : 'outline'}
          size="icon"
          onClick={toggleStar}
        >
          <Star className="h-4 w-4" fill={starred.has(current.id) ? 'currentColor' : 'none'} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => goTo(index + 1)}
          disabled={index === order.length - 1}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {starred.size > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {starred.size} carte{starred.size !== 1 ? 's' : ''} marquée{starred.size !== 1 ? 's' : ''} à revoir
        </p>
      )}
    </div>
  );
}
