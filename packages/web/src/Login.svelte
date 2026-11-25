<script lang="ts">
  import { oauthEnabled, saveToken, startOAuth } from './lib/auth';
  import TokenHelp from './TokenHelp.svelte';

  let { onSignIn, error = '' }: { onSignIn: (token: string) => Promise<void>; error?: string } = $props();

  let token = $state('');
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
</script>

<h1 class="page-title">GitHub だけで、ブログを。</h1>
<p class="lead">
  Blogit は GitHub アカウントと連携して、Hugo のブログを GitHub Pages に無料で公開します。
  リポジトリの作成から公開まで自動で行い、記事はブラウザから書けます。
</p>

<div class="stack">
  {#if oauthEnabled}
    <div class="actions">
      <button class="button" type="button" onclick={startOAuth}>
        <i class="fa-brands fa-github" aria-hidden="true"></i> GitHub でログイン
      </button>
    </div>
  {:else}
    <form class="card stack" onsubmit={submitToken}>
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
  {#if error || message}
    <p class="error-text">{error || message}</p>
  {/if}
</div>
