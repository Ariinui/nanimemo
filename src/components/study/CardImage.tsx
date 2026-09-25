import { useState } from 'react';

interface CardImageProps {
  src: string | null;
  className?: string;
  /** Rendu de remplacement si l'image est absente ou ne se charge pas (rien par défaut). */
  fallback?: React.ReactNode;
}

// Image de carte : jamais d'icône « image cassée », on bascule sur le rendu de repli.
export default function CardImage({ src, className, fallback = null }: CardImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}
