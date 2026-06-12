import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached longest, changes least often
          'vendor-react': ['react', 'react-dom'],
          // Routing
          'vendor-router': ['react-router-dom'],
          // Charts (heavy, only used in Dashboard)
          'vendor-charts': ['recharts'],
          // Video player + its streaming deps (hls, dash) — isolated so other pages don't load it
          'vendor-player': ['react-player'],
        },
      },
    },
    // Raise the warning threshold to 1000kB (charts + player are large)
    chunkSizeWarningLimit: 1000,
  },
})