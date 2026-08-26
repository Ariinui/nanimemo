import { useMemo, useState } from 'react';
import { Check, RotateCcw, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateTestSession, isAnswerCorrect } from '@/lib/quiz';
import type { VocabCard, Question, QuestionType } from '@/types/vocab';

interface TestModeProps {
  cards: VocabCard[];
  onBack: () => void;
}

const TYPE_LABELS: { type: QuestionType; label: string }[] = [
  { type: 'qcm', label: 'Choix multiple' },
  { type: 'truefalse', label: 'Vrai ou faux' },
  { type: 'written', label: 'Réponses écrites' },
];

type Answered = { correct: boolean; given: string };

export default function TestMode({ cards, onBack }: TestModeProps) {
  const [step, setStep] = useState<'config' | 'active' | 'result'>('config');
  const [questionCount, setQuestionCount] = useState(Math.min(20, cards.length));
  const [allowedTypes, setAllowedTypes] = useState<Set<QuestionType>>(new Set(['qcm']));
  const [session, setSession] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, Answered>>({});
  const [writtenDrafts, setWrittenDrafts] = useState<Record<number, string>>({});

  const score = useMemo(
    () => Object.values(answers).filter((a) => a.correct).length,
    [answers]
  );

  if (cards.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Ce set ne contient aucune carte.</p>
        <Button variant="outline" onClick={onBack}>Retour</Button>
      </div>
    );
  }

  const toggleType = (type: QuestionType) => {
    setAllowedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) return next; // au moins un type actif
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const startTest = () => {
    setSession(generateTestSession(cards, questionCount, allowedTypes));
    setAnswers({});
    setWrittenDrafts({});
    setStep('active');
  };

  const restart = () => setStep('config');

  const submitAnswer = (index: number, raw: string | boolean) => {
    if (answers[index]) return;
    const question = session[index];
    const correct = isAnswerCorrect(question, raw);
    setAnswers((prev) => ({ ...prev, [index]: { correct, given: String(raw) } }));
  };

  if (step === 'config') {
    const maxQuestions = cards.length;
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <X className="h-4 w-4" />
            Fermer
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{cards.length} carte{cards.length !== 1 ? 's' : ''}</p>
              <h2 className="text-lg font-bold">Configurez votre test</h2>
            </div>
          </div>

          <div className="mb-5 flex items-center justify-between">
            <label htmlFor="qcount" className="text-sm font-medium">
              Questions <span className="text-muted-foreground">(max. {maxQuestions})</span>
            </label>
            <Input
              id="qcount"
              type="number"
              min={1}
              max={maxQuestions}
              value={questionCount}
              onChange={(e) => {
                const v = Number(e.target.value);
                setQuestionCount(Math.max(1, Math.min(maxQuestions, Number.isNaN(v) ? 1 : v)));
              }}
              className="w-20 text-center"
            />
          </div>

          <div className="space-y-1 border-t pt-4">
            {TYPE_LABELS.map(({ type, label }) => {
              const active = allowedTypes.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-3 text-left text-sm font-medium transition-colors hover:bg-accent"
                >
                  {label}
                  <span
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      active ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        active ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <Button className="mt-6 w-full" onClick={startTest}>
            Commencer le test
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'result') {
    const pct = Math.round((score / session.length) * 100);
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{pct}%</h2>
          <p className="mt-1 text-muted-foreground">{score} / {session.length} bonnes réponses</p>
        </div>

        <div className="space-y-2">
          {session.map((q, i) =>
            answers[i] && !answers[i].correct ? (
              <div key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium">{q.direction === 'term-to-def' ? q.card.term : q.card.definition}</p>
                <p className="text-muted-foreground">
                  Attendu : {q.direction === 'term-to-def' ? q.card.definition : q.card.term}
                </p>
              </div>
            ) : null
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>Retour au set</Button>
          <Button className="flex-1" onClick={restart}>
            <RotateCcw className="h-4 w-4" />
            Refaire le test
          </Button>
        </div>
      </div>
    );
  }

  const allAnswered = session.length > 0 && Object.keys(answers).length === session.length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="h-4 w-4" />
          Quitter
        </Button>
        <span className="text-sm font-semibold">
          <span className="text-primary">{score}</span>
          <span className="text-muted-foreground"> / {session.length}</span>
        </span>
      </div>

      <div className="space-y-4">
        {session.map((question, i) => {
          const answered = answers[i];
          return (
            <div key={i} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {question.direction === 'term-to-def' ? 'Terme' : 'Définition'}
                </span>
                <span className="text-xs text-muted-foreground">{i + 1} sur {session.length}</span>
              </div>
              <p className="mb-4 text-lg font-semibold">
                {question.direction === 'term-to-def' ? question.card.term : question.card.definition}
              </p>

              {question.type === 'qcm' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.choices.map((choice, ci) => {
                    const isCorrectChoice = ci === question.correctIndex;
                    const isGiven = answered?.given === String(ci);
                    return (
                      <button
                        key={ci}
                        type="button"
                        disabled={!!answered}
                        onClick={() => submitAnswer(i, String(ci))}
                        className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                          answered && isCorrectChoice
                            ? 'border-success bg-success/10'
                            : answered && isGiven && !isCorrectChoice
                              ? 'border-destructive bg-destructive/10'
                              : 'hover:border-primary/50 hover:bg-accent'
                        }`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              )}

              {question.type === 'truefalse' && (
                <div className="space-y-2">
                  <p className="rounded-lg border bg-muted/40 p-3 text-sm">{question.shownAnswer}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!!answered}
                      onClick={() => submitAnswer(i, true)}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                        answered && question.isCorrect ? 'border-success bg-success/10' : 'hover:bg-accent'
                      }`}
                    >
                      Vrai
                    </button>
                    <button
                      type="button"
                      disabled={!!answered}
                      onClick={() => submitAnswer(i, false)}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                        answered && !question.isCorrect ? 'border-success bg-success/10' : 'hover:bg-accent'
                      }`}
                    >
                      Faux
                    </button>
                  </div>
                </div>
              )}

              {question.type === 'written' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitAnswer(i, writtenDrafts[i] ?? '');
                  }}
                  className="space-y-2"
                >
                  <Input
                    value={writtenDrafts[i] ?? ''}
                    onChange={(e) => setWrittenDrafts((prev) => ({ ...prev, [i]: e.target.value }))}
                    disabled={!!answered}
                    placeholder={question.direction === 'term-to-def' ? 'Écris la définition...' : 'Écris le terme...'}
                  />
                  {!answered && (
                    <Button type="submit" size="sm" disabled={!(writtenDrafts[i] ?? '').trim()}>
                      <Check className="h-4 w-4" />
                      Valider
                    </Button>
                  )}
                </form>
              )}

              {answered && !answered.correct && question.type !== 'qcm' && question.type !== 'truefalse' && (
                <p className="mt-2 text-sm text-destructive">
                  Réponse attendue : {question.direction === 'term-to-def' ? question.card.definition : question.card.term}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button className="mt-2" disabled={!allAnswered} onClick={() => setStep('result')}>
        Terminer le test
      </Button>
    </div>
  );
}
