// Fichiers du bucket « card-images » que plus aucune carte n'utilise (« orphelins »).
// Usage : SUPABASE_URL=… SUPABASE_KEY=… node scripts/orphans.mjs           → liste seulement
//         SUPABASE_URL=… SUPABASE_KEY=… node scripts/orphans.mjs --apply   → supprime ceux de plus de 24 h
// Un fichier récent n'est jamais supprimé : il peut être en cours d'enregistrement sur une carte.
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;
if (!URL_ || !KEY) throw new Error('SUPABASE_URL et SUPABASE_KEY requis');
const apply = process.argv.includes('--apply');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const MIN_AGE_MS = 24 * 3600 * 1000;

async function list(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${URL_}/storage/v1/object/list/card-images`, { method: 'POST', headers: H, body: JSON.stringify({ prefix, limit: 1000, offset }) });
    if (!r.ok) throw new Error(`Liste impossible (${r.status})`);
    const part = await r.json();
    out.push(...part);
    if (part.length < 1000) return out;
  }
}

const cards = await (await fetch(`${URL_}/rest/v1/vocab_cards?select=image_url&image_url=not.is.null&limit=100000`, { headers: H })).json();
if (!Array.isArray(cards)) throw new Error('Lecture des cartes impossible');
const used = new Set(cards.map((c) => decodeURIComponent(c.image_url.split('/card-images/')[1]?.split('?')[0] ?? '')));

const orphans = [];
for (const folder of await list('')) {
  for (const f of await list(folder.name)) {
    const path = `${folder.name}/${f.name}`;
    if (!used.has(path)) orphans.push({ path, kb: Math.round((f.metadata?.size ?? 0) / 1024), age: Date.now() - new Date(f.created_at).getTime() });
  }
}
console.log(`${orphans.length} fichier(s) orphelin(s)`);
let removed = 0;
for (const o of orphans) {
  const old = o.age >= MIN_AGE_MS;
  console.log(` - ${o.path} (${o.kb} Ko, ${(o.age / 3600000).toFixed(1)} h)${old ? '' : ' [trop récent : conservé]'}`);
  if (apply && old) {
    const r = await fetch(`${URL_}/storage/v1/object/card-images/${o.path}`, { method: 'DELETE', headers: H });
    if (r.ok) removed++; else console.log(`   suppression refusée (${r.status})`);
  }
}
if (apply) console.log(`${removed} fichier(s) supprimé(s)`);
if (orphans.length > 0 && !apply) console.log(`::warning::${orphans.length} image(s) orpheline(s) dans le stockage (voir la liste ci-dessus).`);
