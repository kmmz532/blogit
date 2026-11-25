import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// GitHub Pages のサブパス（/blogit/）でも動くように相対パスで出力する
export default defineConfig({
  base: './',
  plugins: [svelte()],
});
