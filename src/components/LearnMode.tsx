import { useEffect, useMemo, useState } from 'react';
import { Check, X, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateQuestion, isAnswerCorrect, shuffle } from '@/lib/quiz';
import { fetchProgress, upsertProgress } from '@/lib/vocabApi';
import type { VocabCard, VocabProgress, MasteryBox, Question } from '@/types/vocab';

interface LearnModeProps {
  cards: VocabCard[];
  userId: string;
  onBack: () => void;
}

const MASTERED_BOX: MasteryBox = 5;

export default function LearnMode({ cards, userId, onBack }: LearnModeProps) {
  const [progressMap, setProgressMap] = useState<Map<string, VocabProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<VocabCard[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  useEffect(() => {
    let cancelled = false;
    fetchProgress(userId, cards.map((c) => c.id)).then((map) => {
      if (cancelled) return;
      setProgressMap(map);
      setQueue(shuffle(cards));
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (queue.length === 0) return;
    const box = progressMap.get(queue[0].id)?.box ?? 1;
    setQuestion(generateQuestion(cards, queue[0], { preferWritten: box >= 3 }));
    setWrittenAnswer('');
    setFeedback(null);
    setSelectedChoice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  const remaining = queue.length;
  const totalCards = cards.length;
  const progressPct = useMemo(() => {
    const masteredNow = totalCards - remaining;
    return totalCards === 0 ? 0 : (masteredNow / totalCards) * 100;
  }, [remaining, totalCards]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (queue.length === 0 || !question) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold">Session terminée</h2>
        <p className="text-muted-foreground">
          {stats.correct} bonne{stats.correct !== 1 ? 's' : ''} réponse{stats.correct !== 1 ? 's' : ''}
          {stats.wrong > 0 && ` · ${stats.wrong} à revoir`}
        </p>
        <Button onClick={onBack}>Retour au set</Button>
      </div>
    );
  }

  const currentCard = queue[0];

  const commitAnswer = async (correct: boolean) => {
    setStats((s) => (correct ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 }));

    const prev = progressMap.get(currentCard.id);
    const nextBox: MasteryBox = correct
      ? (Math.min(5, (prev?.box ?? 1) + 1) as MasteryBox)
      : 1;
    const nextProgress = {
      box: nextBox,
      correct_count: (prev?.correct_count ?? 0) + (correct ? 1 : 0),
      wrong_count: (prev?.wrong_count ?? 0) + (correct ? 0 : 1),
    };
    void upsertProgress(userId, currentCard.id, nextProgress);
    setProgressMap((map) => {
      const next = new Map(map);
      next.set(currentCard.id, { ...(prev as VocabProgress), ...nextProgress, id: prev?.id ?? '', user_id: userId, card_id: currentCard.id, last_seen_at: new Date().toISOString() });
      return next;
    });

    setFeedback(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setQueue((q) => {
        const [, ...rest] = q;
        if (correct && nextBox >= MASTERED_BOX) return rest;
        if (correct) return rest.length === 0 ? [currentCard] : [...rest, currentCard];
        // wrong answer: réinsérer un peu plus loin pour la revoir bientôt
        const reinsertAt = Math.min(rest.length, 2);
        return [...rest.slice(0, reinsertAt), currentCard, ...rest.slice(reinsertAt)];
      });
    }, 700);
  };

  const handleQcmAnswer = (choiceIndex: number) => {
    if (feedback || question.type !== 'qcm') return;
    setSelectedChoice(choiceIndex);
    void commitAnswer(isAnswerCorrect(question, String(choiceIndex)));
  };

  const handleTrueFalse = (answer: boolean) => {
    if (feedback || question.type !== 'truefalse') return;
    void commitAnswer(isAnswerCorrect(question, answer));
  };

  const handleWrittenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback || question.type !== 'written') return;
    void commitAnswer(isAnswerCorrect(question, writtenAnswer));
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="h-4 w-4" />
          Fermer
        </Button>
        <span className="text-sm text-muted-foreground">{totalCards - remaining} / {totalCards}</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Terme</p>
        <p className="text-2xl font-semibold">{currentCard.term}</p>
      </div>

      {question.type === 'qcm' && (
        <div className="grid gap-2">
          {question.choices.map((choice, i) => {
            const isCorrectChoice = i === question.correctIndex;
            const isSelected = selectedChoice === i;
            const showState = feedback !== null;
            return (
              <Button
                key={i}
                variant="outline"
                className={`h-auto justify-start whitespace-normal py-3 text-left ${
                  showState && isCorrectChoice ? 'border-success bg-success/10' : ''
                } ${showState && isSelected && !isCorrectChoice ? 'border-destructive bg-destructive/10' : ''}`}
                onClick={() => handleQcmAnswer(i)}
                disabled={feedback !== null}
              >
                {choice}
              </Button>
            );
          })}
        </div>
      )}

      {question.type === 'truefalse' && (
        <div className="space-y-3">
          <p className="rounded-xl border bg-muted/40 p-4 text-center">{question.shownDefinition}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className={feedback && question.isCorrect ? 'border-success bg-success/10' : ''}
              onClick={() => handleTrueFalse(true)}
              disabled={feedback !== null}
            >
              Vrai
            </Button>
            <Button
              variant="outline"
              className={feedback && !question.isCorrect ? 'border-success bg-success/10' : ''}
              onClick={() => handleTrueFalse(false)}
              disabled={feedback !== null}
            >
              Faux
            </Button>
          </div>
        </div>
      )}

      {question.type === 'written' && (
        <form onSubmit={handleWrittenSubmit} className="space-y-3">
          <Input
            autoFocus
            value={writtenAnswer}
            onChange={(e) => setWrittenAnswer(e.target.value)}
            placeholder="Écris la définition..."
            disabled={feedback !== null}
          />
          {feedback === 'wrong' && (
            <p className="text-sm text-destructive">Réponse attendue : {question.card.definition}</p>
          )}
          <Button type="submit" className="w-full" disabled={feedback !== null || !writtenAnswer.trim()}>
            Valider
          </Button>
        </form>
      )}

      {feedback && (
        <div className={`flex items-center justify-center gap-2 text-sm font-medium ${feedback === 'correct' ? 'text-success' : 'text-destructive'}`}>
          {feedback === 'correct' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {feedback === 'correct' ? 'Correct !' : 'Pas tout à fait'}
        </div>
      )}
    </div>
  );
}
