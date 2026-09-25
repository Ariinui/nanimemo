import type { VocabCard, VocabProgress } from '@/types/vocab';

export type CardStatus = 'new' | 'learning' | 'mastered';

/** Pas encore étudiée = aucune ligne de progression ; maîtrisée = boîte Leitner 5 ; sinon en cours. */
export function cardStatus(progress: VocabProgress | undefined): CardStatus {
  if (!progress) return 'new';
  return progress.box >= 5 ? 'mastered' : 'learning';
}

export interface ProgressCounts {
  new: number;
  learning: number;
  mastered: number;
  total: number;
}

export function countProgress(cards: VocabCard[], progress: Map<string, VocabProgress>): ProgressCounts {
  const counts: ProgressCounts = { new: 0, learning: 0, mastered: 0, total: cards.length };
  for (const c of cards) counts[cardStatus(progress.get(c.id))]++;
  return counts;
}

const starKey = (setId: string) => `nanimemo_starred_${setId}`;
export const matchBestKey = (setId: string) => `nanimemo_match_best_${setId}`;

/** Efface de l'appareil tout ce qui se rapporte à un set supprimé (étoiles, meilleur temps d'Associer). */
export function forgetSetLocalData(setId: string): void {
  try {
    localStorage.removeItem(starKey(setId));
    localStorage.removeItem(matchBestKey(setId));
  } catch {
    // stockage indisponible : rien à effacer
  }
}

/** Retire une carte supprimée de la liste des étoiles de son set. */
export function forgetCardStar(setId: string, cardId: string): void {
  const starred = loadStarred(setId);
  if (starred.delete(cardId)) saveStarred(setId, starred);
}

/** Étoiles d'un set, mémorisées sur l'appareil (pas de synchronisation entre appareils). */
export function loadStarred(setId: string): Set<string> {
  try {
    const raw = localStorage.getItem(starKey(setId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveStarred(setId: string, starred: Set<string>): void {
  try {
    localStorage.setItem(starKey(setId), JSON.stringify([...starred]));
  } catch {
    // stockage indisponible : les étoiles restent valables pour la session
  }
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Lecture à voix haute avec la synthèse vocale du navigateur (gratuite, hors ligne). */
export function speak(text: string, lang = 'fr-FR'): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}
