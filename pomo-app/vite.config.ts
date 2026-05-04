import { defineConfig } from 'vite';

// Production build serves at jimbo.fourfoldmedia.uk/pomo/ — Caddy maps /pomo*
// to /home/jimbo/pomo/ on the VPS. base must match so asset URLs resolve.
//
// Dev server proxies /api/* to production jimbo-api so we can develop against
// real data with the same basic_auth that gates the dashboard. Set
// JIMBO_BASIC_AUTH=user:pass when running `npm run dev` (mirrors the
// dashboard's scripts/dev.sh pattern).
export default defineConfig({
  base: '/pomo/',
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://jimbo.fourfoldmedia.uk',
        changeOrigin: true,
        secure: true,
        configure(proxy) {
          const auth = process.env['JIMBO_BASIC_AUTH'];
          if (auth) {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Basic ${Buffer.from(auth).toString('base64')}`);
            });
          }
        },
      },
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
