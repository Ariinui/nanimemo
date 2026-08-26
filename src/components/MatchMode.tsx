import { useEffect, useRef, useState } from 'react';
import { PartyPopper, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shuffle } from '@/lib/quiz';
import type { VocabCard } from '@/types/vocab';

interface MatchModeProps {
  cards: VocabCard[];
  onBack: () => void;
}

interface Tile {
  key: string;
  cardId: string;
  text: string;
}

const PAIR_COUNT = 6;

function buildTiles(cards: VocabCard[]): Tile[] {
  const subset = shuffle(cards).slice(0, Math.min(PAIR_COUNT, cards.length));
  const tiles: Tile[] = [];
  subset.forEach((card) => {
    tiles.push({ key: `${card.id}-term`, cardId: card.id, text: card.term });
    tiles.push({ key: `${card.id}-def`, cardId: card.id, text: card.definition });
  });
  return shuffle(tiles);
}

function bestTimeKey(setId: string) {
  return `nanimemo_match_best_${setId}`;
}

export default function MatchMode({ cards, onBack }: MatchModeProps) {
  const [tiles, setTiles] = useState<Tile[]>(() => buildTiles(cards));
  const [selected, setSelected] = useState<string | null>(null);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [shaking, setShaking] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setId = cards[0]?.set_id ?? '';
  const pairTotal = tiles.length / 2;

  useEffect(() => {
    if (!setId) return;
    try {
      const stored = localStorage.getItem(bestTimeKey(setId));
      if (stored) setBestTime(parseFloat(stored));
    } catch {
      // localStorage indisponible (navigation privée) — pas grave, juste pas de record
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed((t) => t + 0.1), 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const restart = () => {
    setTiles(buildTiles(cards));
    setSelected(null);
    setSolved(new Set());
    setShaking(new Set());
    setElapsed(0);
    setFinished(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setElapsed((t) => t + 0.1), 100);
  };

  const handleTileClick = (tile: Tile) => {
    if (solved.has(tile.key) || shaking.size > 0) return;

    if (!selected) {
      setSelected(tile.key);
      return;
    }
    if (selected === tile.key) {
      setSelected(null);
      return;
    }

    const first = tiles.find((t) => t.key === selected)!;
    if (first.cardId === tile.cardId) {
      const nextSolved = new Set(solved);
      nextSolved.add(first.key);
      nextSolved.add(tile.key);
      setSolved(nextSolved);
      setSelected(null);
      if (nextSolved.size === tiles.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setFinished(true);
        const newBest = bestTime === null || elapsed < bestTime;
        setIsNewBest(newBest);
        if (newBest && setId) {
          setBestTime(elapsed);
          try {
            localStorage.setItem(bestTimeKey(setId), String(elapsed));
          } catch {
            // pas grave si indisponible
          }
        }
      }
    } else {
      setShaking(new Set([first.key, tile.key]));
      setTimeout(() => setShaking(new Set()), 400);
      setSelected(null);
    }
  };

  if (cards.length < 2) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Il faut au moins 2 cartes pour jouer à Associer.</p>
        <Button variant="outline" onClick={onBack}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="h-4 w-4" />
          Fermer
        </Button>
        <span className="text-sm font-semibold tabular-nums text-primary">{elapsed.toFixed(1)}s</span>
      </div>

      {finished ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-10 text-center shadow-sm">
          <PartyPopper className="h-10 w-10 text-primary" />
          <p className="text-xl font-bold">
            {isNewBest ? 'Nouveau record !' : 'Terminé !'}
          </p>
          <p className="text-sm text-muted-foreground">
            Votre {isNewBest ? '' : 'meilleur '}temps : {(isNewBest ? elapsed : (bestTime ?? elapsed)).toFixed(1)} secondes
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>Retour au set</Button>
            <Button onClick={restart}>
              <RotateCcw className="h-4 w-4" />
              Rejouer
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((tile) => {
            const isSolved = solved.has(tile.key);
            const isSelected = selected === tile.key;
            const isShaking = shaking.has(tile.key);
            return (
              <button
                key={tile.key}
                type="button"
                disabled={isSolved}
                onClick={() => handleTileClick(tile)}
                className={`flex min-h-20 items-center justify-center rounded-xl border p-3 text-center text-sm font-semibold transition-all duration-300 select-none ${
                  isSolved
                    ? 'pointer-events-none border-transparent opacity-0'
                    : isSelected
                      ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-accent'
                } ${isShaking ? 'animate-[shake_0.4s_ease] border-destructive' : ''}`}
              >
                {tile.text}
              </button>
            );
          })}
        </div>
      )}

      {!finished && (
        <p className="text-center text-xs text-muted-foreground">
          {solved.size / 2} / {pairTotal} paires trouvées
        </p>
      )}
    </div>
  );
}
