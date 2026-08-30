import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⚠️ Replace 'recipe-app' with your actual GitHub repo name before deploying.
  // Keep as '/' while developing locally — it doesn't affect `npm run dev`.
  base: process.env.NODE_ENV === 'production' ? '/recipe-app/' : '/',
})
