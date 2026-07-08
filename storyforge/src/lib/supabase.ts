"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/** Returns a Supabase client, or null when the env isn't configured (demo mode). */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export const supabaseEnabled = (): boolean => getSupabase() !== null;

/*
 * Expected schema (run in the Supabase SQL editor):
 *
 *   create table stories (
 *     id text primary key,
 *     user_id uuid references auth.users not null default auth.uid(),
 *     data jsonb not null,
 *     updated_at timestamptz not null default now()
 *   );
 *   alter table stories enable row level security;
 *   create policy "own stories" on stories
 *     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 */

export async function syncStoryUp(id: string, data: unknown): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data: session } = await sb.auth.getSession();
  if (!session.session) return;
  await sb.from("stories").upsert({ id, data, updated_at: new Date().toISOString() });
}

export async function deleteStoryRemote(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data: session } = await sb.auth.getSession();
  if (!session.session) return;
  await sb.from("stories").delete().eq("id", id);
}

export async function fetchRemoteStories(): Promise<unknown[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: session } = await sb.auth.getSession();
  if (!session.session) return [];
  const { data } = await sb.from("stories").select("data");
  return (data ?? []).map((row) => row.data);
}
