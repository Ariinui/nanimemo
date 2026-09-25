// Sauvegarde complète : tables vocab_* (JSON) + fichiers du bucket « card-images ».
// Usage : SUPABASE_URL=… SUPABASE_KEY=… node scripts/backup.mjs <dossier>
// Échoue (code 1) si la base est vide ou si une image référencée est introuvable.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;
const out = process.argv[2] || 'backup';
if (!URL_ || !KEY) throw new Error('SUPABASE_URL et SUPABASE_KEY requis');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const MARKER = '/storage/v1/object/public/card-images/';
const PAGE = 1000;

async function getWithRetry(url, opts = {}) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(60000) });
      if (r.ok) return r;
      last = new Error(`HTTP ${r.status} sur ${url}`);
    } catch (e) { last = e; }
    await new Promise((res) => setTimeout(res, 3000 * (i + 1)));
  }
  throw last;
}

// Pagination explicite : PostgREST plafonne une réponse à 1000 lignes.
async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const r = await getWithRetry(`${URL_}/rest/v1/${table}?select=*&order=id`, {
      headers: { ...H, Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
    });
    const part = await r.json();
    rows.push(...part);
    if (part.length < PAGE) return rows;
  }
}

const tables = {};
for (const t of ['vocab_sets', 'vocab_cards', 'vocab_progress']) {
  tables[t] = await fetchAll(t);
  await mkdir(out, { recursive: true });
  await writeFile(join(out, `${t}.json`), JSON.stringify(tables[t]));
  console.log(`${t} : ${tables[t].length} lignes`);
}
if (tables.vocab_sets.length === 0) { console.error('Base vide : sauvegarde refusée'); process.exit(1); }

const manifest = { createdAt: new Date().toISOString(), tables: {}, images: {} };
for (const [t, rows] of Object.entries(tables)) manifest.tables[t] = rows.length;

const paths = new Set();
for (const c of tables.vocab_cards) {
  const i = c.image_url ? c.image_url.indexOf(MARKER) : -1;
  if (i !== -1) paths.add(decodeURIComponent(c.image_url.slice(i + MARKER.length).split('?')[0]));
}
const missing = [];
for (const p of paths) {
  try {
    const r = await getWithRetry(`${URL_}${MARKER}${p.split('/').map(encodeURIComponent).join('/')}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || '';
    if (!ct.startsWith('image/') || buf.length === 0) throw new Error(`type ${ct}`);
    const file = join(out, 'images', p);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, buf);
    manifest.images[p] = { sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length, contentType: ct };
  } catch (e) { missing.push(`${p} (${e.message})`); }
}
await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
const mb = Object.values(manifest.images).reduce((s, x) => s + x.bytes, 0) / 1048576;
console.log(`images : ${Object.keys(manifest.images).length}/${paths.size} sauvegardées (${mb.toFixed(1)} Mo)`);
if (missing.length) { for (const m of missing) console.error(`::error::Image introuvable : ${m}`); process.exit(1); }
