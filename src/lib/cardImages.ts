// Copie permanente des images de cartes sur NOTRE stockage Supabase (bucket public
// « card-images »). Une image n'est jamais servie depuis un site tiers : elle est
// téléchargée, retaillée (800 px max, JPEG), envoyée, puis l'URL publique est enregistrée.
import { getSupabaseClient } from '@/lib/supabase';
import { updateCardImage } from '@/lib/vocabApi';

export const IMAGE_BUCKET = 'card-images';
const MAX_SIDE = 800;
const JPEG_QUALITY = 0.82;
const MAX_BYTES = 1024 * 1024; // limite du bucket
const PUBLIC_MARKER = `/storage/v1/object/public/${IMAGE_BUCKET}/`;

export class ImageSaveError extends Error {
  readonly step: 'download' | 'process' | 'upload' | 'database';
  constructor(message: string, step: ImageSaveError['step']) {
    super(message);
    this.step = step;
  }
}

/** Vrai si l'URL pointe vers notre propre stockage (donc permanente). */
export function isOwnImage(url: string | null | undefined): boolean {
  return Boolean(url && url.includes(PUBLIC_MARKER));
}

/** Chemin de l'objet dans le bucket, ou null si l'URL n'est pas la nôtre. */
export function storagePathFromUrl(url: string): string | null {
  const i = url.indexOf(PUBLIC_MARKER);
  return i === -1 ? null : decodeURIComponent(url.slice(i + PUBLIC_MARKER.length).split('?')[0]);
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Télécharge la première URL qui répond avec une vraie image. */
export async function downloadImage(urls: string[]): Promise<Blob> {
  let lastMessage = 'Aucune URL fournie.';
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, 20000);
      if (!res.ok) {
        lastMessage = `Téléchargement refusé (${res.status}).`;
        continue;
      }
      const blob = await res.blob();
      if (!blob.type.startsWith('image/') || blob.size === 0) {
        lastMessage = 'Le fichier reçu n’est pas une image.';
        continue;
      }
      return blob;
    } catch {
      lastMessage = 'Téléchargement impossible (réseau).';
    }
  }
  throw new ImageSaveError(lastMessage, 'download');
}

/** Retaille en JPEG (800 px max). Repli : l'original s'il est déjà assez léger. */
export async function toJpeg(blob: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas indisponible');
    ctx.fillStyle = '#ffffff'; // fond blanc pour les PNG transparents
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!out) throw new Error('encodage impossible');
    return out;
  } catch {
    if (blob.size <= MAX_BYTES && /^image\/(jpeg|png|webp)$/.test(blob.type)) return blob;
    throw new ImageSaveError('Image illisible ou trop lourde.', 'process');
  }
}

/**
 * Enregistre une image pour une carte : téléchargement → retaille → envoi → base de données.
 * En cas d'échec après l'envoi, le fichier orphelin est supprimé. L'ancienne image (si elle
 * était sur notre stockage) est supprimée une fois la nouvelle en place.
 */
export async function saveCardImage(card: { id: string; image_url: string | null }, urls: string[]): Promise<string> {
  const source = await downloadImage(urls);
  const jpeg = await toJpeg(source);
  if (jpeg.size > MAX_BYTES) throw new ImageSaveError('Image trop lourde après compression.', 'process');

  const supabase = getSupabaseClient();
  const contentType = jpeg.type || 'image/jpeg';
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${card.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, jpeg, { contentType, cacheControl: '31536000', upsert: false });
  if (uploadError) throw new ImageSaveError(`Envoi impossible : ${uploadError.message}`, 'upload');

  const publicUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  try {
    await updateCardImage(card.id, publicUrl);
  } catch {
    await supabase.storage.from(IMAGE_BUCKET).remove([path]).catch(() => undefined);
    throw new ImageSaveError('Enregistrement sur la carte impossible.', 'database');
  }

  const previous = card.image_url ? storagePathFromUrl(card.image_url) : null;
  if (previous) await supabase.storage.from(IMAGE_BUCKET).remove([previous]).catch(() => undefined);
  return publicUrl;
}

/** Retire l'image d'une carte (et le fichier s'il est sur notre stockage). */
export async function removeCardImage(card: { id: string; image_url: string | null }): Promise<void> {
  await updateCardImage(card.id, null);
  const path = card.image_url ? storagePathFromUrl(card.image_url) : null;
  if (path) await getSupabaseClient().storage.from(IMAGE_BUCKET).remove([path]).catch(() => undefined);
}

/**
 * Cartes qui ont besoin d'une image : sans image, ou dont l'image n'est pas sur notre
 * propre stockage (les liens externes, Pixabay en tête, finissent par mourir).
 */
export function cardsNeedingImage<T extends { image_url: string | null }>(cards: T[]): T[] {
  return cards.filter((c) => !isOwnImage(c.image_url));
}
