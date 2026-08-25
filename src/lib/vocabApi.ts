import { getSupabaseClient } from '@/lib/supabase';
import type { VocabSet, VocabCard, VocabProgress, MasteryBox } from '@/types/vocab';

export async function fetchSets(userId: string): Promise<VocabSet[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vocab_sets')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as VocabSet[];
}

export async function createSet(userId: string, title: string, description: string | null): Promise<VocabSet> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vocab_sets')
    .insert({ user_id: userId, title, description })
    .select()
    .single();
  if (error) throw error;
  return data as VocabSet;
}

export async function deleteSet(setId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('vocab_sets').delete().eq('id', setId);
  if (error) throw error;
}

export async function fetchCards(setId: string): Promise<VocabCard[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vocab_cards')
    .select('*')
    .eq('set_id', setId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data as VocabCard[];
}

export async function insertCards(
  setId: string,
  cards: { term: string; definition: string }[],
  startPosition = 0
): Promise<VocabCard[]> {
  const supabase = getSupabaseClient();
  const rows = cards.map((c, i) => ({
    set_id: setId,
    term: c.term,
    definition: c.definition,
    position: startPosition + i,
  }));
  const { data, error } = await supabase.from('vocab_cards').insert(rows).select();
  if (error) throw error;
  return data as VocabCard[];
}

export async function updateCardImage(cardId: string, imageUrl: string | null): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('vocab_cards').update({ image_url: imageUrl }).eq('id', cardId);
  if (error) throw error;
}

export async function deleteCard(cardId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('vocab_cards').delete().eq('id', cardId);
  if (error) throw error;
}

export async function fetchProgress(userId: string, cardIds: string[]): Promise<Map<string, VocabProgress>> {
  if (cardIds.length === 0) return new Map();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('vocab_progress')
    .select('*')
    .eq('user_id', userId)
    .in('card_id', cardIds);
  if (error) throw error;
  const map = new Map<string, VocabProgress>();
  for (const row of data as VocabProgress[]) map.set(row.card_id, row);
  return map;
}

export async function upsertProgress(
  userId: string,
  cardId: string,
  patch: { box: MasteryBox; correct_count: number; wrong_count: number }
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('vocab_progress').upsert(
    {
      user_id: userId,
      card_id: cardId,
      ...patch,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,card_id' }
  );
  if (error) throw error;
}
