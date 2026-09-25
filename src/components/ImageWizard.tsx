import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ImageOff, ImagePlus, LoaderCircle, RefreshCw, Search, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StudyTopBar from '@/components/study/StudyTopBar';
import { ImageSaveError, saveCardImage, saveCardImageBlob } from '@/lib/cardImages';
import {
  buildQueries,
  cleanTerm,
  searchPixabay,
  searchWithFallback,
  type ImageKind,
  type PixabayHit,
} from '@/lib/pixabay';
import type { VocabCard } from '@/types/vocab';

interface ImageWizardProps {
  /** Cartes à traiter, dans l'ordre. */
  cards: VocabCard[];
  onSaved: (cardId: string, url: string) => void;
  onClose: () => void;
}

type Status = 'loading' | 'ready' | 'empty' | 'error';

// Identifiant de « sauvegarde en cours » pour une photo envoyée (les résultats Pixabay ont des id positifs).
const UPLOAD_ID = -1;

export default function ImageWizard({ cards, onSaved, onClose }: ImageWizardProps) {
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<Record<string, 'saved' | 'skipped'>>({});
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<ImageKind>('photo');
  const [hits, setHits] = useState<PixabayHit[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [note, setNote] = useState('');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');
  const [savedUrls, setSavedUrls] = useState<Record<string, string>>({});

  const fileInput = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const card = cards[index];
  const finished = index >= cards.length;
  const savedCount = Object.values(outcome).filter((o) => o === 'saved').length;
  const skippedCount = Object.values(outcome).filter((o) => o === 'skipped').length;

  const run = useCallback(async (queries: string[], searchKind: ImageKind) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++requestId.current;
    setStatus('loading');
    setHits([]);
    setNote('');
    setSaveError('');
    setErrorMessage('');
    if (queries.length === 0) {
      setQuery('');
      setStatus('empty');
      return;
    }
    try {
      const result = await searchWithFallback(queries, searchKind, {
        signal: controller.signal,
        onWait: setWaitSeconds,
      });
      if (id !== requestId.current) return;
      setQuery(result.query);
      setHits(result.hits);
      setStatus(result.hits.length > 0 ? 'ready' : 'empty');
      if (result.hits.length > 0 && result.query !== queries[0]) {
        setNote(`Rien pour « ${queries[0]} » : résultats pour « ${result.query} ».`);
      }
    } catch (err) {
      if (controller.signal.aborted || id !== requestId.current) return;
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Recherche impossible.');
    }
  }, []);

  const cardQueries = (c: VocabCard) => {
    const queries = buildQueries(c);
    return queries.length > 0 ? queries : [cleanTerm(c.term)].filter(Boolean);
  };

  // Lancement de la recherche à l'ouverture, puis à chaque changement de carte (voir goTo)
  useEffect(() => {
    const first = cards[0];
    if (first) {
      const timer = setTimeout(() => void run(cardQueries(first), 'photo'), 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Préchargement discret des résultats de la carte suivante (limite Pixabay : 100 / minute)
  useEffect(() => {
    if (status !== 'ready') return;
    const next = cards[index + 1];
    if (!next) return;
    const q = cardQueries(next)[0];
    if (!q) return;
    const timer = setTimeout(() => void searchPixabay(q, kind).catch(() => undefined), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, index, kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const goTo = (next: number) => {
    setIndex(next);
    setSavingId(null);
    const target = cards[next];
    if (target) void run(cardQueries(target), kind);
    else abortRef.current?.abort();
  };

  const handlePick = async (hit: PixabayHit) => {
    if (!card || savingId !== null) return;
    setSavingId(hit.id);
    setSaveError('');
    try {
      const url = await saveCardImage({ id: card.id, image_url: savedUrls[card.id] ?? card.image_url }, hit.downloadUrls);
      onSaved(card.id, url);
      setSavedUrls((m) => ({ ...m, [card.id]: url }));
      setOutcome((o) => ({ ...o, [card.id]: 'saved' }));
      goTo(index + 1);
    } catch (err) {
      setSavingId(null);
      setSaveError(
        err instanceof ImageSaveError
          ? `${err.message} Réessaie ou choisis une autre image.`
          : 'Enregistrement impossible. Vérifie ta connexion et réessaie.',
      );
    }
  };

  // Photo de l'utilisateur (galerie ou appareil photo) : même enregistrement permanent que Pixabay.
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de rechoisir le même fichier
    if (!file || !card || savingId !== null) return;
    setSavingId(UPLOAD_ID);
    setSaveError('');
    try {
      const url = await saveCardImageBlob({ id: card.id, image_url: savedUrls[card.id] ?? card.image_url }, file);
      onSaved(card.id, url);
      setSavedUrls((m) => ({ ...m, [card.id]: url }));
      setOutcome((o) => ({ ...o, [card.id]: 'saved' }));
      goTo(index + 1);
    } catch (err) {
      setSavingId(null);
      setSaveError(
        err instanceof ImageSaveError
          ? `${err.message} Choisis une autre photo.`
          : 'Enregistrement impossible. Vérifie ta connexion et réessaie.',
      );
    }
  };

  const handleSkip = () => {
    if (!card) return;
    setOutcome((o) => ({ ...o, [card.id]: 'skipped' }));
    goTo(index + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) void run([q], kind);
  };

  const changeKind = (next: ImageKind) => {
    if (next === kind) return;
    setKind(next);
    void run([query.trim() || (card ? cardQueries(card)[0] : '')].filter(Boolean), next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajouter des images aux cartes"
      className="fixed inset-0 z-50 flex flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-2.5 px-3 pb-3 pt-2">
        <StudyTopBar
          onBack={onClose}
          right={
            <span className="w-14 shrink-0 text-right text-sm font-medium tabular-nums text-muted-foreground">
              {Math.min(index + 1, cards.length)} / {cards.length}
            </span>
          }
        >
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-brand-gradient h-full rounded-full transition-all duration-500"
              style={{ width: `${cards.length ? (Math.min(index, cards.length) / cards.length) * 100 : 0}%` }}
            />
          </div>
        </StudyTopBar>

        {finished || !card ? (
          <div className="anim-pop shadow-glow flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border bg-card p-6 text-center">
            <p className="text-brand-gradient text-5xl font-black">{savedCount}</p>
            <p className="text-lg font-semibold">image{savedCount !== 1 ? 's' : ''} ajoutée{savedCount !== 1 ? 's' : ''}</p>
            {skippedCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {skippedCount} carte{skippedCount !== 1 ? 's' : ''} passée{skippedCount !== 1 ? 's' : ''} (à refaire plus tard)
              </p>
            )}
            <Button className="mt-4 h-14 w-full text-base" onClick={onClose}>
              Terminé
            </Button>
          </div>
        ) : (
          <>
            <div className="shrink-0 rounded-2xl border bg-card px-4 py-2.5 text-center">
              <p className="break-words text-2xl font-bold leading-snug">{card.term}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{card.definition}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex shrink-0 gap-2">
              <Input
                className="h-12 flex-1 rounded-2xl px-4 text-base"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une image…"
                enterKeyHint="search"
                aria-label="Mot à rechercher"
              />
              <Button type="submit" size="icon" className="h-12 w-12 shrink-0" aria-label="Rechercher" disabled={!query.trim()}>
                <Search className="h-5 w-5" />
              </Button>
            </form>

            <div className="flex shrink-0 gap-2" role="group" aria-label="Type d'image">
              {(['photo', 'illustration'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => changeKind(k)}
                  aria-pressed={kind === k}
                  className={`h-11 flex-1 rounded-xl border text-sm font-semibold transition-colors ${
                    kind === k ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5'
                  }`}
                >
                  {k === 'photo' ? 'Photos' : 'Illustrations'}
                </button>
              ))}
            </div>

            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFile(e)} aria-label="Choisir une photo sur cet appareil" />
            <Button
              type="button"
              variant="outline"
              className="h-12 shrink-0 gap-2 text-base"
              onClick={() => fileInput.current?.click()}
              disabled={savingId !== null}
            >
              {savingId === UPLOAD_ID ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              {savingId === UPLOAD_ID ? 'Enregistrement…' : 'Ma propre photo'}
            </Button>

            <div className="min-h-5 shrink-0 text-center text-xs text-muted-foreground" aria-live="polite">
              {waitSeconds > 0 && status === 'loading'
                ? `Limite de recherches atteinte, reprise dans ${waitSeconds} s…`
                : (saveError || note) && <span className={saveError ? 'text-destructive' : ''}>{saveError || note}</span>}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {status === 'loading' && (
                <div className="flex h-full min-h-40 items-center justify-center">
                  <LoaderCircle className="h-7 w-7 animate-spin text-muted-foreground" aria-label="Recherche en cours" />
                </div>
              )}
              {status === 'empty' && (
                <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
                  <ImageOff className="h-8 w-8" />
                  <p className="text-base">Aucune image trouvée{query ? ` pour « ${query} »` : ''}.</p>
                  <p className="text-sm">Essaie un autre mot ci-dessus, ou touche « Passer ».</p>
                </div>
              )}
              {status === 'error' && (
                <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="text-base text-destructive">{errorMessage}</p>
                  <Button variant="outline" className="h-11" onClick={() => void run(cardQueries(card), kind)}>
                    <RefreshCw className="h-4 w-4" />
                    Réessayer
                  </Button>
                </div>
              )}
              {status === 'ready' && (
                <div className="grid grid-cols-3 gap-2 pb-1">
                  {hits.map((hit, i) => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => void handlePick(hit)}
                      disabled={savingId !== null}
                      aria-label={`Choisir l'image ${i + 1}`}
                      className="relative aspect-square overflow-hidden rounded-xl border bg-secondary transition-all active:scale-95 disabled:opacity-50"
                    >
                      <img src={hit.previewUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {savingId === hit.id && (
                        <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                          <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <Button variant="outline" className="h-12 flex-1" onClick={() => goTo(index - 1)} disabled={index === 0 || savingId !== null}>
                <ChevronLeft className="h-4 w-4" />
                Précédente
              </Button>
              <Button variant="outline" className="h-12 flex-1" onClick={handleSkip} disabled={savingId !== null}>
                Passer
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            <p className="shrink-0 text-center text-xs text-muted-foreground">Recherche : images Pixabay · ou ta propre photo</p>
          </>
        )}
      </div>
    </div>
  );
}
