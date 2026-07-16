import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 특산물 마블 — 퀴즈타운 안에서 소스 관리용 설정.
// npm run build 하면 결과가 바로 ../public/marble/ 로 나가서
// firebase deploy 만 하면 반영된다. (base './' → /marble/ 경로에서 동작)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../public/marble',
    emptyOutDir: true,
  },
})
