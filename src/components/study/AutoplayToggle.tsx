import { Volume2, VolumeOff } from 'lucide-react';

interface AutoplayToggleProps {
  on: boolean;
  onToggle: () => void;
}

export default function AutoplayToggle({ on, onToggle }: AutoplayToggleProps) {
  const label = on ? 'Désactiver la lecture automatique du son' : 'Activer la lecture automatique du son';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 ${on ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
    >
      {on ? <Volume2 className="h-5 w-5" /> : <VolumeOff className="h-5 w-5" />}
    </button>
  );
}
