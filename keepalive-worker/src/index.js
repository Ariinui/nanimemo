// Requête réelle sur la base Supabase chaque jour : évite la mise en pause du projet gratuit.
// Secrets attendus : SUPABASE_URL, SUPABASE_KEY (clé publique, la même que côté client).
async function ping(env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/vocab_sets?select=id&limit=1`, {
    headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${env.SUPABASE_KEY}` },
  });
  const rows = res.ok ? await res.json() : [];
  const ok = res.ok && Array.isArray(rows) && rows.length > 0;
  return { ok, status: res.status, at: new Date().toISOString() };
}

export default {
  async scheduled(_event, env) {
    const r = await ping(env);
    console.log(JSON.stringify(r));
    if (!r.ok) throw new Error(`Supabase ne répond pas correctement (HTTP ${r.status})`);
  },
  async fetch(_req, env) {
    const r = await ping(env);
    return new Response(JSON.stringify(r), { status: r.ok ? 200 : 502, headers: { 'content-type': 'application/json' } });
  },
};
