import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// GitHub Pages のサブパス（/blogit/）でも動くように相対パスで出力する
export default defineConfig({
  base: './',
  plugins: [svelte()],
  // セットアップのアプリと、About・利用規約・プライバシーポリシーの静的ページ
  build: {
    rollupOptions: {
      input: ['index.html', 'about.html', 'terms.html', 'privacy.html'],
    },
  },
});
