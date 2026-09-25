import { useState } from 'react';
import { ImagePlus, Star, Trash2, Volume2 } from 'lucide-react';
import CardImage from '@/components/study/CardImage';
import { canSpeak, speak } from '@/lib/setProgress';
import type { VocabCard } from '@/types/vocab';

interface TermCardProps {
  card: VocabCard;
  starred: boolean;
  editing: boolean;
  /** « Cacher les définitions » : la définition reste masquée tant qu'on ne la touche pas. */
  definitionHidden?: boolean;
  onToggleStar: () => void;
  onChangeImage: () => void;
  onRemoveImage: () => void;
  onDelete: () => void;
}

const iconButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-white/10';

export default function TermCard({ card, starred, editing, definitionHidden = false, onToggleStar, onChangeImage, onRemoveImage, onDelete }: TermCardProps) {
  const [revealed, setRevealed] = useState(false);
  const masked = definitionHidden && !revealed && !editing;

  return (
    <article className="rounded-2xl border bg-card px-4 pb-4 pt-2.5">
      <header className="flex items-start gap-1">
        <h3 className="min-w-0 flex-1 break-words py-2 text-lg font-medium leading-snug">{card.term}</h3>
        {editing ? (
          <>
            <button type="button" className={iconButton} onClick={onChangeImage} aria-label={card.image_url ? "Changer l'image" : 'Ajouter une image'}>
              <ImagePlus className="h-5 w-5" />
            </button>
            <button type="button" className={`${iconButton} text-destructive`} onClick={onDelete} aria-label={`Supprimer la carte ${card.term}`}>
              <Trash2 className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            {canSpeak() && (
              <button type="button" className={iconButton} onClick={() => speak(card.term)} aria-label={`Écouter : ${card.term}`}>
                <Volume2 className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              className={iconButton}
              onClick={onToggleStar}
              aria-pressed={starred}
              aria-label={starred ? 'Retirer des étoilés' : 'Ajouter aux étoilés'}
            >
              <Star className={`h-5 w-5 ${starred ? 'fill-warning text-warning' : ''}`} />
            </button>
          </>
        )}
      </header>

      {card.image_url && (
        <div className="relative my-2 flex justify-center">
          <CardImage src={card.image_url} className="max-h-72 max-w-full rounded-md object-contain" />
          {editing && (
            <button
              type="button"
              onClick={onRemoveImage}
              className="absolute bottom-2 right-2 min-h-11 rounded-full bg-background/85 px-4 text-sm font-semibold backdrop-blur"
            >
              Retirer l'image
            </button>
          )}
        </div>
      )}

      {masked ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className={`flex min-h-12 w-full items-center justify-center rounded-xl border border-dashed text-base font-medium text-muted-foreground transition-colors hover:bg-white/5 ${card.image_url ? 'mt-3' : 'mt-2'}`}
        >
          Toucher pour afficher la définition
        </button>
      ) : (
        <p className={`break-words text-lg leading-snug text-foreground/95 ${card.image_url ? 'mt-3' : 'mt-2'}`}>{card.definition}</p>
      )}
    </article>
  );
}
