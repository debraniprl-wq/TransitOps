import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key') &&
  supabaseUrl.startsWith('http')
);

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!cachedClient && supabaseUrl && supabaseAnonKey) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return cachedClient;
}

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      message: 'Supabase URL or Anon Key is missing or using placeholder values in .env.local',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      message: 'Failed to initialize Supabase client',
    };
  }

  try {
    const { error } = await client.from('vehicles').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        message: 'Connected to Supabase project, but tables are not yet migrated',
        error: error.message,
      };
    }
    return {
      connected: true,
      message: 'Successfully connected to live Supabase database with schema verified',
    };
  } catch (err: unknown) {
    return {
      connected: false,
      message: 'Network error connecting to Supabase',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
