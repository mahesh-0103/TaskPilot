import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Since our frontend calls the endpoints directly like `/extract-tasks`
      // we'll just proxy all unrecognized routes or specifically map them
      '/extract-tasks': { target: 'http://localhost:8000', changeOrigin: true },
      '/create-workflow': { target: 'http://localhost:8000', changeOrigin: true },
      '/simulate-delay': { target: 'http://localhost:8000', changeOrigin: true },
      '/self-heal': { target: 'http://localhost:8000', changeOrigin: true },
      '/execute-tasks': { target: 'http://localhost:8000', changeOrigin: true },
      '/logs': { target: 'http://localhost:8000', changeOrigin: true },
      '/tasks': { target: 'http://localhost:8000', changeOrigin: true }
    }
  }
})
