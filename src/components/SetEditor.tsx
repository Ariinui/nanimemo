import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ImportDialog from '@/components/ImportDialog';
import FlashcardMode from '@/components/FlashcardMode';
import LearnMode from '@/components/LearnMode';
import TestMode from '@/components/TestMode';
import MatchMode from '@/components/MatchMode';
import LessonMode from '@/components/LessonMode';
import ImageWizard from '@/components/ImageWizard';
import SetOverview from '@/components/set/SetOverview';
import ModeTabs, { MODE_TABS } from '@/components/study/ModeTabs';
import { cardsNeedingImage, removeCardImage } from '@/lib/cardImages';
import { deleteCard, deleteSet, fetchCards, fetchProgress, insertCards } from '@/lib/vocabApi';
import type { VocabCard, VocabProgress, VocabSet, StudyMode } from '@/types/vocab';

interface SetEditorProps {
  set: VocabSet;
  userId: string;
  onBack: () => void;
}

export default function SetEditor({ set, userId, onBack }: SetEditorProps) {
  const [lesson, setLesson] = useState(set.lesson);
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Map<string, VocabProgress>>(new Map());
  const [importOpen, setImportOpen] = useState(false);
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

  // Progression (Pas encore étudiée / En cours / Maîtrisés) : rechargée à chaque retour sur la page du set
  useEffect(() => {
    if (mode !== null || cards.length === 0) return;
    let cancelled = false;
    fetchProgress(userId, cards.map((c) => c.id))
      .then((map) => {
        if (!cancelled) setProgress(map);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cards, mode, userId]);

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

  const handleDeleteCard = async (card: VocabCard) => {
    if (!window.confirm(`Supprimer la carte "${card.term}" ?`)) return;
    try {
      await deleteCard(card.id);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
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
          disabledModes={cards.length === 0 ? MODE_TABS.filter((b) => b.mode !== 'lesson').map((b) => b.mode) : []}
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
    <>
      <SetOverview
        set={set}
        cards={cards}
        loading={loading}
        progress={progress}
        needingImageCount={needingImage.length}
        onBack={onBack}
        onOpenMode={setMode}
        onImport={() => setImportOpen(true)}
        onAddImages={() => setWizardCards(needingImage)}
        onChangeImage={(card) => setWizardCards([card])}
        onRemoveImage={removeImage}
        onDeleteCard={handleDeleteCard}
        onDeleteSet={handleDeleteSet}
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />

      {wizardCards && (
        <ImageWizard cards={wizardCards} onSaved={handleImageSaved} onClose={() => setWizardCards(null)} />
      )}
    </>
  );
}
