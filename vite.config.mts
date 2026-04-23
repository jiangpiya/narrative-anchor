import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';


const alias = { '@shared': resolve(__dirname, 'src/shared') };

export default defineConfig({
  assetsInclude: ['**/*.mp3'], // 关键：确保 mp3 文件被正确处理
  // 关键：将根目录设为 src/renderer，这样开发服务器入口就是 src/renderer/index.html
  root: resolve(__dirname, 'src/renderer'),
  plugins: [
    vue(),
    electron([
      {
        // 主进程入口：使用绝对路径或相对于项目根目录的路径（不受 root 影响）
        entry: resolve(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist/main'),
            rollupOptions: {
              external: ['electron', 'better-sqlite3', 'electron-store'],
            },
          }, resolve: { alias },
        },
      },
      {
        // 预加载入口
        entry: resolve(__dirname, 'src/preload/index.ts'),
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist/preload'),
            rollupOptions: {
              external: ['electron'],
            },
          }, resolve: { alias },
        },
      },
    ]),
  ],
  resolve: { alias },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
});