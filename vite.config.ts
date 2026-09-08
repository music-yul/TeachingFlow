import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 단일 HTML 로 빌드한다. 웹에서도 열리고, 파일 하나만 저장하면 오프라인에서도 그대로 쓸 수 있다.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { cssCodeSplit: false, assetsInlineLimit: 100000000 },
})
