const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** « Créée il y a 20 heures », « Créée à l'instant »… (français, comme Quizlet). */
export function formatCreatedFr(iso: string, now: number = Date.now()): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  const diff = Math.max(0, now - time);
  const plural = (n: number, unit: string, pluralUnit = `${unit}s`) => `${n} ${n > 1 ? pluralUnit : unit}`;

  if (diff < MINUTE) return "Créée à l'instant";
  if (diff < HOUR) return `Créée il y a ${plural(Math.floor(diff / MINUTE), 'minute')}`;
  if (diff < DAY) return `Créée il y a ${plural(Math.floor(diff / HOUR), 'heure')}`;
  if (diff < 30 * DAY) return `Créée il y a ${plural(Math.floor(diff / DAY), 'jour')}`;
  if (diff < 365 * DAY) return `Créée il y a ${Math.floor(diff / (30 * DAY))} mois`;
  return `Créée il y a ${plural(Math.floor(diff / (365 * DAY)), 'an')}`;
}
