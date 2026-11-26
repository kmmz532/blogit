<script lang="ts">
  import { GITLAB_COM, normalizeGitLabUrl } from '@blogit/core';
  import { oauthEnabled, saveToken, startOAuth } from './lib/auth';
  import { gitlabOAuthEnabled, saveGitLab, startGitLabOAuth } from './lib/gitlab';
  import TokenHelp from './TokenHelp.svelte';

  let { onSignIn, onSignInGitLab, error = '' }: {
    onSignIn: (token: string) => Promise<void>;
    onSignInGitLab: (url: string, token: string) => Promise<void>;
    error?: string;
  } = $props();

  let token = $state('');
  let gitlabUrl = $state(GITLAB_COM);
  let gitlabToken = $state('');
  let busy = $state(false);
  let message = $state('');

  async function submitToken(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    message = '';
    try {
      await onSignIn(token.trim());
      saveToken(token.trim());
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }

  async function submitGitLab(e: SubmitEvent) {
    e.preventDefault();
    const url = normalizeGitLabUrl(gitlabUrl);
    if (!url) {
      message = 'GitLab の URL が正しくありません。';
      return;
    }
    busy = true;
    message = '';
    try {
      await onSignInGitLab(url, gitlabToken.trim());
      saveGitLab(url, gitlabToken.trim());
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="page-title">Blogitで簡単にHugoブログを構築</h1>
<p class="lead">
  GitHubなどのGitサービスと連携し、コストがかからない無料のブログをGitHub Pagesなどに構築します。<br />
  記事の執筆や設定の変更もWebブラウザから行えます。
</p>

<div class="stack">
  <section class="card stack">
    <h2 class="section-title">GitHub</h2>
    <p class="hint">GitHub Pages または Cloudflare Pages に公開します。</p>
    {#if oauthEnabled}
      <div class="actions">
        <button class="button" type="button" onclick={startOAuth}>
          <i class="fa-brands fa-github" aria-hidden="true"></i> GitHub でログイン
        </button>
      </div>
    {:else}
      <form class="stack" onsubmit={submitToken}>
        <div class="field">
          <label for="token">GitHub のトークン（開発用）</label>
          <input id="token" type="password" bind:value={token} autocomplete="off" required />
          <p class="hint">OAuth App が未設定のため、Personal Access Token でログインします。</p>
          <TokenHelp />
        </div>
        <div class="actions">
          <button class="button" type="submit" disabled={busy || !token.trim()}>ログイン</button>
        </div>
      </form>
    {/if}
  </section>

  <section class="card stack">
    <h2 class="section-title">GitLab</h2>
    <p class="hint">GitLab Pages に公開します。gitlab.com とセルフホストの GitLab に対応しています。</p>
    {#if gitlabOAuthEnabled}
      <div class="actions">
        <button class="button" type="button" onclick={startGitLabOAuth}>
          <i class="fa-brands fa-gitlab" aria-hidden="true"></i> GitLab.com でログイン
        </button>
      </div>
    {/if}
    <details open={!gitlabOAuthEnabled}>
      <summary>{gitlabOAuthEnabled ? 'セルフホストの GitLab、またはアクセストークンでログイン' : 'アクセストークンでログイン'}</summary>
      <form class="stack" onsubmit={submitGitLab}>
        <div class="field">
          <label for="gitlab-url">GitLab の URL</label>
          <input id="gitlab-url" type="url" bind:value={gitlabUrl} autocomplete="url" required />
        </div>
        <div class="field">
          <label for="gitlab-token">Personal Access Token</label>
          <input id="gitlab-token" type="password" bind:value={gitlabToken} autocomplete="off" required />
          <p class="hint">
            User settings → Access tokens で、スコープ <code>api</code> を付けたトークンを作成してください。トークンはこのタブを閉じると消えます。
          </p>
        </div>
        <div class="actions">
          <button class="button" type="submit" disabled={busy || !gitlabToken.trim() || !gitlabUrl.trim()}>ログイン</button>
        </div>
      </form>
    </details>
  </section>

  {#if error || message}
    <p class="error-text">{error || message}</p>
  {/if}
</div>
