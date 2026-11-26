<script lang="ts">
  import { pagesBaseURL, cloudflarePagesBaseURL, gitlabPagesBaseURL, GITLAB_COM, validateCustomDomain, validateGitLabProjectPath, validateLinkUrl, LINK_ICONS, type ProfileLink, validateRepoName, type BlogConfig, type DeploymentProvider, type Owner, type RepoRef, type ThemeName } from '@blogit/core';
  import type { CloudflareAccount } from './lib/cloudflare';
  import { loadDraft, saveDraft } from './lib/draft';

  let {
    platform, client, gitlabUrl = GITLAB_COM, owners, cloudflareAccounts, cloudflareConnected, cloudflareError, selectedCloudflareAccountId, selectedProvider, onSelectProvider, onConnectCloudflare, onSelectCloudflareAccount, onSubmit,
  }: {
    platform: 'github' | 'gitlab';
    // GitHubClient と GitLabClient の共通部分だけを使う
    client: { repoExists(ref: RepoRef): Promise<boolean>; getUserSiteOrigin?(owner: string): Promise<string | null>; isBlogitSite?(ref: RepoRef): Promise<boolean> };
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
  // 前回の入力内容を復元する。作成先のアカウントは、ログイン中のアカウントで選べるものだけ使う
  const draft = loadDraft();
  const pick = <T,>(key: string, fallback: T): T => (typeof draft[key] === typeof fallback ? (draft[key] as T) : fallback);
  let owner = $state(owners.some((o) => o.login === draft.owner) ? (draft.owner as string) : owners[0].login);
  let repo = $state(pick('repo', 'blog'));
  let title = $state(pick('title', ''));
  let description = $state(pick('description', ''));
  let author = $state(pick('author', ''));
  let theme = $state<ThemeName>(themes.some((t) => t.name === draft.theme) ? (draft.theme as ThemeName) : 'default');
  let language = $state<'ja' | 'en'>(draft.language === 'en' ? 'en' : 'ja');
  let isPrivate = $state(pick('isPrivate', false));
  let customDomain = $state(pick('customDomain', ''));
  let bio = $state(pick('bio', ''));
  let links = $state<ProfileLink[]>(Array.isArray(draft.links)
    ? (draft.links as ProfileLink[]).filter((l) => LINK_ICONS.some((d) => d.id === l?.icon) && typeof l.url === 'string')
    : []);
  let sidebar = $state(pick('sidebar', true));
  let pagerSize = $state(pick('pagerSize', 10));
  $effect(() => {
    saveDraft({ owner, repo, title, description, author, theme, language, isPrivate, customDomain, bio, links, sidebar, pagerSize });
  });
  // 同じ作成先に、途中まで作成したリポジトリがあるとき
  let resumable = $state(false);
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
  const linksValid = $derived(links.every((l) => !l.url.trim() || validateLinkUrl(l.url.trim())));
  // まだ追加していない種類のアイコンを、次のリンクの既定にする
  function addLink() {
    const icon = LINK_ICONS.find((d) => !links.some((l) => l.icon === d.id))?.id ?? 'website';
    links.push({ icon, url: '' });
  }
  const pagerSizeValid = $derived(Number.isInteger(pagerSize) && pagerSize >= 1 && pagerSize <= 100);
  $effect(() => {
    // 作成先を変えたら、再開の確認を取り消す
    void owner; void repo;
    resumable = false;
  });
  const canSubmit = $derived(repoValid && title.trim() && (!useCustomDomain || domainValid) && linksValid && pagerSizeValid && (selectedProvider !== 'cloudflare-pages'
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
        error = 'Cloudflare Pagesのプロジェクト名は小文字英数字とハイフンのみ使用できます。';
        return;
      }
      if (selectedProvider === 'cloudflare-pages' && (!cloudflareConnected || !selectedCloudflareAccountId)) {
        error = '先にCloudflareアカウントを接続してください。';
        return;
      }
      if (!resumable && await client.repoExists({ owner, repo })) {
        // Blogit が途中まで作成したリポジトリなら、続きから構築できる（GitHub Pages のみ）
        if (selectedProvider === 'github-pages' && client.isBlogitSite && await client.isBlogitSite({ owner, repo })) {
          resumable = true;
          return;
        }
        error = `${owner}/${repo} はすでに存在します。別の名前を入力してください。`;
        return;
      }
      const ownerType = owners.find((o) => o.login === owner)!.type;
      const linkValues = links.map((l) => ({ icon: l.icon, url: l.url.trim() })).filter((l) => l.url);
      onSubmit({
        title: title.trim(), description: description.trim(), author: author.trim() || owner,
        owner, ownerType, repo, provider: selectedProvider,
        ...(selectedProvider === 'cloudflare-pages' ? { cloudflareAccountId: selectedCloudflareAccountId } : {}),
        ...(isGitLab ? { gitlabUrl } : {}),
        ...(useCustomDomain && domain ? { customDomain: domain } : {}),
        theme, language, private: isPrivate,
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        ...(linkValues.length ? { links: linkValues } : {}),
        ...(sidebar ? {} : { sidebar: false }),
        ...(pagerSize !== 10 ? { pagerSize } : {}),
      });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }
</script>

<h1 class="page-title">ブログを作成する</h1>

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
              <label for="cloudflare-account">Cloudflareアカウント</label>
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
              {connecting ? '接続中…' : 'Cloudflareと接続'}
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
        <p class="hint">公開URL: {url}</p>
      {:else if selectedProvider === 'cloudflare-pages'}
        <p class="error-text">Cloudflare Pagesのプロジェクト名は小文字英数字とハイフンのみ使用できます。</p>
      {:else if repoValid}
        <p class="hint">公開URLは初回の公開時に決まります。</p>
      {:else}
        <p class="error-text">英数字、ハイフン、アンダースコア、ピリオドのみ使用できます{isGitLab ? '（先頭は英数字、末尾に .git は不可）' : ''}。</p>
      {/if}
    </div>
  </section>

  <!-- 見た目は最初は開いておき、選び終えたら閉じられるようにする -->
  <details class="card" open>
    <summary>見た目</summary>
    <div class="stack" style="margin-top: 1rem">
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
    </div>
  </details>

  <!-- 既定値のままでよい項目は折りたたむ -->
  <details class="card">
    <summary>高度な設定</summary>
    <div class="stack" style="margin-top: 1rem">
      <div class="field">
        <label for="description">説明</label>
        <input id="description" type="text" bind:value={description} />
      </div>
      <div class="field">
        <label for="author">著者名</label>
        <input id="author" type="text" bind:value={author} placeholder={owner} />
      </div>
      <div class="field">
        <label for="bio">プロフィール</label>
        <input id="bio" type="text" bind:value={bio} />
        <p class="hint">サイドバーに著者名と一緒に表示します。</p>
      </div>
      <fieldset class="field">
        <legend>サイドバーのリンク</legend>
        {#each links as link, i}
          <div class="link-row">
            <i class={LINK_ICONS.find((d) => d.id === link.icon)?.icon} aria-hidden="true"></i>
            <select bind:value={link.icon} aria-label="リンクの種類">
              {#each LINK_ICONS as d (d.id)}<option value={d.id}>{d.name}</option>{/each}
            </select>
            <input type="url" bind:value={link.url} placeholder={link.icon === 'mail' ? 'mailto:info@example.jp' : 'https://'} aria-label="URL" />
            <button class="icon-button" type="button" onclick={() => links.splice(i, 1)} aria-label="リンクを削除" title="リンクを削除">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        {/each}
        {#if !linksValid}<p class="error-text">URLは https:// または mailto: から入力してください。</p>{/if}
        <div class="actions">
          <button class="button secondary" type="button" onclick={addLink}>
            <i class="fa-solid fa-plus" aria-hidden="true"></i> リンクを追加
          </button>
        </div>
      </fieldset>
      <label class="checkbox">
        <input type="checkbox" bind:checked={sidebar} />
        サイドバーを表示する
      </label>
      <div class="field">
        <label for="pager-size">1ページあたりの記事数</label>
        <input id="pager-size" type="number" min="1" max="100" bind:value={pagerSize} style="width: 8rem" />
        {#if !pagerSizeValid}<p class="error-text">1から100までの数を入力してください。</p>{/if}
      </div>
      <div class="field">
        <label for="language">言語</label>
        <select id="language" bind:value={language} style="width: auto; justify-self: start">
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
      </div>
      {#if useCustomDomain}
        <div class="field">
          <label for="custom-domain">独自ドメイン（任意）</label>
          <input id="custom-domain" type="text" bind:value={customDomain} placeholder="blog.example.jp" autocomplete="off" spellcheck="false" />
          {#if !domainValid}
            <p class="error-text">ドメイン名のみを入力してください。</p>
          {:else if domain}
            <p class="hint">DNSで <code>{domain}</code> のCNAMEレコードを <code>{owner.toLowerCase()}.github.io</code> に設定してください（<a href="https://docs.github.com/ja/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site" target="_blank" rel="noopener">設定方法</a>）</p>
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
  </details>

  {#if error}<p class="error-text">{error}</p>{/if}
  {#if resumable}
    <p class="hint">{owner}/{repo} は途中まで作成されています。完了していない手順から構築を再開します。</p>
  {/if}
  <div class="actions">
    <button class="button" type="submit" disabled={busy || !canSubmit}>{resumable ? '続きから構築する' : '作成して公開する'}</button>
  </div>
</form>
