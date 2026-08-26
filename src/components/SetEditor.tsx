import { useEffect, useState } from 'react';
import { ArrowLeft, Brain, FileCheck2, ImagePlus, Layers, LoaderCircle, Plus, Shuffle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ImportDialog from '@/components/ImportDialog';
import FlashcardMode from '@/components/FlashcardMode';
import LearnMode from '@/components/LearnMode';
import TestMode from '@/components/TestMode';
import MatchMode from '@/components/MatchMode';
import { deleteCard, deleteSet, fetchCards, insertCards, updateCardImage } from '@/lib/vocabApi';
import type { VocabCard, VocabSet, StudyMode } from '@/types/vocab';

const MODE_BUTTONS: {
  mode: StudyMode;
  label: string;
  icon: typeof Layers;
  colorClass: string;
}[] = [
  { mode: 'cards', label: 'Cartes', icon: Layers, colorClass: 'text-sky-400 bg-sky-400/10' },
  { mode: 'learn', label: 'Apprendre', icon: Brain, colorClass: 'text-violet-400 bg-violet-400/10' },
  { mode: 'match', label: 'Associer', icon: Shuffle, colorClass: 'text-amber-400 bg-amber-400/10' },
  { mode: 'test', label: 'Test', icon: FileCheck2, colorClass: 'text-emerald-400 bg-emerald-400/10' },
];

interface PixabayImage {
  id: number;
  previewUrl: string;
  fullUrl: string;
  tags: string;
}

interface SetEditorProps {
  set: VocabSet;
  userId: string;
  onBack: () => void;
}

export default function SetEditor({ set, userId, onBack }: SetEditorProps) {
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState<StudyMode | null>(null);
  const [imageSearchCardId, setImageSearchCardId] = useState<string | null>(null);
  const [imageResults, setImageResults] = useState<PixabayImage[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');

  const loadCards = async () => {
    setLoading(true);
    try {
      const data = await fetchCards(set.id);
      setCards(data);
    } catch {
      toast.error('Impossible de charger les cartes. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  const handleImport = async (rows: { term: string; definition: string }[]) => {
    if (rows.length === 0) return;
    try {
      await insertCards(set.id, rows, cards.length);
      await loadCards();
      toast.success(`${rows.length} carte${rows.length !== 1 ? 's' : ''} importée${rows.length !== 1 ? 's' : ''}.`);
    } catch {
      toast.error("L'import a échoué. Réessayez.");
    }
  };

  const handleDeleteCard = async (cardId: string, term: string) => {
    if (!window.confirm(`Supprimer la carte "${term}" ?`)) return;
    try {
      await deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch {
      toast.error('La suppression a échoué.');
    }
  };

  const openImageSearch = async (card: VocabCard) => {
    setImageSearchCardId(card.id);
    setImageResults([]);
    setImageError('');
    setImageLoading(true);
    try {
      const res = await fetch(`/api/images?q=${encodeURIComponent(card.term)}`);
      const data = await res.json();
      if (!res.ok) {
        setImageError(data.error ?? 'Recherche indisponible.');
      } else {
        setImageResults(data.images ?? []);
      }
    } catch {
      setImageError('Impossible de contacter Pixabay.');
    } finally {
      setImageLoading(false);
    }
  };

  const chooseImage = async (cardId: string, url: string) => {
    try {
      await updateCardImage(cardId, url);
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, image_url: url } : c)));
      setImageSearchCardId(null);
    } catch {
      toast.error("L'enregistrement de l'image a échoué.");
    }
  };

  const removeImage = async (cardId: string) => {
    try {
      await updateCardImage(cardId, null);
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, image_url: null } : c)));
    } catch {
      toast.error('Impossible de retirer l\'image.');
    }
  };

  const handleDeleteSet = async () => {
    if (!window.confirm(`Supprimer définitivement le set "${set.title}" et ses ${cards.length} carte(s) ?`)) return;
    try {
      await deleteSet(set.id);
      onBack();
    } catch {
      toast.error('La suppression du set a échoué.');
    }
  };

  if (mode === 'cards') return <FlashcardMode cards={cards} onBack={() => setMode(null)} />;
  if (mode === 'learn') return <LearnMode cards={cards} userId={userId} onBack={() => setMode(null)} />;
  if (mode === 'match') return <MatchMode cards={cards} onBack={() => setMode(null)} />;
  if (mode === 'test') return <TestMode cards={cards} onBack={() => setMode(null)} />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{set.title}</h1>
          <p className="text-sm text-muted-foreground">{cards.length} carte{cards.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDeleteSet} title="Supprimer le set">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {cards.length > 0 && (
        <button
          type="button"
          onClick={() => setMode('cards')}
          className="group mb-6 flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent"
        >
          {cards[0].image_url && (
            <img src={cards[0].image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{cards[0].term}</p>
            <p className="truncate text-sm text-muted-foreground">{cards[0].definition}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            Étudier →
          </span>
        </button>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MODE_BUTTONS.map(({ mode: m, label, icon: Icon, colorClass }) => (
          <Button
            key={m}
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => setMode(m)}
            disabled={cards.length === 0}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </span>
            {label}
          </Button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Termes dans ce set</h2>
        <Button size="sm" onClick={() => setImportOpen(true)}>
          <Plus className="h-4 w-4" />
          Importer
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucune carte pour l'instant. Cliquez sur "Importer" pour coller votre liste.
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <div key={card.id} className="flex items-center gap-3 rounded-lg border p-3">
              {card.image_url ? (
                <img src={card.image_url} alt="" className="h-12 w-12 rounded object-cover" />
              ) : (
                <button
                  type="button"
                  onClick={() => openImageSearch(card)}
                  className="flex h-12 w-12 items-center justify-center rounded border border-dashed text-muted-foreground hover:bg-accent"
                  title="Chercher une image"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
              )}
              <div className="flex-1">
                <p className="font-medium">{card.term}</p>
                <p className="text-sm text-muted-foreground">{card.definition}</p>
              </div>
              {card.image_url && (
                <Button variant="ghost" size="sm" onClick={() => removeImage(card.id)}>
                  Retirer l'image
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => handleDeleteCard(card.id, card.term)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />

      {imageSearchCardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setImageSearchCardId(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-semibold">Choisir une image</h3>
            {imageLoading && (
              <div className="flex justify-center py-8">
                <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {imageError && <p className="text-sm text-destructive">{imageError}</p>}
            {!imageLoading && !imageError && imageResults.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun résultat.</p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {imageResults.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => chooseImage(imageSearchCardId, img.fullUrl)}
                  className="overflow-hidden rounded-lg border hover:ring-2 hover:ring-primary"
                >
                  <img src={img.previewUrl} alt={img.tags} className="h-24 w-full object-cover" />
                </button>
              ))}
            </div>
            <Button variant="outline" className="mt-3 w-full" onClick={() => setImageSearchCardId(null)}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
