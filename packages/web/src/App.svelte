<script lang="ts">
  import { GitHubClient, GitLabClient, type BlogConfig, type DeploymentProvider, type Owner } from '@blogit/core';
  import { onMount } from 'svelte';
  import { clearToken, completeOAuth, loadToken } from './lib/auth';
  import { clearGitLab, completeGitLabOAuth, loadGitLab } from './lib/gitlab';
  import { clearCloudflareToken, CloudflareClient, completeCloudflareOAuth, loadCloudflareToken, startCloudflareOAuth, type CloudflareAccount } from './lib/cloudflare';
  import Login from './Login.svelte';
  import Progress from './Progress.svelte';
  import SetupForm from './SetupForm.svelte';

  let gh = $state<GitHubClient | null>(null);
  let gl = $state<GitLabClient | null>(null);
  let owners = $state<Owner[]>([]);
  let config = $state<BlogConfig | null>(null);
  let cloudflareAccounts = $state<CloudflareAccount[]>([]);
  let cloudflareConnected = $state(false);
  let selectedCloudflareAccountId = $state('');
  let selectedProvider = $state<DeploymentProvider>('github-pages');
  let cloudflareError = $state('');
  let loading = $state(true);
  let loginError = $state('');

  async function signIn(token: string) {
    const client = new GitHubClient(token);
    owners = await client.listOwners();
    gh = client;
  }

  async function signInGitLab(url: string, token: string) {
    const client = new GitLabClient(url, token);
    owners = await client.listOwners();
    gl = client;
    selectedProvider = 'gitlab-pages';
  }

  async function connectCloudflare() {
    cloudflareError = '';
    sessionStorage.setItem('blogit:deployment-provider', 'cloudflare-pages');
    await startCloudflareOAuth();
  }

  async function loadCloudflare(token: string) {
    const client = new CloudflareClient(token);
    cloudflareAccounts = await client.listAccounts();
    if (!cloudflareAccounts.some((account) => account.id === selectedCloudflareAccountId)) {
      selectedCloudflareAccountId = cloudflareAccounts[0]?.id ?? '';
    }
    cloudflareConnected = true;
  }

  function selectProvider(provider: DeploymentProvider) {
    selectedProvider = provider;
    try {
      sessionStorage.setItem('blogit:deployment-provider', provider);
    } catch {}
  }

  onMount(async () => {
    try {
      selectedProvider = sessionStorage.getItem('blogit:deployment-provider') === 'cloudflare-pages'
        ? 'cloudflare-pages'
        : 'github-pages';
      const cfToken = await completeCloudflareOAuth();
      const savedCfToken = cfToken ?? loadCloudflareToken();
      if (savedCfToken) await loadCloudflare(savedCfToken);
    } catch (e) {
      cloudflareError = e instanceof Error ? e.message : String(e);
    }

    // GitLab の戻り（?code=）は GitHub の処理より先に取り出す
    try {
      const saved = (await completeGitLabOAuth()) ?? loadGitLab();
      if (saved) {
        await signInGitLab(saved.url, saved.token);
        loading = false;
        return;
      }
    } catch (e) {
      clearGitLab();
      loginError = e instanceof Error ? e.message : String(e);
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
    clearGitLab();
    gh = null;
    gl = null;
    owners = [];
    config = null;
    cloudflareAccounts = [];
    cloudflareConnected = false;
    selectedCloudflareAccountId = '';
    selectedProvider = 'github-pages';
    try { sessionStorage.removeItem('blogit:deployment-provider'); } catch {}
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
  {:else if gl}
    {#if !config}
      <SetupForm platform="gitlab" client={gl} {owners} cloudflareAccounts={[]} cloudflareConnected={false} cloudflareError="" selectedCloudflareAccountId="" selectedProvider="gitlab-pages" gitlabUrl={gl.baseUrl} onSelectProvider={selectProvider} onConnectCloudflare={connectCloudflare} onSelectCloudflareAccount={() => {}} onSubmit={(c) => (config = c)} />
    {:else}
      <Progress {gl} {config} onBack={() => (config = null)} />
    {/if}
  {:else if !gh}
    <Login onSignIn={signIn} onSignInGitLab={signInGitLab} error={loginError} />
  {:else if !config}
    <SetupForm platform="github" client={gh} {owners} {cloudflareAccounts} {cloudflareConnected} {cloudflareError} {selectedCloudflareAccountId} {selectedProvider} onSelectProvider={selectProvider} onConnectCloudflare={connectCloudflare} onSelectCloudflareAccount={(id) => (selectedCloudflareAccountId = id)} onSubmit={(c) => (config = c)} />
  {:else}
    <Progress {gh} {config} onBack={() => (config = null)} />
  {/if}
</main>

<footer class="footer">
  <a href="https://github.com/kmmz532/blogit">Blogit</a> — Hugo + hugo-gh-admin / hugo-gl-admin + GitHub Pages / Cloudflare Pages / GitLab Pages
</footer>
