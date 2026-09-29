// Lecture des prononciations de cartes (fichiers mp3 hébergés, ex. Embark).
// Un seul lecteur partagé : lancer un audio arrête le précédent, jamais de superposition.
// L'URL en cours de lecture est un petit état observable, pour que chaque bouton reflète la lecture
// même quand elle est déclenchée ailleurs (lecture automatique).
let player: HTMLAudioElement | null = null;
let playingUrl: string | null = null;
const listeners = new Set<() => void>();

function setPlaying(url: string | null): void {
  if (playingUrl === url) return;
  playingUrl = url;
  listeners.forEach((l) => l());
}

export function subscribeAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlayingUrl(): string | null {
  return playingUrl;
}

/** Arrête la lecture en cours ; si `onlyUrl` est donné, uniquement quand c'est cet audio qui joue. */
export function stopCardAudio(onlyUrl?: string): void {
  if (onlyUrl !== undefined && playingUrl !== onlyUrl) return;
  if (player) {
    player.onended = null;
    player.onerror = null;
    player.pause();
    player.removeAttribute('src');
    player.load();
  }
  setPlaying(null);
}

/** Joue `url`. `onError` n'est appelé qu'en cas d'échec réel (fichier introuvable, réseau, lecture refusée). */
export function playCardAudio(url: string, onError?: () => void): void {
  stopCardAudio();
  if (!player) player = new Audio();
  const audio = player;
  audio.preload = 'auto';
  audio.src = url;
  setPlaying(url);

  const fail = () => {
    if (playingUrl !== url) return;
    setPlaying(null);
    onError?.();
  };
  audio.onended = () => {
    if (playingUrl === url) setPlaying(null);
  };
  audio.onerror = fail;
  audio.play().catch((e: unknown) => {
    // Un play() interrompu par un nouvel appel n'est pas une erreur.
    if (e instanceof DOMException && e.name === 'AbortError') return;
    fail();
  });
}

const AUTOPLAY_KEY = 'nanimemo_audio_autoplay';

export function loadAutoplay(): boolean {
  try {
    return localStorage.getItem(AUTOPLAY_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveAutoplay(on: boolean): void {
  try {
    localStorage.setItem(AUTOPLAY_KEY, on ? '1' : '0');
  } catch {
    // stockage indisponible : le réglage vaut pour la session seulement
  }
}
