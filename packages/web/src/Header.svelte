<script lang="ts">
  import type { Owner } from '@blogit/core';
  import { t } from './lib/i18n.svelte';

  // user と onSignOut はアプリの画面だけで渡す（静的ページではロゴとテーマの切り替えのみ）
  let { user, onSignOut }: { user?: Owner; onSignOut?: () => void } = $props();

  function toggleTheme() {
    const dark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {}
  }
</script>

<header class="header">
  <div class="header-inner">
    <a class="logo" href="./">Blogit</a>
    <div class="header-actions">
      {#if user && onSignOut}
        <img class="avatar" src={user.avatarUrl} alt={user.login} title={user.login} />
        <button class="icon-button" type="button" onclick={onSignOut} aria-label={t('logout')} title={t('logout')}>
          <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
        </button>
      {/if}
      <button class="icon-button" type="button" onclick={toggleTheme} aria-label={t('toggleTheme')} title={t('toggleTheme')}>
        <i class="fa-solid fa-moon" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</header>
