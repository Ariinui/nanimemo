import { useState } from 'react';
import { loadAutoplay, saveAutoplay } from '@/lib/audio';

/** État « lecture automatique » mémorisé sur l'appareil (désactivé par défaut). */
export function useAutoplay(): [boolean, () => void] {
  const [on, setOn] = useState(loadAutoplay);
  const toggle = () =>
    setOn((prev) => {
      saveAutoplay(!prev);
      return !prev;
    });
  return [on, toggle];
}
