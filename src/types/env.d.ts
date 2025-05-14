/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ENABLE_ZOOM?: string;
  readonly VITE_ENABLE_NOTIFICATIONS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}