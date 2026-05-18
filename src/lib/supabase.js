import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://altjgoqaiyquijlcoiym.supabase.co";

const supabaseAnonKey =
  "sb_publishable_UvMYWI90wpMedcFDRKWQDQ_2TIYhQcb";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);