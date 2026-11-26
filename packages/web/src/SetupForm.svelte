<script lang="ts">
  import { pagesBaseURL, cloudflarePagesBaseURL, gitlabPagesBaseURL, GITLAB_COM, validateCustomDomain, validateGitLabProjectPath, validateRepoName, type BlogConfig, type DeploymentProvider, type Owner, type RepoRef, type ThemeName } from '@blogit/core';
  import type { CloudflareAccount } from './lib/cloudflare';

  let {
    platform, client, gitlabUrl = GITLAB_COM, owners, cloudflareAccounts, cloudflareConnected, cloudflareError, selectedCloudflareAccountId, selectedProvider, onSelectProvider, onConnectCloudflare, onSelectCloudflareAccount, onSubmit,
  }: {
    platform: 'github' | 'gitlab';
    // GitHubClient と GitLabClient の共通部分だけを使う
    client: { repoExists(ref: RepoRef): Promise<boolean>; getUserSiteOrigin?(owner: string): Promise<string | null> };
    gitlabUrl?: string;
    owners: Owner[];
    cloudflareAccounts: CloudflareAccount[];
    cloudflareConnected: boolean;
    cloudflareError: string;
    selectedCloudflareAccountId: string;
    selectedProvider: DeploymentProvider;
    onSelectProvider: (provider: DeploymentProvider) => void;
    onConnectCloudflare: () => Promise<void>;
    onSelectCloudflareAccount: (id: string) => void;
    onSubmit: (c: BlogConfig) => void;
  } = $props();

  const themes: { name: ThemeName; label: string; note: string }[] = [
    { name: 'default', label: 'Default', note: '白黒の配色' },
    { name: 'warm', label: 'Warm', note: '生成り色と明朝体の見出し' },
    { name: 'cool', label: 'Cool', note: '青系の配色' },
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
  let isPrivate = $state(false);
  let customDomain = $state('');
  let busy = $state(false);
  let connecting = $state(false);
  let error = $state('');

  const isGitLab = $derived(platform === 'gitlab');
  // Cloudflare の Git 連携は gitlab.com のみ対応する
  const cloudflareAvailable = $derived(!isGitLab || gitlabUrl === GITLAB_COM);
  const repoValid = $derived(isGitLab ? validateGitLabProjectPath(repo) : validateRepoName(repo));
  const cloudflareRepoValid = $derived(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(repo));
  // GitHub Pages の公開先の予想に使う、<owner>.github.io の独自ドメイン（owner ごとに 1 回だけ取得する）
  let userSiteOrigins = $state<Record<string, string | null>>({});
  $effect(() => {
    const o = owner;
    if (isGitLab || selectedProvider !== 'github-pages' || !client.getUserSiteOrigin || o in userSiteOrigins) return;
    userSiteOrigins[o] = null;
    client.getUserSiteOrigin(o).then((origin) => { userSiteOrigins[o] = origin; });
  });
  const useCustomDomain = $derived(!isGitLab && selectedProvider === 'github-pages');
  const domain = $derived(customDomain.trim().toLowerCase());
  const domainValid = $derived(!domain || validateCustomDomain(domain));
  const url = $derived(useCustomDomain && domain && domainValid ? `https://${domain}/`
    : selectedProvider === 'cloudflare-pages'
    ? (cloudflareRepoValid ? cloudflarePagesBaseURL(repo) : '')
    : !repoValid ? ''
    : isGitLab ? (gitlabUrl === GITLAB_COM ? gitlabPagesBaseURL(owner, repo) : '')
    : pagesBaseURL(owner, repo, userSiteOrigins[owner]));
  const canSubmit = $derived(repoValid && title.trim() && (!useCustomDomain || domainValid) && (selectedProvider !== 'cloudflare-pages'
    || (cloudflareConnected && !!selectedCloudflareAccountId && cloudflareRepoValid)));

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
      if (selectedProvider === 'cloudflare-pages' && !cloudflareRepoValid) {
        error = 'Cloudflare Pages のプロジェクト名には小文字英数字とハイフンだけを使えます。';
        return;
      }
      if (selectedProvider === 'cloudflare-pages' && (!cloudflareConnected || !selectedCloudflareAccountId)) {
        error = '先にCloudflareアカウントを接続してください。';
        return;
      }
      if (await client.repoExists({ owner, repo })) {
        error = `${owner}/${repo} はすでにあります。別の名前にしてください。`;
        return;
      }
      const ownerType = owners.find((o) => o.login === owner)!.type;
      onSubmit({
        title: title.trim(), description: description.trim(), author: author.trim(),
        owner, ownerType, repo, provider: selectedProvider,
        ...(selectedProvider === 'cloudflare-pages' ? { cloudflareAccountId: selectedCloudflareAccountId } : {}),
        ...(isGitLab ? { gitlabUrl } : {}),
        ...(useCustomDomain && domain ? { customDomain: domain } : {}),
        theme, language, private: isPrivate,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="page-title">ブログを作る</h1>

<form class="stack" onsubmit={submit}>
  <section class="card stack">
    <h2 class="section-title">公開先</h2>
    <fieldset class="field">
      <legend>ホスティングサービス</legend>
      <div class="choices">
        {#if isGitLab}
        <label class="choice">
          <input type="radio" name="provider" value="gitlab-pages" checked={selectedProvider === 'gitlab-pages'} onchange={() => onSelectProvider('gitlab-pages')} />
          <span class="choice-name">GitLab Pages</span>
          <span class="hint">GitLab CI/CDで公開</span>
        </label>
        {:else}
        <label class="choice">
          <input type="radio" name="provider" value="github-pages" checked={selectedProvider === 'github-pages'} onchange={() => onSelectProvider('github-pages')} />
          <span class="choice-name">GitHub Pages</span>
          <span class="hint">GitHub Actionsで公開</span>
        </label>
        {/if}
        {#if cloudflareAvailable}
        <label class="choice">
          <input type="radio" name="provider" value="cloudflare-pages" checked={selectedProvider === 'cloudflare-pages'} onchange={() => onSelectProvider('cloudflare-pages')} />
          <span class="choice-name">Cloudflare Pages</span>
          <span class="hint">CloudflareのGit連携で公開</span>
        </label>
        {/if}
      </div>
    </fieldset>
    {#if selectedProvider === 'cloudflare-pages'}
      <div class="stack">
        {#if cloudflareConnected}
          {#if cloudflareAccounts.length > 0}
            <div class="field">
              <label for="cloudflare-account">Cloudflare アカウント</label>
              <select id="cloudflare-account" value={selectedCloudflareAccountId} onchange={(event) => onSelectCloudflareAccount((event.currentTarget as HTMLSelectElement).value)}>
                {#each cloudflareAccounts as account (account.id)}
                  <option value={account.id}>{account.name}</option>
                {/each}
              </select>
            </div>
          {:else}
            <p class="hint">利用可能なCloudflareアカウントがありません。</p>
          {/if}
        {:else}
          <div class="actions">
            <button class="button" type="button" onclick={connect} disabled={connecting}>
              {connecting ? '接続中…' : 'Cloudflare と接続'}
            </button>
          </div>
        {/if}
        {#if cloudflareError}<p class="error-text">{cloudflareError}</p>{/if}
        <p class="hint">事前にCloudflareのダッシュボードで{isGitLab ? 'GitLab' : 'GitHub'}との連携を設定してください。</p>
      </div>
    {/if}
  </section>

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
    <h2 class="section-title">リポジトリと公開 URL</h2>
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
      {#if url}
        <p class="hint">公開 URL: {url}</p>
      {:else if selectedProvider === 'cloudflare-pages'}
        <p class="error-text">Cloudflare Pages のプロジェクト名は小文字英数字とハイフンのみ使用できます。</p>
      {:else if repoValid}
        <p class="hint">公開 URL は初回の公開時に決まります。</p>
      {:else}
        <p class="error-text">英数字・ハイフン・アンダースコア・ピリオドのみ使用できます{isGitLab ? '（先頭は英数字、末尾に .git は不可）' : ''}。</p>
      {/if}
      {#if useCustomDomain}
        <div class="field">
          <label for="custom-domain">独自ドメイン（任意）</label>
          <input id="custom-domain" type="text" bind:value={customDomain} placeholder="blog.example.jp" autocomplete="off" spellcheck="false" />
          {#if !domainValid}
            <p class="error-text">ドメイン名のみを入力してください。</p>
          {:else if domain}
            <p class="hint">DNSで <code>{domain}</code> のCNAMEレコードを <code>{owner.toLowerCase()}.github.io</code> に設定してください（<a href="https://docs.github.com/ja/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site" target="_blank" rel="noopener">設定方法</a>）。</p>
          {/if}
        </div>
      {/if}
      <label class="checkbox">
        <input type="checkbox" bind:checked={isPrivate} />
        {isGitLab ? 'プロジェクト' : 'リポジトリ'}を非公開で作成する
      </label>
      {#if isPrivate}
        <p class="hint">
          {#if selectedProvider === 'github-pages'}非公開リポジトリでGitHub Pagesを利用するには、有料プランが必要です。{/if}
          公開前の画像は、管理画面でプレビューできません。
        </p>
      {/if}
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
    <button class="button" type="submit" disabled={busy || !canSubmit}>作成して公開する</button>
  </div>
</form>
