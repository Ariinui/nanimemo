import { useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import CardImage from '@/components/study/CardImage';
import { fitTextClass } from '@/lib/fitText';
import type { VocabCard } from '@/types/vocab';

interface PreviewCarouselProps {
  cards: VocabCard[];
  onOpenCards: () => void;
}

const VISIBLE_DOTS = 5;

export default function PreviewCarousel({ cards, onOpenCards }: PreviewCarouselProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  const handleScroll = () => {
    const el = scroller.current;
    if (!el || !el.firstElementChild) return;
    const slide = el.firstElementChild as HTMLElement;
    const step = slide.offsetWidth + 12; // largeur + gap-3
    setActive(Math.max(0, Math.min(cards.length - 1, Math.round(el.scrollLeft / step))));
  };

  const toggle = (id: string) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const dots = Math.min(VISIBLE_DOTS, cards.length);
  const start = Math.max(0, Math.min(active - Math.floor(dots / 2), cards.length - dots));

  return (
    <div>
      <div
        ref={scroller}
        onScroll={handleScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label="Aperçu des cartes"
      >
        {cards.map((card, i) => {
          const isFlipped = flipped.has(card.id);
          const text = isFlipped ? card.definition : card.term;
          return (
            <div key={card.id} className="relative h-48 shrink-0 basis-[88%] snap-center">
              <button
                type="button"
                onClick={() => toggle(card.id)}
                aria-label={`Carte ${i + 1} sur ${cards.length} : ${isFlipped ? 'définition' : 'terme'}, toucher pour retourner`}
                className="flex h-full w-full items-center gap-3 rounded-3xl border bg-card px-6 py-5 text-left transition-colors active:bg-secondary"
              >
                <span className={`min-w-0 flex-1 break-words font-medium leading-snug ${fitTextClass(text)}`}>{text}</span>
                {!isFlipped && card.image_url && (
                  <CardImage src={card.image_url} className="max-h-28 w-[38%] shrink-0 rounded-md object-cover" />
                )}
              </button>
              <button
                type="button"
                onClick={onOpenCards}
                aria-label="Ouvrir en plein écran (mode Cartes)"
                className="absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <Maximize2 className="h-5 w-5" />
              </button>
            </div>
          );
        })}
      </div>

      {cards.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2" aria-hidden="true">
          {Array.from({ length: dots }, (_, k) => {
            const idx = start + k;
            const isActive = idx === active;
            const isEdge = (k === 0 && start > 0) || (k === dots - 1 && start + dots < cards.length);
            return (
              <span
                key={idx}
                className={`rounded-full transition-all ${
                  isActive ? 'h-2.5 w-2.5 bg-foreground' : isEdge ? 'h-1.5 w-1.5 bg-muted-foreground/60' : 'h-2 w-2 bg-muted-foreground/60'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
