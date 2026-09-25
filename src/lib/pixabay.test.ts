import { describe, expect, it } from 'vitest';
import { buildQueries, cleanTerm, downloadUrlsFrom, keywordsFrom } from './pixabay';

describe('cleanTerm', () => {
  it('garde la première alternative et retire parenthèses et points', () => {
    expect(cleanTerm('à côté du/près du')).toBe('à côté du');
    expect(cleanTerm('Tourner (=turn) ................')).toBe('tourner');
    expect(cleanTerm('  Les   mains, les bras ')).toBe('les mains');
  });
  it('limite la longueur', () => {
    expect(cleanTerm('a'.repeat(300)).length).toBe(100);
  });
});

describe('keywordsFrom', () => {
  it('extrait les mots porteurs de sens', () => {
    expect(keywordsFrom('La balle est ............ le cube.')).toEqual(['balle', 'cube']);
  });
});

describe('buildQueries', () => {
  it('privilégie la définition pour un mot-outil', () => {
    expect(buildQueries({ term: 'sur', definition: 'La balle est ...... le cube.' })).toEqual(['balle cube', 'sur']);
  });
  it('privilégie le terme pour un nom', () => {
    expect(buildQueries({ term: 'chat', definition: 'Un animal domestique' })).toEqual(['chat', 'animal domestique']);
  });
  it('ne renvoie rien de vide', () => {
    expect(buildQueries({ term: '...', definition: '' })).toEqual([]);
  });
});

describe('downloadUrlsFrom', () => {
  it('dérive les tailles CDN et garde l’aperçu en dernier recours', () => {
    const urls = downloadUrlsFrom('https://cdn.pixabay.com/photo/a/cat-1_150.jpg');
    expect(urls[0]).toContain('_640.jpg');
    expect(urls[1]).toContain('_1280.jpg');
    expect(urls[urls.length - 1]).toContain('_150.jpg');
  });
});
