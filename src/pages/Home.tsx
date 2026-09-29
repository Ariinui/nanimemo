import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, BrainCircuit, LoaderCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createSet, fetchSets } from '@/lib/vocabApi';
import type { VocabSet } from '@/types/vocab';

const TAHITIEN_LESSON_PREFIX = 'Le Parler Tahitien — Leçon ';

const EMBARK_PREFIX = 'Embark — ';
const EMBARK_CATEGORY_ORDER = ['Noms', 'Verbes', 'Adjectifs', 'Autres mots', 'Phrases'];

export type FolderId = 'tahitien' | 'embark';

function tahitienLessonNumber(title: string): number {
  return parseInt(title.slice(TAHITIEN_LESSON_PREFIX.length), 10);
}

function embarkSortKey(title: string): number {
  const m = /^Embark — (.+) (\d+)$/.exec(title);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const cat = EMBARK_CATEGORY_ORDER.indexOf(m[1]);
  return (cat === -1 ? EMBARK_CATEGORY_ORDER.length : cat) * 1000 + parseInt(m[2], 10);
}

interface HomeProps {
  userId: string;
  onOpenSet: (set: VocabSet) => void;
  openFolder: FolderId | null;
  onOpenFolderChange: (folder: FolderId | null) => void;
}

export default function Home({
  userId,
  onOpenSet,
  openFolder,
  onOpenFolderChange,
}: HomeProps) {
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchSets(userId);
      setSets(data);
    } catch {
      toast.error('Impossible de charger vos sets. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const set = await createSet(userId, newTitle.trim(), null);
      setCreateOpen(false);
      setNewTitle('');
      setSets((prev) => [set, ...prev]);
      onOpenSet(set);
    } catch {
      toast.error('Impossible de créer le set. Réessayez.');
    } finally {
      setCreating(false);
    }
  };

  const tahitienSets = sets
    .filter((s) => s.title.startsWith(TAHITIEN_LESSON_PREFIX))
    .sort((a, b) => tahitienLessonNumber(a.title) - tahitienLessonNumber(b.title));
  const embarkSets = sets
    .filter((s) => s.title.startsWith(EMBARK_PREFIX))
    .sort((a, b) => embarkSortKey(a.title) - embarkSortKey(b.title));
  const otherSets = sets.filter(
    (s) => !s.title.startsWith(TAHITIEN_LESSON_PREFIX) && !s.title.startsWith(EMBARK_PREFIX),
  );

  if (openFolder) {
    const folderSets = openFolder === 'embark' ? embarkSets : tahitienSets;
    const folderTitle = openFolder === 'embark' ? 'Embark' : 'Apprendre le tahitien';
    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-5">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => onOpenFolderChange(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{folderTitle}</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {folderSets.map((set) => (
            <button
              key={set.id}
              type="button"
              onClick={() => onOpenSet(set)}
              className="anim-fade-up rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-glow"
            >
              <p className="font-semibold">{set.title}</p>
              {set.description && <p className="mt-1 text-sm text-muted-foreground">{set.description}</p>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-5">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="flex min-w-0 items-center gap-2 text-xl font-black tracking-tight sm:gap-2.5 sm:text-2xl">
          <span className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md shadow-primary/30 sm:h-10 sm:w-10">
            <BrainCircuit className="h-5 w-5 text-white" strokeWidth={2} />
          </span>
          <span className="text-brand-gradient truncate">nanimemo</span>
        </h1>
        <div className="flex shrink-0 gap-2">
          <Button className="h-11 px-3.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau set
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sets.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <p className="mb-4 text-muted-foreground">Aucun set pour l'instant.</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Créer votre premier set
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tahitienSets.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenFolderChange('tahitien')}
              className="flex items-center gap-3 anim-fade-up rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-glow"
            >
              <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-semibold">Apprendre le tahitien</p>
                <p className="mt-1 text-sm text-muted-foreground">{tahitienSets.length} leçons</p>
              </div>
            </button>
          )}
          {embarkSets.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenFolderChange('embark')}
              className="flex items-center gap-3 anim-fade-up rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-glow"
            >
              <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-semibold">Embark</p>
                <p className="mt-1 text-sm text-muted-foreground">{embarkSets.length} sets</p>
              </div>
            </button>
          )}
          {otherSets.map((set) => (
            <button
              key={set.id}
              type="button"
              onClick={() => onOpenSet(set)}
              className="anim-fade-up rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-glow"
            >
              <p className="font-semibold">{set.title}</p>
              {set.description && <p className="mt-1 text-sm text-muted-foreground">{set.description}</p>}
            </button>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau set</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titre du set"
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim() || creating}>
              {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
