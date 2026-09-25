// Recherche d'images Pixabay : requêtes nettoyées, cache, délai d'attente, nouvelles
// tentatives et respect de la limite de débit (100 requêtes / 60 s).
// Les images ne sont JAMAIS utilisées depuis Pixabay : elles sont copiées sur notre
// stockage (voir cardImages.ts), Pixabay interdisant le lien direct (hotlinking).

export type ImageKind = 'photo' | 'illustration';

export interface PixabayHit {
  id: number;
  previewUrl: string;
  /** URLs de téléchargement, de la plus légère à la plus lourde. */
  downloadUrls: string[];
  tags: string;
}

export interface SearchResult {
  query: string;
  hits: PixabayHit[];
}

const STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux', 'et', 'ou', 'à', 'a', 'en', 'est',
  'sont', 'il', 'elle', 'je', 'tu', 'nous', 'vous', 'ils', 'elles', 'sur', 'dans', 'par', 'pour',
  'avec', 'sans', 'sous', 'ce', 'cette', 'ces', 'son', 'sa', 'ses', 'que', 'qui', 'ne', 'pas', 'se',
]);

/** Nettoie un terme : retire parenthèses, points de suspension, alternatives (a/b), ponctuation. */
export function cleanTerm(raw: string): string {
  const s = raw
    .normalize('NFC')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[.…_]{2,}/g, ' ')
    .split(/[/;|,]/)[0]
    .replace(/[^\p{L}\p{N}' -]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return s.slice(0, 100);
}

/** Mots-clés porteurs de sens d'une phrase (mots de 4 lettres et plus, hors mots vides), ordre de la phrase. */
export function keywordsFrom(text: string, max = 3): string[] {
  const words = cleanTerm(text)
    .split(' ')
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  const unique = [...new Set(words)];
  // garde les `max` mots les plus longs, mais dans l'ordre de la phrase
  const keep = new Set([...unique].sort((a, b) => b.length - a.length).slice(0, max));
  return unique.filter((w) => keep.has(w));
}

/**
 * Requêtes à essayer, dans l'ordre. Pour un mot-outil ou très court (sur, dès), les
 * mots-clés de la définition (La balle est ... le cube) donnent de meilleures images.
 */
export function buildQueries(card: { term: string; definition: string }): string[] {
  const term = cleanTerm(card.term);
  const fromDef = keywordsFrom(card.definition).join(' ');
  const termIsWeak = term.length <= 3 || STOPWORDS.has(term);
  const ordered = termIsWeak ? [fromDef, term] : [term, fromDef];
  const out: string[] = [];
  for (const q of ordered) if (q.length >= 2 && !out.includes(q)) out.push(q);
  return out;
}

/** Dérive les URLs de téléchargement (CDN, CORS ouvert) à partir de l'aperçu 150 px. */
export function downloadUrlsFrom(previewUrl: string, webformatUrl?: string): string[] {
  const urls: string[] = [];
  if (previewUrl.includes('_150.')) {
    urls.push(previewUrl.replace('_150.', '_640.'), previewUrl.replace('_150.', '_1280.'));
  }
  if (webformatUrl) urls.push(webformatUrl);
  urls.push(previewUrl);
  return urls;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // exigence Pixabay : mettre en cache 24 h
const cache = new Map<string, { at: number; hits: PixabayHit[] }>();

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Annulé', 'AbortError'));
    });
  });

export type PixabayErrorKind = 'config' | 'network' | 'rate' | 'server';

export class PixabayError extends Error {
  readonly kind: PixabayErrorKind;
  constructor(message: string, kind: PixabayErrorKind) {
    super(message);
    this.kind = kind;
  }
}

interface RawHit {
  id: number;
  previewURL: string;
  webformatURL?: string;
  tags: string;
}

interface SearchOptions {
  signal?: AbortSignal;
  /** Appelé chaque seconde pendant l'attente de la limite de débit (0 = reprise). */
  onWait?: (seconds: number) => void;
}

export async function searchPixabay(query: string, kind: ImageKind, opts: SearchOptions = {}): Promise<PixabayHit[]> {
  const apiKey = import.meta.env.VITE_PIXABAY_API_KEY as string | undefined;
  if (!apiKey) throw new PixabayError('Pixabay non configuré (clé manquante).', 'config');

  const cacheKey = `${kind}|${query}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.hits;

  const url =
    `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}` +
    `&lang=fr&image_type=${kind}&safesearch=true&per_page=12`;

  let lastError = new PixabayError('Connexion impossible à Pixabay.', 'network');
  for (let attempt = 0; attempt < 4; attempt++) {
    if (opts.signal?.aborted) throw new DOMException('Annulé', 'AbortError');
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), 15000);
    const onAbort = () => timeout.abort();
    opts.signal?.addEventListener('abort', onAbort);
    try {
      const res = await fetch(url, { signal: timeout.signal });
      if (res.status === 429) {
        const reset = Number(res.headers.get('X-RateLimit-Reset')) || 30;
        const wait = Math.min(65, reset + 1);
        lastError = new PixabayError('Limite de recherches atteinte.', 'rate');
        for (let s = wait; s > 0; s--) {
          opts.onWait?.(s);
          await sleep(1000, opts.signal);
        }
        opts.onWait?.(0);
        continue;
      }
      if (res.status >= 500) {
        lastError = new PixabayError(`Pixabay indisponible (${res.status}).`, 'server');
        await sleep(1500 * (attempt + 1), opts.signal);
        continue;
      }
      if (!res.ok) throw new PixabayError(`Erreur Pixabay (${res.status}).`, 'config');
      const data = (await res.json()) as { hits?: RawHit[] };
      const hits: PixabayHit[] = (data.hits ?? []).map((h) => ({
        id: h.id,
        previewUrl: h.previewURL,
        downloadUrls: downloadUrlsFrom(h.previewURL, h.webformatURL),
        tags: h.tags,
      }));
      cache.set(cacheKey, { at: Date.now(), hits });
      return hits;
    } catch (err) {
      if (opts.signal?.aborted) throw new DOMException('Annulé', 'AbortError');
      // erreur de configuration (clé refusée...) : inutile de réessayer
      if (err instanceof PixabayError && err.kind === 'config') throw err;
      lastError = err instanceof PixabayError ? err : new PixabayError('Connexion impossible à Pixabay.', 'network');
      await sleep(1000 * (attempt + 1), opts.signal);
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
    }
  }
  throw lastError;
}

/** Essaie les requêtes dans l'ordre jusqu'à obtenir au moins un résultat. */
export async function searchWithFallback(queries: string[], kind: ImageKind, opts: SearchOptions = {}): Promise<SearchResult> {
  let last: SearchResult = { query: queries[0] ?? '', hits: [] };
  for (const q of queries) {
    const hits = await searchPixabay(q, kind, opts);
    last = { query: q, hits };
    if (hits.length > 0) return last;
  }
  return last;
}
