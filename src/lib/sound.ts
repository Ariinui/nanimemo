// Sons de retour (bonne/mauvaise réponse) générés directement en mémoire (Web Audio API),
// pas de fichier audio : fonctionne hors-ligne dans la PWA, poids nul, aucune requête réseau.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    // Web Audio indisponible (très ancien navigateur) — on se tait simplement
    return null;
  }
}

function tone(c: AudioContext, freq: number, startOffset: number, duration: number, peak: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);
  const t0 = c.currentTime + startOffset;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

// Deux notes courtes qui montent (façon petit carillon).
export function playCorrectSound(): void {
  const c = getCtx();
  if (!c) return;
  tone(c, 880, 0, 0.12, 0.2);
  tone(c, 1318.5, 0.09, 0.16, 0.2);
}

// Une seule note grave et brève, discrète.
export function playWrongSound(): void {
  const c = getCtx();
  if (!c) return;
  tone(c, 220, 0, 0.18, 0.15);
}
