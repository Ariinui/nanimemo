import { useMemo, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateTestSession, isAnswerCorrect } from '@/lib/quiz';
import type { VocabCard, Question } from '@/types/vocab';

interface TestModeProps {
  cards: VocabCard[];
  onBack: () => void;
}

interface AnsweredQuestion {
  question: Question;
  correct: boolean;
  givenAnswer: string;
}

export default function TestMode({ cards, onBack }: TestModeProps) {
  const [session, setSession] = useState<Question[]>(() => generateTestSession(cards, cards.length));
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [writtenAnswer, setWrittenAnswer] = useState('');

  const question = session[index];
  const finished = index >= session.length;
  const score = useMemo(() => answered.filter((a) => a.correct).length, [answered]);

  if (cards.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Ce set ne contient aucune carte.</p>
        <Button variant="outline" onClick={onBack}>Retour</Button>
      </div>
    );
  }

  const submit = (raw: string | boolean) => {
    const correct = isAnswerCorrect(question, raw);
    setAnswered((a) => [...a, { question, correct, givenAnswer: String(raw) }]);
    setWrittenAnswer('');
    setIndex((i) => i + 1);
  };

  const restart = () => {
    setSession(generateTestSession(cards, cards.length));
    setIndex(0);
    setAnswered([]);
  };

  if (finished) {
    const pct = Math.round((score / session.length) * 100);
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{pct}%</h2>
          <p className="mt-1 text-muted-foreground">{score} / {session.length} bonnes réponses</p>
        </div>

        <div className="space-y-2">
          {answered
            .filter((a) => !a.correct)
            .map((a, i) => (
              <div key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium">{a.question.card.term}</p>
                <p className="text-muted-foreground">Attendu : {a.question.card.definition}</p>
              </div>
            ))}
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="h-4 w-4" />
          Quitter le test
        </Button>
        <span className="text-sm text-muted-foreground">Question {index + 1} / {session.length}</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(index / session.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Terme</p>
        <p className="text-2xl font-semibold">{question.card.term}</p>
      </div>

      {question.type === 'qcm' && (
        <div className="grid gap-2">
          {question.choices.map((choice, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-auto justify-start whitespace-normal py-3 text-left"
              onClick={() => submit(String(i))}
            >
              {choice}
            </Button>
          ))}
        </div>
      )}

      {question.type === 'truefalse' && (
        <div className="space-y-3">
          <p className="rounded-xl border bg-muted/40 p-4 text-center">{question.shownDefinition}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => submit(true)}>Vrai</Button>
            <Button variant="outline" onClick={() => submit(false)}>Faux</Button>
          </div>
        </div>
      )}

      {question.type === 'written' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(writtenAnswer);
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            value={writtenAnswer}
            onChange={(e) => setWrittenAnswer(e.target.value)}
            placeholder="Écris la définition..."
          />
          <Button type="submit" className="w-full" disabled={!writtenAnswer.trim()}>
            <Check className="h-4 w-4" />
            Valider
          </Button>
        </form>
      )}
    </div>
  );
}
