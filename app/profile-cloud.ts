import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { profileBlocks, type InjectionProfile } from './profile-data.ts';

let client: SupabaseClient | null = null;
export function profileCloudClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://avmbyryyvppqwqpbnjzd.supabase.co';
  // Publishable browser key; access to data still requires the user's session + RLS.
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_NoiRfKnavvio-qFynNeP1A_v7oK9Fa6';
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { storageKey: 'glp1concentration:auth:v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return client;
}

export type CloudProfile = InjectionProfile & { revision: number };

export async function loadCloudProfile(client: SupabaseClient): Promise<CloudProfile> {
  const { data: session, error: authError } = await client.auth.getUser();
  if (authError || !session.user) throw new Error('Sign in again to load your account profile.');
  const { data, error } = await client.from('injection_profiles').select('blocks, updated_at, revision').eq('user_id', session.user.id).maybeSingle();
  if (error) throw new Error('Your account profile could not be loaded. Your browser copy is still available.');
  return data ? { blocks: profileBlocks(data.blocks, true), updatedAt: data.updated_at, revision: data.revision }
    : { blocks: [], updatedAt: '', revision: 0 };
}

export async function saveCloudProfile(client: SupabaseClient, profile: InjectionProfile, revision: number, expectedUserId: string): Promise<CloudProfile> {
  const { data, error } = await client.rpc('save_injection_profile', { p_blocks: profileBlocks(profile.blocks, true), p_revision: revision, p_expected_user_id: expectedUserId });
  if (error) {
    if (error.message.includes('profile_conflict')) throw new Error('This profile changed on another device. Export your current copy, then load the account version before saving again.');
    throw new Error('The profile could not be saved to your account. Your browser copy is still available; please try again.');
  }
  return { blocks: profileBlocks(data.blocks, true), updatedAt: data.updated_at, revision: data.revision };
}
