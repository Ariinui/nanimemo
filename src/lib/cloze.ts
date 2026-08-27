import type { ImportResult, ParsedRow } from './import';

const BLANK = '_____';
const MIN_WORD_LENGTH = 4;
const WORD_RE = /[\p{L}ʻ'’-]+/gu;

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function pickWord(sentence: string): string | null {
  const words = sentence.match(WORD_RE) ?? [];
  const candidates = words.filter((w) => w.length >= MIN_WORD_LENGTH);
  if (candidates.length === 0) return null;
  return candidates.reduce((longest, w) => (w.length > longest.length ? w : longest));
}

function blankOut(sentence: string, word: string): string {
  const idx = sentence.indexOf(word);
  if (idx === -1) return sentence;
  return sentence.slice(0, idx) + BLANK + sentence.slice(idx + word.length);
}

export function parseCloze(text: string): ImportResult {
  const sentences = splitSentences(text);

  const rows: ParsedRow[] = sentences.map((raw) => {
    const word = pickWord(raw);
    if (!word) {
      return { raw, term: '', definition: raw, status: 'no-word', duplicate: false };
    }
    return { raw, term: word, definition: blankOut(raw, word), status: 'valid', duplicate: false };
  });

  const seenTerms = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== 'valid') continue;
    const key = row.term.toLowerCase();
    const prevCount = seenTerms.get(key) ?? 0;
    if (prevCount > 0) row.duplicate = true;
    seenTerms.set(key, prevCount + 1);
  }

  const validCount = rows.filter((r) => r.status === 'valid').length;
  const issueCount = rows.length - validCount;
  const duplicateCount = rows.filter((r) => r.duplicate).length;

  return { rows, validCount, issueCount, duplicateCount };
}
