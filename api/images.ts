import type { VercelRequest, VercelResponse } from '@vercel/node';

interface PixabayHit {
  id: number;
  previewURL: string;
  webformatURL: string;
  tags: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query) {
    res.status(400).json({ error: 'Paramètre q manquant' });
    return;
  }

  const apiKey = process.env.PIXABAY_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({ error: 'Pixabay non configuré (PIXABAY_API_KEY manquante)' });
    return;
  }

  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&safesearch=true&per_page=12`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(502).json({ error: 'Erreur Pixabay' });
      return;
    }
    const data = (await response.json()) as { hits: PixabayHit[] };
    const images = (data.hits ?? []).map((hit) => ({
      id: hit.id,
      previewUrl: hit.previewURL,
      fullUrl: hit.webformatURL,
      tags: hit.tags,
    }));
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).json({ images });
  } catch {
    res.status(502).json({ error: 'Erreur réseau vers Pixabay' });
  }
}
