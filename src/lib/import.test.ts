import { describe, it, expect } from 'vitest';
import { parseImport, detectImportSettings, DEFAULT_IMPORT_SETTINGS } from './import';

describe('parseImport', () => {
  it('parses tab-separated lines by default', () => {
    const text = 'selon\tMANIÈRE (comment ?)\ndevant\tLIEU (où ?)';
    const result = parseImport(text, DEFAULT_IMPORT_SETTINGS);
    expect(result.validCount).toBe(2);
    expect(result.rows[0]).toMatchObject({ term: 'selon', definition: 'MANIÈRE (comment ?)', status: 'valid' });
  });

  it('parses comma separator', () => {
    const text = 'chat, cat\nchien, dog';
    const result = parseImport(text, {
      termDefSeparator: 'comma',
      termDefCustom: '',
      cardSeparator: 'newline',
      cardCustom: '',
    });
    expect(result.validCount).toBe(2);
  });

  it('parses custom separators for both term/def and cards', () => {
    const text = 'chat - cat; chien - dog';
    const result = parseImport(text, {
      termDefSeparator: 'custom',
      termDefCustom: ' - ',
      cardSeparator: 'custom',
      cardCustom: ';',
    });
    expect(result.validCount).toBe(2);
    expect(result.rows[1].term).toBe('chien');
  });

  it('ignores empty lines', () => {
    const text = 'a\tb\n\n\nc\td';
    const result = parseImport(text, DEFAULT_IMPORT_SETTINGS);
    expect(result.rows.length).toBe(2);
  });

  it('flags a line with no separator', () => {
    const text = 'juste un mot sans separateur';
    const result = parseImport(text, DEFAULT_IMPORT_SETTINGS);
    expect(result.rows[0].status).toBe('no-separator');
    expect(result.validCount).toBe(0);
  });

  it('flags a line with more than one separator', () => {
    const text = 'a\tb\tc';
    const result = parseImport(text, DEFAULT_IMPORT_SETTINGS);
    expect(result.rows[0].status).toBe('multiple-separators');
  });

  it('marks duplicate terms without excluding them', () => {
    const text = 'a\tb\na\tc';
    const result = parseImport(text, DEFAULT_IMPORT_SETTINGS);
    expect(result.validCount).toBe(2);
    expect(result.rows[1].duplicate).toBe(true);
  });

  it('preserves Tahitian diacritics (ʻokina and macrons)', () => {
    const text = "ʻua'a\tracine\nfenua\tterre, pays\nāēīōū\ttest";
    const result = parseImport(text, DEFAULT_IMPORT_SETTINGS);
    expect(result.rows[0].term).toBe("ʻua'a");
    expect(result.rows[2].term).toBe('āēīōū');
  });

  it('detects the real "prépositions" set format automatically', () => {
    const text = [
      'selon\tMANIÈRE (comment ?)',
      'devant\tLIEU (où ?)',
      'pendant\tTEMPS (quand ?)',
      'contre\tOPPOSITION / EXCEPTION',
      'dans\tLIEU (où ?)',
    ].join('\n');
    const settings = detectImportSettings(text);
    expect(settings.termDefSeparator).toBe('tab');
    expect(settings.cardSeparator).toBe('newline');
    const result = parseImport(text, settings);
    expect(result.validCount).toBe(5);
  });
});
