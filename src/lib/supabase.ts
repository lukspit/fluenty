import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

if (supabaseUrl === "https://placeholder.supabase.co" || supabaseKey === "placeholder-key") {
  console.warn("Aviso: SUPABASE_URL ou chaves de API não configuradas no .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
