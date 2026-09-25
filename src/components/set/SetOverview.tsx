import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  BrainCircuit,
  Check,
  FileCheck2,
  ImagePlus,
  Layers,
  ListFilter,
  LoaderCircle,
  MoreVertical,
  Pencil,
  Plus,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PreviewCarousel from '@/components/set/PreviewCarousel';
import ProgressSummary from '@/components/set/ProgressSummary';
import TermCard from '@/components/set/TermCard';
import { cardStatus, countProgress, loadStarred, saveStarred, type CardStatus } from '@/lib/setProgress';
import type { StudyMode, VocabCard, VocabProgress, VocabSet } from '@/types/vocab';

const MODES: { mode: StudyMode; label: string; icon: typeof Layers; color: string }[] = [
  { mode: 'cards', label: 'Cartes', icon: Layers, color: 'text-sky-400' },
  { mode: 'learn', label: 'Apprendre', icon: Brain, color: 'text-violet-400' },
  { mode: 'test', label: 'Test', icon: FileCheck2, color: 'text-emerald-400' },
  { mode: 'match', label: 'Associer', icon: Shuffle, color: 'text-amber-400' },
  { mode: 'lesson', label: 'Leçon', icon: BookOpen, color: 'text-rose-400' },
];

const STATUS_LABELS: Record<CardStatus, string> = {
  new: 'Pas encore étudiée',
  learning: "En cours d'apprentissage",
  mastered: 'Maîtrisés',
};

type SortOrder = 'origin' | 'alpha';

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
  const [menu, setMenu] = useState<'actions' | 'sort' | null>(null);
  const [editing, setEditing] = useState(false);
  const [sort, setSort] = useState<SortOrder>('origin');
  const [starOnly, setStarOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CardStatus | null>(null);
  const [starred, setStarred] = useState<Set<string>>(() => loadStarred(set.id));
  const termsRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => countProgress(cards, progress), [cards, progress]);

  const visible = useMemo(() => {
    let list = cards;
    if (statusFilter) list = list.filter((c) => cardStatus(progress.get(c.id)) === statusFilter);
    if (starOnly) list = list.filter((c) => starred.has(c.id));
    if (sort === 'alpha') list = [...list].sort((a, b) => a.term.localeCompare(b.term, 'fr', { sensitivity: 'base' }));
    return list;
  }, [cards, progress, statusFilter, starOnly, starred, sort]);

  const toggleStar = (id: string) =>
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveStarred(set.id, next);
      return next;
    });

  const selectStatus = (status: CardStatus) => {
    setStatusFilter((current) => (current === status ? null : status));
    requestAnimationFrame(() => termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const closeMenu = () => setMenu(null);
  const hasCards = cards.length > 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-32">
      {menu && <div className="fixed inset-0 z-30" onClick={closeMenu} aria-hidden="true" />}

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
            <div role="menu" className="shadow-glow absolute right-0 top-12 z-40 w-72 rounded-2xl border bg-card p-1.5">
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

          {hasCards && (
            <div className="mt-8">
              <ProgressSummary counts={counts} active={statusFilter} onSelect={selectStatus} />
            </div>
          )}

          <div ref={termsRef} className="mt-8 scroll-mt-16">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Termes</h2>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenu(menu === 'sort' ? null : 'sort')}
                  aria-haspopup="menu"
                  aria-expanded={menu === 'sort'}
                  className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-base font-semibold"
                >
                  {starOnly ? 'Étoilés' : sort === 'alpha' ? 'Alphabétique' : "Ordre d'origine"}
                  <ListFilter className="h-5 w-5" />
                </button>
                {menu === 'sort' && (
                  <div role="menu" className="shadow-glow absolute right-0 top-12 z-40 w-64 rounded-2xl border bg-card p-1.5">
                    {([['origin', "Ordre d'origine"], ['alpha', 'Alphabétique']] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={sort === value}
                        className={menuItem}
                        onClick={() => { setSort(value); closeMenu(); }}
                      >
                        <Check className={`h-5 w-5 ${sort === value ? '' : 'opacity-0'}`} />
                        {label}
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

            {(statusFilter || editing) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {statusFilter && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter(null)}
                    className="flex min-h-11 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 text-sm font-semibold"
                  >
                    {STATUS_LABELS[statusFilter]}
                    <X className="h-4 w-4" />
                  </button>
                )}
                {editing && (
                  <span className="flex min-h-11 items-center rounded-full bg-warning/15 px-4 text-sm font-semibold text-warning">
                    Mode modification
                  </span>
                )}
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
            ) : visible.length === 0 ? (
              <p className="mt-6 text-center text-base text-muted-foreground">Aucun terme ne correspond à ce filtre.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {visible.map((card) => (
                  <TermCard
                    key={card.id}
                    card={card}
                    starred={starred.has(card.id)}
                    editing={editing}
                    onToggleStar={() => toggleStar(card.id)}
                    onChangeImage={() => onChangeImage(card)}
                    onRemoveImage={() => onRemoveImage(card)}
                    onDelete={() => onDeleteCard(card)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {hasCards && !loading && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background from-55% to-transparent pt-10">
          <div className="mx-auto w-full max-w-3xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button className="pointer-events-auto h-14 w-full rounded-full text-base" onClick={() => onOpenMode('learn')}>
              Étudier cette liste
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
