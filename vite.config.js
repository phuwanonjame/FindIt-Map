import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  plugins: [
    react(),
    {
      name: 'seo-public-config',
      apply: 'build',
      generateBundle() {
        const env = loadEnv(mode, process.cwd(), 'VITE_');
        const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
        if (!env.VITE_SUPABASE_URL || !key.startsWith('sb_publishable_')) {
          throw new Error('SEO build requires a Supabase URL and publishable (not secret) key.');
        }
        this.emitFile({
          type: 'asset',
          fileName: 'seo-public-config.json',
          source: JSON.stringify({ url: env.VITE_SUPABASE_URL, key }),
        });
      },
    },
  ]
}));
