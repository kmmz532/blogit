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

  // OAuth が使えないときだけ、ボタンを押すとトークンの入力欄を出す
  let tokenForm = $state<'github' | 'gitlab' | null>(null);
  let token = $state('');
  let gitlabUrl = $state(GITLAB_COM);
  let gitlabToken = $state('');
  let busy = $state(false);
  let message = $state('');

  function loginGitHub() {
    if (oauthEnabled) startOAuth();
    else tokenForm = 'github';
  }

  function loginGitLab() {
    if (gitlabOAuthEnabled) startGitLabOAuth();
    else tokenForm = 'gitlab';
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    message = '';
    try {
      if (tokenForm === 'github') {
        await onSignIn(token.trim());
        saveToken(token.trim());
      } else {
        const url = normalizeGitLabUrl(gitlabUrl);
        if (!url) throw new Error('GitLabのURLが正しくありません。');
        await onSignInGitLab(url, gitlabToken.trim());
        saveGitLab(url, gitlabToken.trim());
      }
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="page-title">Hugoブログを構築する</h1>
<p class="lead">GitHubまたはGitLabのアカウントで、無料のHugoブログを作成します。<a href="./about.html">詳しく見る</a></p>

<div class="stack">
  <div class="actions">
    <button class="button" type="button" onclick={loginGitHub}>
      <i class="fa-brands fa-github" aria-hidden="true"></i> GitHubでログイン
    </button>
    <button class="button" type="button" onclick={loginGitLab}>
      <i class="fa-brands fa-gitlab" aria-hidden="true"></i> GitLabでログイン
    </button>
  </div>

  <p class="hint">ログインすると、<a href="./terms.html">利用規約</a>と<a href="./privacy.html">プライバシーポリシー</a>に同意したものとみなします。</p>

  {#if tokenForm}
    <form class="stack" onsubmit={submit}>
      {#if tokenForm === 'github'}
        <div class="field">
          <label for="token">GitHubのPersonal Access Token</label>
          <input id="token" type="password" bind:value={token} autocomplete="off" required />
          <TokenHelp />
        </div>
      {:else}
        <div class="field">
          <label for="gitlab-url">GitLabのURL</label>
          <input id="gitlab-url" type="url" bind:value={gitlabUrl} autocomplete="url" required />
        </div>
        <div class="field">
          <label for="gitlab-token">GitLabのPersonal Access Token</label>
          <input id="gitlab-token" type="password" bind:value={gitlabToken} autocomplete="off" required />
          <p class="hint">スコープ <code>api</code> を付けたトークンを入力してください。</p>
        </div>
      {/if}
      <div class="actions">
        <button class="button" type="submit" disabled={busy || (tokenForm === 'github' ? !token.trim() : !gitlabToken.trim() || !gitlabUrl.trim())}>ログイン</button>
      </div>
    </form>
  {/if}

  {#if error || message}
    <p class="error-text">{error || message}</p>
  {/if}
</div>

<figure class="shot">
  <img class="shot-light" src="./themes/default-home-light.png" alt="Blogitで作成したブログの例" width="1280" height="800" />
  <img class="shot-dark" src="./themes/default-home-dark.png" alt="Blogitで作成したブログの例" width="1280" height="800" />
  <figcaption class="hint">作成されるブログの例（Defaultテーマ）</figcaption>
</figure>
