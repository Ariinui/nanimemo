import { describe, expect, it } from 'vitest';
import { formatCreatedFr } from './relativeTime';

const NOW = Date.parse('2026-09-25T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('formatCreatedFr', () => {
  it('gère les unités et le pluriel', () => {
    expect(formatCreatedFr(ago(10_000), NOW)).toBe("Créée à l'instant");
    expect(formatCreatedFr(ago(60_000), NOW)).toBe('Créée il y a 1 minute');
    expect(formatCreatedFr(ago(5 * 60_000), NOW)).toBe('Créée il y a 5 minutes');
    expect(formatCreatedFr(ago(20 * 3_600_000), NOW)).toBe('Créée il y a 20 heures');
    expect(formatCreatedFr(ago(24 * 3_600_000), NOW)).toBe('Créée il y a 1 jour');
    expect(formatCreatedFr(ago(3 * 86_400_000), NOW)).toBe('Créée il y a 3 jours');
    expect(formatCreatedFr(ago(60 * 86_400_000), NOW)).toBe('Créée il y a 2 mois');
    expect(formatCreatedFr(ago(800 * 86_400_000), NOW)).toBe('Créée il y a 2 ans');
  });
  it('ignore une date invalide', () => {
    expect(formatCreatedFr('nope', NOW)).toBe('');
  });
});
