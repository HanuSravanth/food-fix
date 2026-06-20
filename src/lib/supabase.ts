import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get initial values from environment variables or localStorage
let supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || localStorage.getItem('foodfix_supabase_url') || '';
let supabasePublishableKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('foodfix_supabase_publishable_key') || localStorage.getItem('foodfix_supabase_anon_key') || '';

let supabaseClient: SupabaseClient | null = null;

// Initialize if both values are available
if (supabaseUrl && supabasePublishableKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabasePublishableKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

export function getSupabase(): SupabaseClient | null {
  return supabaseClient;
}

export function getSupabaseConfig() {
  return {
    url: supabaseUrl,
    publishableKey: supabasePublishableKey,
    isConfigured: !!supabaseClient
  };
}

export function saveConnectionConfig(url: string, publishableKey: string): boolean {
  if (!url || !publishableKey) {
    localStorage.removeItem('foodfix_supabase_url');
    localStorage.removeItem('foodfix_supabase_publishable_key');
    localStorage.removeItem('foodfix_supabase_anon_key');
    supabaseUrl = '';
    supabasePublishableKey = '';
    supabaseClient = null;
    return false;
  }

  try {
    const trimmedUrl = url.trim();
    const trimmedKey = publishableKey.trim();
    
    const newClient = createClient(trimmedUrl, trimmedKey);
    
    // Store in localStorage for persistence
    localStorage.setItem('foodfix_supabase_url', trimmedUrl);
    localStorage.setItem('foodfix_supabase_publishable_key', trimmedKey);
    localStorage.removeItem('foodfix_supabase_anon_key'); // Clean up any old keys
    
    supabaseUrl = trimmedUrl;
    supabasePublishableKey = trimmedKey;
    supabaseClient = newClient;
    return true;
  } catch (error) {
    console.error('Failed to initialize Supabase with provided credentials:', error);
    return false;
  }
}
