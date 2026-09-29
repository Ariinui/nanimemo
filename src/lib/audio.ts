// Lecture des prononciations de cartes (fichiers mp3 hébergés, ex. Embark).
// Un seul lecteur partagé : lancer un audio arrête le précédent, jamais de superposition.
let player: HTMLAudioElement | null = null;
let stopCurrent: (() => void) | null = null;

/** Arrête la lecture en cours (changement de carte, fermeture d'un mode). */
export function stopCardAudio(): void {
  stopCurrent?.();
  stopCurrent = null;
  if (player) {
    player.pause();
    player.removeAttribute('src');
    player.load();
  }
}

/**
 * Joue `url`. `onEnd` est appelé quand la lecture se termine, est interrompue ou échoue ;
 * `onError` uniquement en cas d'échec (fichier introuvable, réseau, lecture refusée).
 */
export function playCardAudio(url: string, onEnd: () => void, onError: () => void): void {
  stopCardAudio();
  if (!player) player = new Audio();
  const audio = player;
  audio.preload = 'auto';
  audio.src = url;

  let finished = false;
  const finish = (failed: boolean) => {
    if (finished) return;
    finished = true;
    audio.removeEventListener('ended', onEnded);
    audio.removeEventListener('error', onFail);
    if (stopCurrent === interrupt) stopCurrent = null;
    if (failed) onError();
    onEnd();
  };
  const onEnded = () => finish(false);
  const onFail = () => finish(true);
  const interrupt = () => finish(false);

  audio.addEventListener('ended', onEnded);
  audio.addEventListener('error', onFail);
  stopCurrent = interrupt;
  audio.play().catch((e: unknown) => {
    // Un play() interrompu par un nouvel appel n'est pas une erreur.
    if (e instanceof DOMException && e.name === 'AbortError') return;
    finish(true);
  });
}
