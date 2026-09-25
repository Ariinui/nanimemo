import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Brain, ChevronDown, FileCheck2, ImagePlus, Layers, LoaderCircle, Plus, Shuffle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ImportDialog from '@/components/ImportDialog';
import FlashcardMode from '@/components/FlashcardMode';
import LearnMode from '@/components/LearnMode';
import TestMode from '@/components/TestMode';
import MatchMode from '@/components/MatchMode';
import LessonMode from '@/components/LessonMode';
import ModeTabs from '@/components/study/ModeTabs';
import { deleteCard, deleteSet, fetchCards, insertCards } from '@/lib/vocabApi';
import { cardsNeedingImage, removeCardImage } from '@/lib/cardImages';
import CardImage from '@/components/study/CardImage';
import ImageWizard from '@/components/ImageWizard';
import type { VocabCard, VocabSet, StudyMode } from '@/types/vocab';

const MODE_BUTTONS: {
  mode: StudyMode;
  label: string;
  icon: typeof Layers;
  colorClass: string;
}[] = [
  { mode: 'cards', label: 'Cartes', icon: Layers, colorClass: 'text-sky-400' },
  { mode: 'learn', label: 'Apprendre', icon: Brain, colorClass: 'text-violet-400' },
  { mode: 'match', label: 'Associer', icon: Shuffle, colorClass: 'text-amber-400' },
  { mode: 'test', label: 'Test', icon: FileCheck2, colorClass: 'text-emerald-400' },
  { mode: 'lesson', label: 'Leçon', icon: BookOpen, colorClass: 'text-rose-400' },
];

interface SetEditorProps {
  set: VocabSet;
  userId: string;
  onBack: () => void;
}

export default function SetEditor({ set, userId, onBack }: SetEditorProps) {
  const [lesson, setLesson] = useState(set.lesson);
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [mode, setMode] = useState<StudyMode | null>(null);
  const [wizardCards, setWizardCards] = useState<VocabCard[] | null>(null);

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

  const needingImage = cardsNeedingImage(cards);

  const handleImageSaved = (cardId: string, url: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, image_url: url } : c)));
  };

  const removeImage = async (card: VocabCard) => {
    try {
      await removeCardImage(card);
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, image_url: null } : c)));
    } catch {
      toast.error("Impossible de retirer l'image.");
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

  if (mode) {
    const close = () => setMode(null);
    return (
      <div className="flex flex-1 flex-col">
        <ModeTabs
          active={mode}
          onChange={setMode}
          disabledModes={cards.length === 0 ? MODE_BUTTONS.filter((b) => b.mode !== 'lesson').map((b) => b.mode) : []}
        />
        <div key={mode} className="anim-fade-up flex flex-1 flex-col">
          {mode === 'cards' && <FlashcardMode cards={cards} userId={userId} onBack={close} />}
          {mode === 'learn' && <LearnMode cards={cards} userId={userId} onBack={close} />}
          {mode === 'match' && <MatchMode cards={cards} onBack={close} />}
          {mode === 'test' && <TestMode cards={cards} onBack={close} />}
          {mode === 'lesson' && (
            <LessonMode set={{ ...set, lesson }} onBack={close} onLessonUpdated={setLesson} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-5">
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

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {MODE_BUTTONS.map(({ mode: m, label, icon: Icon, colorClass }) => (
          <Button
            key={m}
            variant="outline"
            className="h-14 justify-start gap-3 rounded-2xl bg-card px-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
            onClick={() => setMode(m)}
            disabled={m !== 'lesson' && cards.length === 0}
          >
            <Icon className={`h-5 w-5 shrink-0 ${colorClass}`} />
            <span className="truncate">{label}</span>
          </Button>
        ))}
      </div>

      {!loading && needingImage.length > 0 && (
        <button
          type="button"
          onClick={() => setWizardCards(needingImage)}
          className="mb-6 flex min-h-14 w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60"
        >
          <ImagePlus className="h-5 w-5 shrink-0 text-primary" />
          <span className="flex-1">
            <span className="block font-semibold">Ajouter les images</span>
            <span className="block text-sm text-muted-foreground">
              {needingImage.length} carte{needingImage.length !== 1 ? 's' : ''} sans image, une par une
            </span>
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowTerms((v) => !v)}
        className="mb-4 flex w-full items-center justify-between rounded-lg py-2 text-left"
      >
        <h2 className="text-sm font-medium text-muted-foreground">
          Termes dans ce set <span className="text-xs">({cards.length})</span>
        </h2>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showTerms ? 'rotate-180' : ''}`} />
      </button>

      {showTerms && (
      <>
      <div className="mb-4 flex justify-end">
        <Button className="h-11 px-4" onClick={() => setImportOpen(true)}>
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
              <button
                type="button"
                onClick={() => setWizardCards([card])}
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed text-muted-foreground hover:bg-accent"
                title={card.image_url ? "Changer l'image" : 'Chercher une image'}
                aria-label={card.image_url ? "Changer l'image" : 'Chercher une image'}
              >
                <CardImage
                  src={card.image_url}
                  className="h-full w-full object-cover"
                  fallback={<ImagePlus className="h-4 w-4" />}
                />
              </button>
              <div className="flex-1">
                <p className="font-medium">{card.term}</p>
                <p className="text-sm text-muted-foreground">{card.definition}</p>
              </div>
              {card.image_url && (
                <Button variant="ghost" className="h-11 px-3" onClick={() => removeImage(card)}>
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
      </>
      )}

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />

      {wizardCards && (
        <ImageWizard cards={wizardCards} onSaved={handleImageSaved} onClose={() => setWizardCards(null)} />
      )}
    </div>
  );
}
