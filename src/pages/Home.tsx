import { useEffect, useState } from 'react';
import { LoaderCircle, LogOut, Plus } from 'lucide-react';
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

interface HomeProps {
  userId: string;
  onOpenSet: (set: VocabSet) => void;
}

export default function Home({ userId, onOpenSet }: HomeProps) {
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

  const handleSignOut = () => {
    localStorage.removeItem('nanimemo_entered');
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">nanimemo</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau set
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Déconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="mb-4 text-muted-foreground">Aucun set pour l'instant.</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Créer votre premier set
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sets.map((set) => (
            <button
              key={set.id}
              type="button"
              onClick={() => onOpenSet(set)}
              className="rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent"
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
