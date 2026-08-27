export type TermDefSeparator = 'tab' | 'comma' | 'custom';
export type CardSeparator = 'newline' | 'semicolon' | 'custom';

export interface ImportSettings {
  termDefSeparator: TermDefSeparator;
  termDefCustom: string;
  cardSeparator: CardSeparator;
  cardCustom: string;
}

export const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  termDefSeparator: 'tab',
  termDefCustom: ' - ',
  cardSeparator: 'newline',
  cardCustom: ';',
};

export type RowStatus = 'valid' | 'no-separator' | 'multiple-separators' | 'empty-field' | 'no-word';

export interface ParsedRow {
  raw: string;
  term: string;
  definition: string;
  status: RowStatus;
  duplicate: boolean;
}

export interface ImportResult {
  rows: ParsedRow[];
  validCount: number;
  issueCount: number;
  duplicateCount: number;
}

function resolveTermDefSep(settings: ImportSettings): string {
  switch (settings.termDefSeparator) {
    case 'tab':
      return '\t';
    case 'comma':
      return ',';
    case 'custom':
      return settings.termDefCustom;
  }
}

function resolveCardSep(settings: ImportSettings): string {
  switch (settings.cardSeparator) {
    case 'newline':
      return '\n';
    case 'semicolon':
      return ';';
    case 'custom':
      return settings.cardCustom;
  }
}

function countOccurrences(line: string, sep: string): number {
  if (!sep) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const found = line.indexOf(sep, idx);
    if (found === -1) break;
    count++;
    idx = found + sep.length;
  }
  return count;
}

function splitLines(text: string, cardSep: string): string[] {
  const rawLines =
    cardSep === '\n' ? text.split(/\r\n|\r|\n/) : text.split(cardSep);
  return rawLines.map((l) => l.trim()).filter((l) => l.length > 0);
}

function parseLine(raw: string, termDefSep: string): ParsedRow {
  if (!termDefSep) {
    return { raw, term: raw, definition: '', status: 'no-separator', duplicate: false };
  }
  const occurrences = countOccurrences(raw, termDefSep);

  if (occurrences === 0) {
    return { raw, term: raw, definition: '', status: 'no-separator', duplicate: false };
  }

  const idx = raw.indexOf(termDefSep);
  const term = raw.slice(0, idx).trim();
  const definition = raw.slice(idx + termDefSep.length).trim();

  if (!term || !definition) {
    return { raw, term, definition, status: 'empty-field', duplicate: false };
  }

  if (occurrences > 1) {
    return { raw, term, definition, status: 'multiple-separators', duplicate: false };
  }

  return { raw, term, definition, status: 'valid', duplicate: false };
}

export function parseImport(text: string, settings: ImportSettings): ImportResult {
  const termDefSep = resolveTermDefSep(settings);
  const cardSep = resolveCardSep(settings);

  const lines = splitLines(text, cardSep);
  const rows = lines.map((line) => parseLine(line, termDefSep));

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

const TERM_DEF_CANDIDATES: { key: TermDefSeparator; custom: string }[] = [
  { key: 'tab', custom: '' },
  { key: 'comma', custom: '' },
  { key: 'custom', custom: ' - ' },
  { key: 'custom', custom: ' = ' },
  { key: 'custom', custom: ':' },
];

const CARD_CANDIDATES: { key: CardSeparator; custom: string }[] = [
  { key: 'newline', custom: '' },
  { key: 'semicolon', custom: '' },
];

export function detectImportSettings(text: string): ImportSettings {
  if (!text.trim()) return DEFAULT_IMPORT_SETTINGS;

  let best: ImportSettings = DEFAULT_IMPORT_SETTINGS;
  let bestScore = -1;

  for (const card of CARD_CANDIDATES) {
    for (const termDef of TERM_DEF_CANDIDATES) {
      const candidate: ImportSettings = {
        termDefSeparator: termDef.key,
        termDefCustom: termDef.custom,
        cardSeparator: card.key,
        cardCustom: card.custom,
      };
      const result = parseImport(text, candidate);
      if (result.rows.length === 0) continue;

      const score = result.validCount - result.issueCount * 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }

  return best;
}
