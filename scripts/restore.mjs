// Restauration depuis un dossier créé par backup.mjs. Non destructive : « upsert » par id
// (lignes existantes mises à jour, rien n'est supprimé) ; une image n'est renvoyée que si
// elle manque ou diffère. Vérifie chaque image (HTTP 200 + empreinte SHA-256).
// Usage : SUPABASE_URL=… SUPABASE_KEY=… node scripts/restore.mjs <dossier>
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;
const dir = process.argv[2] || 'backup';
if (!URL_ || !KEY) throw new Error('SUPABASE_URL et SUPABASE_KEY requis');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

// Ordre imposé par les clés étrangères : sets → cards → progress.
for (const t of ['vocab_sets', 'vocab_cards', 'vocab_progress']) {
  const rows = JSON.parse(await readFile(join(dir, `${t}.json`), 'utf8'));
  for (let i = 0; i < rows.length; i += 200) {
    const r = await fetch(`${URL_}/rest/v1/${t}`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 200)),
    });
    if (!r.ok) throw new Error(`${t} : HTTP ${r.status} ${await r.text()}`);
  }
  console.log(`${t} : ${rows.length} lignes restaurées`);
}

let bad = 0;
const publicSha = async (p) => {
  const r = await fetch(`${URL_}/storage/v1/object/public/card-images/${enc(p)}?cb=${Date.now()}`);
  return r.ok ? createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex') : '';
};
for (const [p, meta] of Object.entries(manifest.images)) {
  // Déjà présente et identique : rien à faire (le bucket n'autorise pas l'écrasement).
  if ((await publicSha(p)) !== meta.sha256) {
    // Présente mais altérée : on la supprime pour pouvoir la réenvoyer.
    await fetch(`${URL_}/storage/v1/object/card-images/${enc(p)}`, { method: 'DELETE', headers: H }).catch(() => {});
    const up = await fetch(`${URL_}/storage/v1/object/card-images/${enc(p)}`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': meta.contentType, 'Cache-Control': 'max-age=31536000' },
      body: await readFile(join(dir, 'images', p)),
    });
    if (!up.ok) { console.error(`Envoi refusé ${p} : HTTP ${up.status}`); bad++; continue; }
    if ((await publicSha(p)) !== meta.sha256) { console.error(`Vérification échouée ${p}`); bad++; }
  }
}
console.log(`images : ${Object.keys(manifest.images).length - bad}/${Object.keys(manifest.images).length} restaurées et vérifiées`);
process.exit(bad ? 1 : 0);
