import { describe, it, expect } from 'vitest';
import { parseCloze } from './cloze';

describe('parseCloze', () => {
  it('splits text into sentences and blanks the longest word in each', () => {
    const text = 'Ua parauapî te taata i te fare. Ua tae mai te mau tamarii i te farii rahi.';
    const result = parseCloze(text);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[0].term).toBe('parauapî');
    expect(result.rows[0].definition).toBe('Ua _____ te taata i te fare.');
  });

  it('flags a sentence with no word long enough to blank', () => {
    const text = 'E ua no.';
    const result = parseCloze(text);
    expect(result.rows[0].status).toBe('no-word');
    expect(result.validCount).toBe(0);
  });

  it('preserves Tahitian diacritics when picking the blanked word', () => {
    const text = "Ua haere te taata i te fenua rahi mātāmua i teie nei.";
    const result = parseCloze(text);
    expect(result.rows[0].term).toBe('mātāmua');
  });

  it('handles multiple sentence terminators and trims whitespace', () => {
    const text = 'Eaha te huru?  Maitai roa!\nUa haere oia i te fare rahi.';
    const result = parseCloze(text);
    expect(result.rows.length).toBe(3);
  });

  it('marks duplicate terms without excluding them', () => {
    const text = 'Ua parauapî te taata. E parauapî tāna i te reo tahiti.';
    const result = parseCloze(text);
    expect(result.rows[0].term).toBe('parauapî');
    expect(result.rows[1].term).toBe('parauapî');
    expect(result.rows[1].duplicate).toBe(true);
  });

  it('ignores empty input', () => {
    const result = parseCloze('   ');
    expect(result.rows.length).toBe(0);
  });

  it('also splits on semicolons, for long compound sentences', () => {
    const text = 'Ua haere oia i te fare rahi ; ua parauapî atu ra oia i te taata.';
    const result = parseCloze(text);
    expect(result.rows.length).toBe(2);
  });
});
