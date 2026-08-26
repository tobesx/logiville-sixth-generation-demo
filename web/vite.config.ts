import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// `shared/` ligt buiten deze Vite-root, dus fs.allow moet een niveau omhoog.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    fs: { allow: ['..'] },
  },
  preview: {
    // Railway serveert via een eigen domein. Vite's preview-server weigert
    // standaard elke Host die hij niet kent (bescherming tegen DNS-rebinding)
    // en geeft dan "Blocked request". Dit zijn statische bestanden van een
    // publieke demo, dus elke host mag.
    allowedHosts: true,
  },
})
