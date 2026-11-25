<script lang="ts">
  import { pagesBaseURL, validateRepoName, type BlogConfig, type GitHubClient, type Owner, type ThemeName } from '@blogit/core';
  import type { CloudflareAccount } from './lib/cloudflare';

  let {
    gh, owners, cloudflareAccounts, cloudflareConnected, cloudflareError, onConnectCloudflare, onSubmit,
  }: {
    gh: GitHubClient;
    owners: Owner[];
    cloudflareAccounts: CloudflareAccount[];
    cloudflareConnected: boolean;
    cloudflareError: string;
    onConnectCloudflare: () => Promise<void>;
    onSubmit: (c: BlogConfig) => void;
  } = $props();

  const themes: { name: ThemeName; label: string; note: string }[] = [
    { name: 'default', label: 'Default', note: 'シンプルな白黒。かみみずブログと同じ見た目' },
    { name: 'warm', label: 'Warm', note: '生成り色と明朝の見出し。罫線で区切る' },
    { name: 'cool', label: 'Cool', note: '青みの配色と等幅の日付。角のない線で整える' },
  ];
  const views = [
    { id: 'home-light', label: 'トップ' },
    { id: 'post-light', label: '記事' },
    { id: 'home-dark', label: 'ダーク' },
  ];
  const shot = (theme: ThemeName, view: string) => `./themes/${theme}-${view}.png`;
  let view = $state('home-light');
  let owner = $state(owners[0].login);
  let repo = $state('blog');
  let title = $state('');
  let description = $state('');
  let author = $state(owners[0].login);
  let theme = $state<ThemeName>('default');
  let language = $state<'ja' | 'en'>('ja');
  let busy = $state(false);
  let connecting = $state(false);
  let error = $state('');

  const repoValid = $derived(validateRepoName(repo));
  const url = $derived(repoValid ? pagesBaseURL(owner, repo) : '');

  async function connect() {
    connecting = true;
    try {
      await onConnectCloudflare();
    } finally {
      connecting = false;
    }
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      if (await gh.repoExists({ owner, repo })) {
        error = `${owner}/${repo} はすでにあります。別の名前にしてください。`;
        return;
      }
      const ownerType = owners.find((o) => o.login === owner)!.type;
      onSubmit({ title: title.trim(), description: description.trim(), author: author.trim(), owner, ownerType, repo, theme, language });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="page-title">ブログを作る</h1>
<p class="lead">GitHub にリポジトリを作成し、GitHub Pages または Cloudflare Pages に公開します。</p>

<section class="card stack">
  <h2 class="section-title">Cloudflare 接続</h2>
  {#if cloudflareConnected}
    <p class="hint">接続済み：{cloudflareAccounts.length} 個のアカウントを取得しました。</p>
    {#each cloudflareAccounts as account (account.id)}
      <p>{account.name}</p>
    {/each}
  {:else}
    <p class="hint">Cloudflare Pages を公開先にする場合は、Cloudflare アカウントを接続します。</p>
    <div class="actions">
      <button class="button" type="button" onclick={connect} disabled={connecting}>
        Cloudflare と接続
      </button>
    </div>
  {/if}
  {#if cloudflareError}<p class="error-text">{cloudflareError}</p>{/if}
</section>

<form class="stack" onsubmit={submit}>
  <section class="card stack">
    <h2 class="section-title">ブログ</h2>
    <div class="field">
      <label for="title">ブログ名</label>
      <input id="title" type="text" bind:value={title} required />
    </div>
    <div class="field">
      <label for="description">説明</label>
      <input id="description" type="text" bind:value={description} />
    </div>
    <div class="field">
      <label for="author">著者名</label>
      <input id="author" type="text" bind:value={author} required />
    </div>
  </section>

  <section class="card stack">
    <h2 class="section-title">リポジトリ</h2>
    <div class="field">
      <label for="repo">作成先</label>
      <div class="repo-input">
        <select id="owner" bind:value={owner} aria-label="アカウント" style="width: auto">
          {#each owners as o (o.login)}
            <option value={o.login}>{o.login}</option>
          {/each}
        </select>
        <span>/</span>
        <input id="repo" type="text" bind:value={repo} required />
      </div>
      {#if repoValid}
        <p class="hint">GitHub Pages URL: {url}</p>
      {:else}
        <p class="error-text">英数字・ハイフン・アンダースコア・ピリオドだけが使えます。</p>
      {/if}
      <p class="hint">リポジトリは公開（Public）で作成します。</p>
    </div>
  </section>

  <section class="card stack">
    <h2 class="section-title">見た目</h2>
    <fieldset class="field">
      <legend>テーマ</legend>
      <div class="choices">
        {#each themes as t (t.name)}
          <label class="choice">
            <input type="radio" name="theme" value={t.name} bind:group={theme} />
            <img class="choice-thumb" src={shot(t.name, 'home-light')} alt="" loading="lazy" />
            <span class="choice-name">{t.label}</span>
            <span class="hint">{t.note}</span>
          </label>
        {/each}
      </div>
    </fieldset>
    <div class="preview">
      <div class="tabs" role="tablist" aria-label="プレビュー">
        {#each views as v (v.id)}
          <button type="button" role="tab" class="tab" aria-selected={view === v.id} onclick={() => (view = v.id)}>{v.label}</button>
        {/each}
      </div>
      <img class="preview-image" src={shot(theme, view)} alt="{theme} テーマのプレビュー" />
    </div>
    <fieldset class="field">
      <legend>言語</legend>
      <div class="choices">
        <label class="choice"><input type="radio" name="language" value="ja" bind:group={language} /><span class="choice-name">日本語</span></label>
        <label class="choice"><input type="radio" name="language" value="en" bind:group={language} /><span class="choice-name">English</span></label>
      </div>
    </fieldset>
  </section>

  {#if error}<p class="error-text">{error}</p>{/if}
  <div class="actions">
    <button class="button" type="submit" disabled={busy || !repoValid || !title.trim()}>作成して公開する</button>
  </div>
</form>
