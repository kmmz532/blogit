<script lang="ts">
  import { t } from './lib/i18n.svelte';
  import { GitHubClient, GitLabClient, GITLAB_COM, type BlogConfig, type DeploymentProvider, type Owner } from '@blogit/core';
  import { onMount } from 'svelte';
  import { clearToken, completeOAuth, loadToken } from './lib/auth';
  import { clearGitLab, completeGitLabOAuth, loadGitLab } from './lib/gitlab';
  import { clearCloudflareToken, CloudflareClient, completeCloudflareOAuth, loadCloudflareToken, startCloudflareOAuth, type CloudflareAccount } from './lib/cloudflare';
  import Footer from './Footer.svelte';
  import Header from './Header.svelte';
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
    // Cloudflare の接続から戻ったときは選択を保つ。それ以外と、Cloudflare の Git 連携が使えないセルフホストは GitLab Pages
    if (selectedProvider !== 'cloudflare-pages' || client.baseUrl !== GITLAB_COM) selectedProvider = 'gitlab-pages';
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
</script>

<Header user={owners[0]} onSignOut={signOut} />

<main class="main">
  {#if loading}
    <!-- 読み込み中はセットアップ画面の形をしたスケルトンを表示する -->
    <div class="stack" aria-busy="true" aria-label={t('loading')}>
      <div class="skeleton skeleton-title"></div>
      {#each [3, 2, 2] as lines}
        <div class="card stack">
          <div class="skeleton skeleton-label"></div>
          {#each { length: lines } as _}<div class="skeleton skeleton-field"></div>{/each}
        </div>
      {/each}
    </div>
  {:else if gl}
    {#if !config}
      <SetupForm platform="gitlab" client={gl} {owners} {cloudflareAccounts} {cloudflareConnected} {cloudflareError} {selectedCloudflareAccountId} {selectedProvider} gitlabUrl={gl.baseUrl} onSelectProvider={selectProvider} onConnectCloudflare={connectCloudflare} onSelectCloudflareAccount={(id) => (selectedCloudflareAccountId = id)} onSubmit={(c) => (config = c)} />
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

<Footer />
