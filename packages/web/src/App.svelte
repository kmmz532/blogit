<script lang="ts">
  import { GitHubClient, type BlogConfig, type Owner } from '@blogit/core';
  import { onMount } from 'svelte';
  import { clearToken, completeOAuth, loadToken } from './lib/auth';
  import { clearCloudflareToken, CloudflareClient, completeCloudflareOAuth, loadCloudflareToken, startCloudflareOAuth, type CloudflareAccount } from './lib/cloudflare';
  import Login from './Login.svelte';
  import Progress from './Progress.svelte';
  import SetupForm from './SetupForm.svelte';

  let gh = $state<GitHubClient | null>(null);
  let owners = $state<Owner[]>([]);
  let config = $state<BlogConfig | null>(null);
  let cloudflareAccounts = $state<CloudflareAccount[]>([]);
  let cloudflareConnected = $state(false);
  let cloudflareError = $state('');
  let loading = $state(true);
  let loginError = $state('');

  async function signIn(token: string) {
    const client = new GitHubClient(token);
    owners = await client.listOwners();
    gh = client;
  }

  async function connectCloudflare() {
    cloudflareError = '';
    await startCloudflareOAuth();
  }

  async function loadCloudflare(token: string) {
    const client = new CloudflareClient(token);
    cloudflareAccounts = await client.listAccounts();
    cloudflareConnected = true;
  }

  onMount(async () => {
    try {
      const cfToken = await completeCloudflareOAuth();
      const savedCfToken = cfToken ?? loadCloudflareToken();
      if (savedCfToken) await loadCloudflare(savedCfToken);
    } catch (e) {
      cloudflareError = e instanceof Error ? e.message : String(e);
    }

    try {
      const token = (await completeOAuth()) ?? loadToken();
      if (token) await signIn(token);
    } catch (e) {
      clearToken();
      loginError = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  });

  function signOut() {
    clearToken();
    clearCloudflareToken();
    gh = null;
    owners = [];
    config = null;
    cloudflareAccounts = [];
    cloudflareConnected = false;
  }

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
      {#if owners[0]}
        <img class="avatar" src={owners[0].avatarUrl} alt="" />
        <span>{owners[0].login}</span>
        <button class="icon-button" type="button" onclick={signOut} aria-label="ログアウト" title="ログアウト">
          <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
        </button>
      {/if}
      <button class="icon-button" type="button" onclick={toggleTheme} aria-label="ダークモードを切り替える" title="ダークモードを切り替える">
        <i class="fa-solid fa-moon" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</header>

<main class="main">
  {#if loading}
    <p class="lead">読み込み中…</p>
  {:else if !gh}
    <Login onSignIn={signIn} error={loginError} />
  {:else if !config}
    <SetupForm {gh} {owners} {cloudflareAccounts} {cloudflareConnected} {cloudflareError} onConnectCloudflare={connectCloudflare} onSubmit={(c) => (config = c)} />
  {:else}
    <Progress {gh} {config} onBack={() => (config = null)} />
  {/if}
</main>

<footer class="footer">
  <a href="https://github.com/kmmz532/blogit">Blogit</a> — Hugo + hugo-gh-admin + GitHub Pages / Cloudflare Pages
</footer>
