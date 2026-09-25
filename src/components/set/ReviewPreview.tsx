import { useEffect, useMemo, useRef, useState } from 'react';
import { Brain } from 'lucide-react';
import CardImage from '@/components/study/CardImage';
import { fitTextClass } from '@/lib/fitText';
import { generateTestSession } from '@/lib/quiz';
import type { Question, VocabCard } from '@/types/vocab';

interface ReviewPreviewProps {
  cards: VocabCard[];
  onStudy: () => void;
}

const PREVIEW_COUNT = 7;

type QcmQuestion = Extract<Question, { type: 'qcm' }>;

// Aperçu « Questions de révision » : 7 questions à choix multiple tirées du set.
// Aucune donnée n'est enregistrée ici (la progression se fait dans le mode Apprendre).
export default function ReviewPreview({ cards, onStudy }: ReviewPreviewProps) {
  const questions = useMemo(
    () =>
      generateTestSession(cards, Math.min(PREVIEW_COUNT, cards.length), new Set(['qcm'])).filter(
        (q): q is QcmQuestion => q.type === 'qcm',
      ),
    [cards],
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | 'unknown' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (questions.length === 0) return null;

  const done = index >= questions.length;
  const question = questions[Math.min(index, questions.length - 1)];
  const askedText = question.direction === 'term-to-def' ? question.card.term : question.card.definition;

  const answer = (choice: number | 'unknown') => {
    if (picked !== null) return;
    setPicked(choice);
    timer.current = setTimeout(() => {
      setPicked(null);
      setIndex((i) => i + 1);
    }, 1100);
  };

  return (
    <section aria-labelledby="review-title">
      <h2 id="review-title" className="text-xl font-bold">Questions de révision pour cette liste</h2>
      <div className="mt-3 rounded-3xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-base font-semibold">
            <Brain className="h-5 w-5 text-violet-400" />
            Apprendre
          </span>
          <span className="whitespace-nowrap text-sm font-medium tabular-nums text-muted-foreground">
            {Math.min(index + 1, questions.length)} / {questions.length}
          </span>
        </div>
        <button type="button" onClick={onStudy} className="mt-1 min-h-11 text-left text-sm font-semibold text-primary">
          Étudier en mode Apprendre
        </button>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
            <p className="text-lg font-semibold">Bravo, aperçu terminé !</p>
            <button type="button" onClick={onStudy} className="bg-brand-gradient h-12 rounded-full px-6 text-base font-semibold text-primary-foreground">
              Étudier en mode Apprendre
            </button>
            <button type="button" onClick={() => setIndex(0)} className="min-h-11 text-sm font-medium text-muted-foreground">
              Recommencer l'aperçu
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3 flex min-h-32 items-center gap-3 px-1 py-3">
              <p className={`min-w-0 flex-1 break-words font-medium leading-snug ${fitTextClass(askedText)}`}>{askedText}</p>
              {question.direction === 'term-to-def' && (
                <CardImage src={question.card.image_url} className="max-h-28 w-[34%] shrink-0 rounded-md object-cover" />
              )}
            </div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Choisissez la bonne réponse</p>
            <div className="space-y-2">
              {question.choices.map((choice, i) => {
                const isCorrect = i === question.correctIndex;
                const revealed = picked !== null;
                return (
                  <button
                    key={`${index}-${i}`}
                    type="button"
                    disabled={revealed}
                    onClick={() => answer(i)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-base leading-snug transition-colors ${
                      revealed && isCorrect
                        ? 'border-success bg-success/10'
                        : revealed && picked === i
                          ? 'anim-shake border-destructive bg-destructive/10'
                          : 'hover:border-primary/50'
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 break-words">{choice}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex justify-center">
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => answer('unknown')}
                className="min-h-11 px-4 text-sm font-medium text-primary disabled:opacity-40"
              >
                Vous ne savez pas ?
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
