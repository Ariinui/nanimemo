import { useEffect, useMemo, useState } from 'react';
import { Check, X, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatsBar from '@/components/study/StatsBar';
import StudyTopBar from '@/components/study/StudyTopBar';
import { fitTextClass } from '@/lib/fitText';
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

// Un choix long est réduit pour tenir sans faire défiler l'écran (le texte reste lisible : ≥ 12 px).
function choiceTextClass(text: string): string {
  const len = text.length;
  if (len > 90) return 'text-[0.8rem] max-[399px]:text-[0.75rem]';
  if (len > 55) return 'text-[0.95rem] max-[399px]:text-[0.85rem]';
  return 'text-lg max-[399px]:text-base';
}

export default function LearnMode({ cards, userId, onBack }: LearnModeProps) {
  const [progressMap, setProgressMap] = useState<Map<string, VocabProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<VocabCard[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [streak, setStreak] = useState(0);

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
    setStreak((n) => (correct ? n + 1 : 0));

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

  const handleDontKnow = () => {
    if (feedback) return;
    void commitAnswer(false);
  };

  const questionText = question.direction === 'term-to-def' ? currentCard.term : currentCard.definition;
  const choiceBase =
    'flex min-h-12 flex-1 items-center gap-3 rounded-2xl border bg-card px-4 py-2 text-left font-semibold leading-snug transition-all active:scale-[0.99] disabled:cursor-default';

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2.5 px-3 pb-3 pt-1">
      <StudyTopBar
        onBack={onBack}
        right={
          <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums text-muted-foreground">
            {totalCards - remaining} / {totalCards}
          </span>
        }
      >
        <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
          <div className="bg-brand-gradient h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </StudyTopBar>

      <div
        key={currentCard.id + stats.correct + stats.wrong}
        className={`anim-pop shadow-glow flex min-h-24 ${question.type === 'written' ? 'flex-[5]' : 'flex-[2]'} flex-col items-center justify-center rounded-3xl border bg-card px-5 py-4 text-center`}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {question.direction === 'term-to-def' ? 'Terme' : 'Définition'}
        </p>
        <p className={`${fitTextClass(questionText)} break-words font-bold leading-snug`}>{questionText}</p>
      </div>

      <div className={`flex ${question.type === 'written' ? 'flex-none' : 'flex-[3]'} flex-col gap-2.5`}>
        {question.type === 'qcm' &&
          question.choices.map((choice, i) => {
            const isCorrectChoice = i === question.correctIndex;
            const isSelected = selectedChoice === i;
            const showState = feedback !== null;
            return (
              <button
                key={i}
                type="button"
                className={`${choiceBase} ${choiceTextClass(choice)} ${
                  showState && isCorrectChoice
                    ? 'border-success bg-success/10'
                    : showState && isSelected
                      ? 'anim-shake border-destructive bg-destructive/10'
                      : 'hover:border-primary/50'
                }`}
                onClick={() => handleQcmAnswer(i)}
                disabled={feedback !== null}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm text-muted-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0 break-words">{choice}</span>
              </button>
            );
          })}

        {question.type === 'truefalse' && (
          <>
            <p className="flex flex-1 items-center justify-center rounded-2xl border bg-secondary/40 p-4 text-center text-xl font-semibold leading-snug">
              {question.shownAnswer}
            </p>
            <div className="grid flex-1 grid-cols-2 gap-3">
              <button
                type="button"
                className={`${choiceBase} justify-center text-xl ${feedback && question.isCorrect ? 'border-success bg-success/10' : 'hover:border-primary/50'}`}
                onClick={() => handleTrueFalse(true)}
                disabled={feedback !== null}
              >
                Vrai
              </button>
              <button
                type="button"
                className={`${choiceBase} justify-center text-xl ${feedback && !question.isCorrect ? 'border-success bg-success/10' : 'hover:border-primary/50'}`}
                onClick={() => handleTrueFalse(false)}
                disabled={feedback !== null}
              >
                Faux
              </button>
            </div>
          </>
        )}

        {question.type === 'written' && (
          <form onSubmit={handleWrittenSubmit} className="flex flex-col gap-3">
            <Input
              autoFocus
              className="h-14 rounded-2xl px-4 text-lg"
              value={writtenAnswer}
              onChange={(e) => setWrittenAnswer(e.target.value)}
              placeholder={question.direction === 'term-to-def' ? 'Écris la définition...' : 'Écris le terme...'}
              disabled={feedback !== null}
            />
            {feedback === 'wrong' && (
              <p className="text-base text-destructive">
                Réponse attendue : {question.direction === 'term-to-def' ? question.card.definition : question.card.term}
              </p>
            )}
            <Button type="submit" className="h-14 w-full text-base" disabled={feedback !== null || !writtenAnswer.trim()}>
              Valider
            </Button>
          </form>
        )}
      </div>

      <div className="flex min-h-11 shrink-0 items-center justify-center">
        {feedback ? (
          <div className={`flex items-center justify-center gap-2 text-base font-semibold ${feedback === 'correct' ? 'text-success' : 'text-destructive'}`}>
            {feedback === 'correct' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            {feedback === 'correct' ? 'Correct !' : 'Pas tout à fait'}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDontKnow}
            className="min-h-11 px-4 text-center text-base font-medium text-primary underline-offset-2 hover:underline"
          >
            Vous ne savez pas ?
          </button>
        )}
      </div>

      <StatsBar good={stats.correct} review={stats.wrong} streak={streak} />
    </div>
  );
}
