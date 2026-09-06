import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Cliente de servidor. Todo acesso ao Supabase acontece nas rotas /api — nenhum
 * componente de cliente importa este módulo, e as variáveis abaixo não usam o
 * prefixo NEXT_PUBLIC_ justamente para que um import acidental no cliente quebre
 * o build em vez de publicar a credencial no bundle.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL/SUPABASE_SECRET_KEY não configurados em .env.local");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
