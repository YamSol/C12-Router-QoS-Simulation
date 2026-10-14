import { defineConfig } from 'vite';

// SharedArrayBuffer só existe em páginas "cross-origin isolated",
// o que exige estes dois headers no servidor de dev e no preview.
const isolamento = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  server: { headers: isolamento },
  preview: { headers: isolamento },
});
