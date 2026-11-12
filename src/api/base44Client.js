// Backward-compatibility facade: Re-exports the native Supabase Tiva client.
// All application queries and entities run directly against Supabase (PostgreSQL).
export { tiva, tivaClient, supabaseClient, base44 } from './tivaClient.js';
export { base44 as default } from './tivaClient.js';
