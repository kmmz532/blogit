<script lang="ts">
  import type { Snippet } from 'svelte';
  import Footer from './Footer.svelte';
  import Header from './Header.svelte';

  // About・利用規約・プライバシーポリシーなどの静的ページの枠
  let { title, updated, children }: { title: string; updated?: string; children: Snippet } = $props();

  $effect(() => {
    document.title = `${title} - Blogit`;
  });
</script>

<Header />
<main class="main">
  <h1 class="page-title">{title}</h1>
  {#if updated}<p class="lead">最終更新日: {updated}</p>{/if}
  <article class="doc">
    {@render children()}
  </article>
</main>
<Footer />
