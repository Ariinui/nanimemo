import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { playCardAudio, stopCardAudio } from '@/lib/audio';

interface AudioButtonProps {
  url: string;
  /** Texte lu, pour le nom accessible du bouton. */
  label: string;
  className?: string;
}

/** Bouton « écouter la prononciation » : icône animée pendant la lecture, message clair en cas d'échec. */
export default function AudioButton({ url, label, className = '' }: AudioButtonProps) {
  const [playing, setPlaying] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopCardAudio();
    };
  }, []);

  const handleClick = () => {
    if (playing) {
      stopCardAudio();
      return;
    }
    setPlaying(true);
    playCardAudio(
      url,
      () => {
        if (mounted.current) setPlaying(false);
      },
      () => toast.error("Audio indisponible pour l'instant. Vérifiez votre connexion."),
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={playing}
      aria-label={`Écouter la prononciation : ${label}`}
      title="Écouter la prononciation"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 ${playing ? 'text-primary' : 'text-foreground/90'} ${className}`}
    >
      {playing ? <LoaderCircle className="h-5 w-5 animate-pulse" /> : <Volume2 className="h-5 w-5" />}
    </button>
  );
}
