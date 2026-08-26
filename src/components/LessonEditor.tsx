import { useState } from 'react';
import { LoaderCircle, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateSetLesson } from '@/lib/vocabApi';
import {
  parseQuickRef,
  parseTable,
  parseTips,
  stringifyQuickRef,
  stringifyTable,
  stringifyTips,
} from '@/lib/lessonParse';
import type { SetLesson } from '@/types/vocab';

const EMPTY_LESSON: SetLesson = {
  intro: '',
  table: { headers: [], rows: [] },
  quickRef: [],
  story: { title: '', intro: '', text: '', outro: '' },
  tips: [],
  warning: '',
};

interface LessonEditorProps {
  setId: string;
  lesson: SetLesson | null;
  onSaved: (lesson: SetLesson) => void;
  onCancel: () => void;
}

export default function LessonEditor({ setId, lesson, onSaved, onCancel }: LessonEditorProps) {
  const base = lesson ?? EMPTY_LESSON;

  const [intro, setIntro] = useState(base.intro);
  const [tableRaw, setTableRaw] = useState(stringifyTable(base.table));
  const [quickRefRaw, setQuickRefRaw] = useState(stringifyQuickRef(base.quickRef));
  const [storyTitle, setStoryTitle] = useState(base.story.title);
  const [storyIntro, setStoryIntro] = useState(base.story.intro);
  const [storyText, setStoryText] = useState(base.story.text);
  const [storyOutro, setStoryOutro] = useState(base.story.outro);
  const [tipsRaw, setTipsRaw] = useState(stringifyTips(base.tips));
  const [warning, setWarning] = useState(base.warning);
  const [saving, setSaving] = useState(false);

  const parsedTable = parseTable(tableRaw);

  const handleSave = async () => {
    setSaving(true);
    try {
      const newLesson: SetLesson = {
        intro: intro.trim(),
        table: parsedTable,
        quickRef: parseQuickRef(quickRefRaw),
        story: {
          title: storyTitle.trim(),
          intro: storyIntro.trim(),
          text: storyText.trim(),
          outro: storyOutro.trim(),
        },
        tips: parseTips(tipsRaw),
        warning: warning.trim(),
      };
      await updateSetLesson(setId, newLesson);
      onSaved(newLesson);
      toast.success('Leçon enregistrée');
    } catch {
      toast.error("Impossible d'enregistrer la leçon. Vérifiez votre connexion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <Label htmlFor="lesson-intro">Introduction</Label>
        <Textarea
          id="lesson-intro"
          className="mt-1"
          rows={2}
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="Courte présentation de la leçon..."
        />
      </div>

      <div>
        <Label htmlFor="lesson-table">Tableau</Label>
        <p className="mb-1 text-xs text-muted-foreground">
          Collez un tableau Markdown (| Col | Col |) ou copié depuis Excel/Sheets. La 1ère ligne = en-têtes.
        </p>
        <Textarea
          id="lesson-table"
          className="mt-1 font-mono text-xs"
          rows={6}
          value={tableRaw}
          onChange={(e) => setTableRaw(e.target.value)}
          placeholder={'| Catégorie | Détails |\n| --- | --- |\n| dans | lieu clos |'}
        />
        {parsedTable.headers.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-xl border">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50">
                  {parsedTable.headers.map((h, i) => (
                    <th key={i} className="p-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedTable.rows.map((row, ri) => (
                  <tr key={ri} className="border-t">
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-2 align-top text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="lesson-quickref">Repère rapide</Label>
        <p className="mb-1 text-xs text-muted-foreground">Une ligne par entrée : terme - catégorie</p>
        <Textarea
          id="lesson-quickref"
          className="mt-1 font-mono text-xs"
          rows={4}
          value={quickRefRaw}
          onChange={(e) => setQuickRefRaw(e.target.value)}
          placeholder={'dans - lieu clos\nsur - contact surface'}
        />
      </div>

      <div className="space-y-2 rounded-2xl border p-4">
        <Label>Histoire</Label>
        <Input value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} placeholder="Titre" />
        <Textarea rows={2} value={storyIntro} onChange={(e) => setStoryIntro(e.target.value)} placeholder="Intro" />
        <Textarea rows={4} value={storyText} onChange={(e) => setStoryText(e.target.value)} placeholder="Texte de l'histoire" />
        <Textarea rows={2} value={storyOutro} onChange={(e) => setStoryOutro(e.target.value)} placeholder="Outro" />
      </div>

      <div>
        <Label htmlFor="lesson-tips">Astuces</Label>
        <p className="mb-1 text-xs text-muted-foreground">Une astuce par bloc, titre précédé de "## "</p>
        <Textarea
          id="lesson-tips"
          className="mt-1 font-mono text-xs"
          rows={6}
          value={tipsRaw}
          onChange={(e) => setTipsRaw(e.target.value)}
          placeholder={'## Astuce 1\nCorps du texte...\n\n## Astuce 2\nCorps du texte...'}
        />
      </div>

      <div>
        <Label htmlFor="lesson-warning">Avertissement</Label>
        <Textarea
          id="lesson-warning"
          className="mt-1"
          rows={2}
          value={warning}
          onChange={(e) => setWarning(e.target.value)}
        />
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t bg-background/95 py-3 backdrop-blur">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4" />
          Annuler
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}
