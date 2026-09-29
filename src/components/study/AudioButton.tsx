import { useEffect, useSyncExternalStore } from 'react';
import { Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { getPlayingUrl, playCardAudio, stopCardAudio, subscribeAudio } from '@/lib/audio';

interface AudioButtonProps {
  url: string;
  /** Texte lu, pour le nom accessible du bouton. */
  label: string;
  className?: string;
}

/** Bouton « écouter la prononciation » : reflète la lecture en cours (même lancée automatiquement), 2e toucher = stop. */
export default function AudioButton({ url, label, className = '' }: AudioButtonProps) {
  const playing = useSyncExternalStore(subscribeAudio, getPlayingUrl) === url;

  // Le bouton disparaît (changement de carte, fermeture) : on coupe son audio, jamais celui d'une autre carte.
  useEffect(() => () => stopCardAudio(url), [url]);

  const handleClick = () => {
    if (playing) {
      stopCardAudio();
      return;
    }
    playCardAudio(url, () => toast.error("Audio indisponible pour l'instant. Vérifiez votre connexion."));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={playing}
      aria-label={`Écouter la prononciation : ${label}`}
      title="Écouter la prononciation"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 ${playing ? 'bg-primary/15 text-primary' : 'text-foreground/90'} ${className}`}
    >
      <Volume2 className={`h-5 w-5 ${playing ? 'animate-pulse' : ''}`} />
    </button>
  );
}
