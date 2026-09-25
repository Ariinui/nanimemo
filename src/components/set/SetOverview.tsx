import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  BrainCircuit,
  Check,
  ChevronDown,
  FileCheck2,
  ImagePlus,
  Layers,
  ListFilter,
  LoaderCircle,
  MoreVertical,
  Pencil,
  Plus,
  Shuffle,
  Star,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PreviewCarousel from '@/components/set/PreviewCarousel';
import ProgressSummary from '@/components/set/ProgressSummary';
import ReviewPreview from '@/components/set/ReviewPreview';
import TermCard from '@/components/set/TermCard';
import { formatCreatedFr } from '@/lib/relativeTime';
import { cardStatus, countProgress, loadStarred, saveStarred, type CardStatus } from '@/lib/setProgress';
import type { StudyMode, VocabCard, VocabProgress, VocabSet } from '@/types/vocab';

const MODES: { mode: StudyMode; label: string; icon: typeof Layers; color: string }[] = [
  { mode: 'cards', label: 'Cartes', icon: Layers, color: 'text-sky-400' },
  { mode: 'learn', label: 'Apprendre', icon: Brain, color: 'text-violet-400' },
  { mode: 'test', label: 'Test', icon: FileCheck2, color: 'text-emerald-400' },
  { mode: 'match', label: 'Associer', icon: Shuffle, color: 'text-amber-400' },
  { mode: 'lesson', label: 'Leçon', icon: BookOpen, color: 'text-rose-400' },
];

// Regroupement « Vos stats » : un bloc par état, chacun avec son message d'encouragement
const GROUPS: { status: CardStatus; title: string; hint: string; color: string }[] = [
  { status: 'new', title: 'Pas encore étudiés', hint: "Vous n'avez pas encore étudié ces termes.", color: 'text-muted-foreground' },
  { status: 'learning', title: 'En cours', hint: 'Vous avez commencé à étudier ces termes. Continuez le bel effort !', color: 'text-warning' },
  { status: 'mastered', title: 'Maîtrisés', hint: 'Vous maîtrisez ces termes. Bravo !', color: 'text-success' },
];

type ViewOrder = 'stats' | 'origin' | 'alpha';

const VIEW_LABELS: Record<ViewOrder, string> = {
  stats: 'Vos stats',
  origin: "Ordre d'origine",
  alpha: 'Alphabétique',
};

type MenuName = 'actions' | 'sort' | 'activity';

interface SetOverviewProps {
  set: VocabSet;
  cards: VocabCard[];
  loading: boolean;
  progress: Map<string, VocabProgress>;
  needingImageCount: number;
  onBack: () => void;
  onOpenMode: (mode: StudyMode) => void;
  onImport: () => void;
  onAddImages: () => void;
  onChangeImage: (card: VocabCard) => void;
  onRemoveImage: (card: VocabCard) => void;
  onDeleteCard: (card: VocabCard) => void;
  onDeleteSet: () => void;
}

const menuItem =
  'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-medium transition-colors hover:bg-white/10';

export default function SetOverview({
  set,
  cards,
  loading,
  progress,
  needingImageCount,
  onBack,
  onOpenMode,
  onImport,
  onAddImages,
  onChangeImage,
  onRemoveImage,
  onDeleteCard,
  onDeleteSet,
}: SetOverviewProps) {
  const [menu, setMenu] = useState<MenuName | null>(null);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<ViewOrder>('origin');
  const [starOnly, setStarOnly] = useState(false);
  const [hideDefinitions, setHideDefinitions] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(() => loadStarred(set.id));
  const termsRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => countProgress(cards, progress), [cards, progress]);

  const flatList = useMemo(() => {
    let list = cards;
    if (starOnly) list = list.filter((c) => starred.has(c.id));
    if (view === 'alpha') list = [...list].sort((a, b) => a.term.localeCompare(b.term, 'fr', { sensitivity: 'base' }));
    return list;
  }, [cards, starOnly, starred, view]);

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, cards: cards.filter((c) => cardStatus(progress.get(c.id)) === g.status) })).filter(
        (g) => g.cards.length > 0,
      ),
    [cards, progress],
  );

  const grouped = view === 'stats' && !starOnly;

  const updateStars = (updater: (prev: Set<string>) => Set<string>) =>
    setStarred((prev) => {
      const next = updater(prev);
      saveStarred(set.id, next);
      return next;
    });

  const toggleStar = (id: string) =>
    updateStars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // « Sélectionner N » : étoile (ou retire l'étoile de) tous les termes d'un groupe
  const toggleGroupStars = (groupCards: VocabCard[]) =>
    updateStars((prev) => {
      const next = new Set(prev);
      const allStarred = groupCards.every((c) => next.has(c.id));
      for (const c of groupCards) {
        if (allStarred) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });

  const selectStatus = (status: CardStatus) => {
    setView('stats');
    setStarOnly(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const target = document.getElementById(`group-${status}`) ?? termsRef.current;
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }),
    );
  };

  const closeMenu = () => setMenu(null);
  const hasCards = cards.length > 0;
  const createdLabel = formatCreatedFr(set.created_at);

  const renderCard = (card: VocabCard) => (
    <TermCard
      key={`${card.id}-${hideDefinitions}`}
      card={card}
      starred={starred.has(card.id)}
      editing={editing}
      definitionHidden={hideDefinitions}
      onToggleStar={() => toggleStar(card.id)}
      onChangeImage={() => onChangeImage(card)}
      onRemoveImage={() => onRemoveImage(card)}
      onDelete={() => onDeleteCard(card)}
    />
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-36">
      {menu && <div className="fixed inset-0 z-10" onClick={closeMenu} aria-hidden="true" />}

      <div className="sticky top-0 z-20 -mx-4 flex h-14 items-center justify-between bg-background/90 px-2 backdrop-blur">
        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" onClick={onBack} aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => setMenu(menu === 'actions' ? null : 'actions')}
            aria-label="Plus d'actions"
            aria-haspopup="menu"
            aria-expanded={menu === 'actions'}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
          {menu === 'actions' && (
            <div role="menu" className="shadow-glow absolute right-0 top-12 z-40 w-72 max-w-[calc(100vw-24px)] rounded-2xl border bg-card p-1.5">
              <button type="button" role="menuitem" className={menuItem} onClick={() => { closeMenu(); setEditing((v) => !v); }}>
                {editing ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                {editing ? 'Terminer la modification' : 'Modifier les termes'}
              </button>
              <button type="button" role="menuitem" className={menuItem} onClick={() => { closeMenu(); onImport(); }}>
                <Plus className="h-5 w-5" />
                Importer des termes
              </button>
              {needingImageCount > 0 && (
                <button type="button" role="menuitem" className={menuItem} onClick={() => { closeMenu(); onAddImages(); }}>
                  <ImagePlus className="h-5 w-5" />
                  Ajouter les images ({needingImageCount})
                </button>
              )}
              <button type="button" role="menuitem" className={`${menuItem} text-destructive`} onClick={() => { closeMenu(); onDeleteSet(); }}>
                <Trash2 className="h-5 w-5" />
                Supprimer le set
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <LoaderCircle className="h-7 w-7 animate-spin text-muted-foreground" aria-label="Chargement" />
        </div>
      ) : (
        <>
          {hasCards && <PreviewCarousel cards={cards} onOpenCards={() => onOpenMode('cards')} />}

          <h1 className="mt-6 break-words text-3xl font-black leading-tight tracking-tight">{set.title}</h1>
          <p className="mt-2 flex items-center gap-2.5 text-base text-muted-foreground">
            <span className="bg-brand-gradient flex h-7 w-7 items-center justify-center rounded-full">
              <BrainCircuit className="h-4 w-4 text-white" />
            </span>
            {cards.length} terme{cards.length !== 1 ? 's' : ''}
          </p>

          <nav className="mt-6 space-y-2.5" aria-label="Modes d'étude">
            {MODES.map(({ mode, label, icon: Icon, color }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onOpenMode(mode)}
                disabled={mode !== 'lesson' && !hasCards}
                className="flex min-h-[3.75rem] w-full items-center gap-4 rounded-2xl border bg-card px-4 text-left transition-all hover:border-primary/40 active:scale-[0.99] disabled:opacity-40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
                  <Icon className={`h-5 w-5 ${color}`} />
                </span>
                <span className="text-lg font-semibold">{label}</span>
              </button>
            ))}
          </nav>

          {needingImageCount > 0 && (
            <button
              type="button"
              onClick={onAddImages}
              className="mt-2.5 flex min-h-[3.75rem] w-full items-center gap-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-left transition-all hover:border-primary/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <ImagePlus className="h-5 w-5 text-primary" />
              </span>
              <span className="flex-1">
                <span className="block text-lg font-semibold">Ajouter les images</span>
                <span className="block text-sm text-muted-foreground">
                  {needingImageCount} carte{needingImageCount !== 1 ? 's' : ''} sans image, une par une
                </span>
              </span>
            </button>
          )}

          <div className="mt-8 flex items-center gap-3">
            <span className="bg-brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
              <BrainCircuit className="h-6 w-6 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Créée par</p>
              <p className="text-base font-semibold leading-tight">Vous</p>
              {createdLabel && <p className="text-xs text-muted-foreground">{createdLabel}</p>}
            </div>
          </div>

          {hasCards && (
            <div className="mt-8">
              <ProgressSummary counts={counts} onSelect={selectStatus} />
            </div>
          )}

          {hasCards && (
            <div className="mt-8">
              <ReviewPreview cards={cards} onStudy={() => onOpenMode('learn')} />
            </div>
          )}

          <div ref={termsRef} className="mt-8 scroll-mt-16">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-bold">
                Termes dans cette liste <span className="tabular-nums">({cards.length})</span>
              </h2>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenu(menu === 'sort' ? null : 'sort')}
                  aria-haspopup="menu"
                  aria-expanded={menu === 'sort'}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-base font-semibold"
                >
                  {starOnly ? 'Étoilés' : VIEW_LABELS[view]}
                  <ListFilter className="h-5 w-5" />
                </button>
                {menu === 'sort' && (
                  <div role="menu" className="shadow-glow absolute right-0 top-12 z-40 w-64 max-w-[calc(100vw-24px)] rounded-2xl border bg-card p-1.5">
                    {(['stats', 'origin', 'alpha'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={view === value}
                        className={menuItem}
                        onClick={() => { setView(value); closeMenu(); }}
                      >
                        <Check className={`h-5 w-5 ${view === value ? '' : 'opacity-0'}`} />
                        {VIEW_LABELS[value]}
                      </button>
                    ))}
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={starOnly}
                      className={menuItem}
                      onClick={() => { setStarOnly((v) => !v); closeMenu(); }}
                    >
                      <Check className={`h-5 w-5 ${starOnly ? '' : 'opacity-0'}`} />
                      Étoilés seulement
                    </button>
                  </div>
                )}
              </div>
            </div>

            {editing && (
              <div className="mt-2">
                <span className="inline-flex min-h-11 items-center rounded-full bg-warning/15 px-4 text-sm font-semibold text-warning">
                  Mode modification
                </span>
              </div>
            )}

            {!hasCards ? (
              <div className="mt-4 rounded-2xl border border-dashed p-8 text-center text-base text-muted-foreground">
                <p className="mb-4">Aucun terme pour l'instant.</p>
                <Button className="h-12 px-5" onClick={onImport}>
                  <Plus className="h-4 w-4" />
                  Importer des termes
                </Button>
              </div>
            ) : grouped ? (
              <div className="mt-3 space-y-8">
                {groups.map((g) => {
                  const allStarred = g.cards.every((c) => starred.has(c.id));
                  return (
                    <section key={g.status} id={`group-${g.status}`} className="scroll-mt-16" aria-labelledby={`group-title-${g.status}`}>
                      <div className="flex items-center justify-between gap-3">
                        <h3 id={`group-title-${g.status}`} className={`min-w-0 text-lg font-bold ${g.color}`}>
                          {g.title} <span className="tabular-nums">({g.cards.length})</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => toggleGroupStars(g.cards)}
                          aria-pressed={allStarred}
                          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border bg-secondary/70 px-4 text-sm font-semibold transition-colors hover:bg-secondary"
                        >
                          <Star className={`h-4 w-4 ${allStarred ? 'fill-warning text-warning' : ''}`} />
                          {allStarred ? 'Désélectionner' : 'Sélectionner'} {g.cards.length}
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{g.hint}</p>
                      <div className="mt-3 space-y-3">{g.cards.map(renderCard)}</div>
                    </section>
                  );
                })}
              </div>
            ) : flatList.length === 0 ? (
              <p className="mt-6 text-center text-base text-muted-foreground">Aucun terme étoilé pour l'instant.</p>
            ) : (
              <div className="mt-3 space-y-3">{flatList.map(renderCard)}</div>
            )}
          </div>
        </>
      )}

      {hasCards && !loading && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background from-55% to-transparent pt-10">
          <div className="mx-auto w-full max-w-3xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto relative flex gap-2 rounded-full border bg-card/95 p-1.5 shadow-glow backdrop-blur">
              <button
                type="button"
                onClick={() => setHideDefinitions((v) => !v)}
                aria-pressed={hideDefinitions}
                className="h-14 flex-1 rounded-full border px-3 text-sm font-semibold leading-tight transition-colors hover:bg-white/5"
              >
                {hideDefinitions ? 'Afficher les définitions' : 'Cacher les définitions'}
              </button>
              <button
                type="button"
                onClick={() => setMenu(menu === 'activity' ? null : 'activity')}
                aria-haspopup="menu"
                aria-expanded={menu === 'activity'}
                className="bg-brand-gradient flex h-14 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold leading-tight text-primary-foreground"
              >
                <span>Étudier avec une activité</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${menu === 'activity' ? 'rotate-180' : ''}`} />
              </button>
              {menu === 'activity' && (
                <div role="menu" className="shadow-glow absolute bottom-full right-0 mb-2 w-72 max-w-[calc(100vw-24px)] rounded-2xl border bg-card p-1.5">
                  {MODES.filter((m) => m.mode !== 'lesson').map(({ mode, label, icon: Icon, color }) => (
                    <button
                      key={mode}
                      type="button"
                      role="menuitem"
                      className={menuItem}
                      onClick={() => { closeMenu(); onOpenMode(mode); }}
                    >
                      <Icon className={`h-5 w-5 ${color}`} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
