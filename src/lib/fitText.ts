// Taille de texte adaptée à la longueur : grand pour un mot, réduite pour une phrase,
// afin que le contenu reste entièrement visible dans la carte sans défilement.
export function fitTextClass(text: string): string {
  const len = text.length;
  if (len > 140) return 'text-lg';
  if (len > 80) return 'text-xl';
  if (len > 45) return 'text-2xl';
  if (len > 20) return 'text-3xl';
  return 'text-4xl';
}
