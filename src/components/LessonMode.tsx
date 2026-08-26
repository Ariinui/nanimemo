import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VocabSet } from '@/types/vocab';

interface LessonModeProps {
  set: VocabSet;
  onBack: () => void;
}

export default function LessonMode({ set, onBack }: LessonModeProps) {
  const lesson = set.lesson;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="h-4 w-4" />
          Fermer
        </Button>
        <span className="text-sm font-semibold text-muted-foreground">Leçon</span>
      </div>

      {!lesson ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucune leçon pour ce set.
        </div>
      ) : (
        <div className="space-y-6 pb-8">
          <p className="text-sm text-muted-foreground">{lesson.intro}</p>

          <div className="overflow-hidden rounded-2xl border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-3 text-left font-semibold">Catégorie</th>
                  <th className="p-3 text-left font-semibold">Prépositions</th>
                </tr>
              </thead>
              <tbody>
                {lesson.categories.map((cat) => (
                  <tr key={cat.name} className="border-t">
                    <td className="p-3 align-top font-medium">{cat.name}</td>
                    <td className="p-3 align-top text-muted-foreground">
                      {cat.items.join(', ')}
                      {cat.note && <p className="mt-1 text-xs italic">{cat.note}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="mb-2 font-bold">{lesson.story.title}</h3>
            <p className="mb-3 text-sm text-muted-foreground">{lesson.story.intro}</p>
            <p className="rounded-xl border bg-muted/40 p-4 text-sm italic leading-relaxed">"{lesson.story.text}"</p>
            <p className="mt-3 text-sm text-muted-foreground">{lesson.story.outro}</p>
          </div>

          {lesson.tips.map((tip) => (
            <div key={tip.title} className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="mb-2 font-bold">{tip.title}</h3>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{tip.body}</p>
            </div>
          ))}

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <p className="text-sm font-medium">{lesson.warning}</p>
          </div>
        </div>
      )}
    </div>
  );
}
