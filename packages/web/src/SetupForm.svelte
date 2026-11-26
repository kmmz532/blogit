<script lang="ts">
  import { fetchThemeVersion, pagesBaseURL, cloudflarePagesBaseURL, gitlabPagesBaseURL, GITLAB_COM, validateCustomDomain, validateGitLabProjectPath, validateLinkUrl, LINK_ICONS, type ProfileLink, validateRepoName, type BlogConfig, type DeploymentProvider, type Owner, type RepoRef, type ThemeName } from '@blogit/core';
  import type { CloudflareAccount } from './lib/cloudflare';
  import { loadDraft, saveDraft } from './lib/draft';
  import { i18n, t } from './lib/i18n.svelte';

  let {
    platform, client, gitlabUrl = GITLAB_COM, owners, cloudflareAccounts, cloudflareConnected, cloudflareError, selectedCloudflareAccountId, selectedProvider, onSelectProvider, onConnectCloudflare, onSelectCloudflareAccount, onSubmit,
  }: {
    platform: 'github' | 'gitlab';
    // GitHubClient と GitLabClient の共通部分だけを使う
    client: { repoExists(ref: RepoRef): Promise<boolean>; getUserSiteOrigin?(owner: string): Promise<string | null>; isBlogitSite?(ref: RepoRef): Promise<boolean>; isEmptyRepo?(ref: RepoRef): Promise<boolean> };
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

  const themes = [
    { name: 'default', label: 'Default', note: 'themeDefault' },
    { name: 'warm', label: 'Warm', note: 'themeWarm' },
    { name: 'cool', label: 'Cool', note: 'themeCool' },
  ] as const;
  const views = [
    { id: 'home-light', label: 'previewHome' },
    { id: 'post-light', label: 'previewPost' },
    { id: 'home-dark', label: 'previewDark' },
  ] as const;
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
  let language = $state<'ja' | 'en'>(draft.language === 'en' || draft.language === 'ja' ? draft.language : i18n.locale);
  let isPrivate = $state(pick('isPrivate', false));
  let customDomain = $state(pick('customDomain', ''));
  let bio = $state(pick('bio', ''));
  let links = $state<ProfileLink[]>(Array.isArray(draft.links)
    ? (draft.links as ProfileLink[]).filter((l) => LINK_ICONS.some((d) => d.id === l?.icon) && typeof l.url === 'string')
    : []);
  let sidebar = $state(pick('sidebar', true));
  let pagerSize = $state(pick('pagerSize', 10));
  let themeAutoUpdate = $state(pick('themeAutoUpdate', true));
  $effect(() => {
    saveDraft({ owner, repo, title, description, author, theme, language, isPrivate, customDomain, bio, links, sidebar, pagerSize, themeAutoUpdate });
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
        error = t('cloudflareNameInvalid');
        return;
      }
      if (selectedProvider === 'cloudflare-pages' && (!cloudflareConnected || !selectedCloudflareAccountId)) {
        error = t('connectCloudflareFirst');
        return;
      }
      if (!resumable && await client.repoExists({ owner, repo })) {
        // Blogit が途中まで作成したリポジトリ（ファイルの追加前に止まった空のリポジトリを含む）なら、続きから構築できる
        if ((client.isBlogitSite && await client.isBlogitSite({ owner, repo }))
          || (client.isEmptyRepo && await client.isEmptyRepo({ owner, repo }))) {
          resumable = true;
          return;
        }
        error = t('repoExists', { repo: `${owner}/${repo}` });
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
        ...(themeAutoUpdate ? {} : { themeVersion: await fetchThemeVersion() }),
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

<h1 class="page-title">{t('setupTitle')}</h1>

<form class="stack" onsubmit={submit}>
  <section class="card">
    <h2 class="section-title">{t('sectionDestination')}</h2>
    <div class="stack section-body">
      <fieldset class="field" aria-label={t('hostingService')}>
        <div class="choices">
          {#if isGitLab}
          <label class="choice">
            <input type="radio" name="provider" value="gitlab-pages" checked={selectedProvider === 'gitlab-pages'} onchange={() => onSelectProvider('gitlab-pages')} />
            <span class="choice-name">GitLab Pages</span>
            <span class="hint">{t('viaGitLabCi')}</span>
          </label>
          {:else}
          <label class="choice">
            <input type="radio" name="provider" value="github-pages" checked={selectedProvider === 'github-pages'} onchange={() => onSelectProvider('github-pages')} />
            <span class="choice-name">GitHub Pages</span>
            <span class="hint">{t('viaGitHubActions')}</span>
          </label>
          {/if}
          {#if cloudflareAvailable}
          <label class="choice">
            <input type="radio" name="provider" value="cloudflare-pages" checked={selectedProvider === 'cloudflare-pages'} onchange={() => onSelectProvider('cloudflare-pages')} />
            <span class="choice-name">Cloudflare Pages</span>
            <span class="hint">{t('viaCloudflare')}</span>
          </label>
          {/if}
        </div>
      </fieldset>
      {#if selectedProvider === 'cloudflare-pages'}
        <div class="stack">
          {#if cloudflareConnected}
            {#if cloudflareAccounts.length > 0}
              <div class="field">
                <label for="cloudflare-account">{t('cloudflareAccount')}</label>
                <select id="cloudflare-account" value={selectedCloudflareAccountId} onchange={(event) => onSelectCloudflareAccount((event.currentTarget as HTMLSelectElement).value)}>
                  {#each cloudflareAccounts as account (account.id)}
                    <option value={account.id}>{account.name}</option>
                  {/each}
                </select>
              </div>
            {:else}
              <p class="hint">{t('noCloudflareAccounts')}</p>
            {/if}
          {:else}
            <div class="actions">
              <button class="button" type="button" onclick={connect} disabled={connecting}>
                {t(connecting ? 'connecting' : 'connectCloudflare')}
              </button>
            </div>
          {/if}
          {#if cloudflareError}<p class="error-text">{cloudflareError}</p>{/if}
          <p class="hint">{t('cloudflareGitHint', { provider: isGitLab ? 'GitLab' : 'GitHub' })}</p>
        </div>
      {/if}
    </div>
  </section>

  <section class="card">
    <h2 class="section-title">{t('sectionBlog')}</h2>
    <div class="stack section-body">
      <div class="field">
        <label for="title">{t('blogName')}</label>
        <input id="title" type="text" bind:value={title} required />
      </div>
      <div class="field">
        <label for="repo">{t('destination')}</label>
        <div class="repo-input">
          <select id="owner" bind:value={owner} aria-label={t('account')} style="width: auto">
            {#each owners as o (o.login)}
              <option value={o.login}>{o.login}</option>
            {/each}
          </select>
          <span>/</span>
          <input id="repo" type="text" bind:value={repo} required />
        </div>
        {#if url}
          <p class="hint">{t('publicUrl', { url })}</p>
        {:else if selectedProvider === 'cloudflare-pages'}
          <p class="error-text">{t('cloudflareNameInvalid')}</p>
        {:else if repoValid}
          <p class="hint">{t('publicUrlLater')}</p>
        {:else}
          <p class="error-text">{t(isGitLab ? 'projectNameInvalid' : 'repoNameInvalid')}</p>
        {/if}
      </div>
    </div>
  </section>

  <!-- 見た目は最初は開いておき、選び終えたら閉じられるようにする -->
  <details class="card" open>
    <summary class="section-title">{t('sectionAppearance')}</summary>
    <div class="stack section-body">
      <fieldset class="field">
        <legend>{t('theme')}</legend>
        <div class="choices">
          {#each themes as th (th.name)}
            <label class="choice">
              <input type="radio" name="theme" value={th.name} bind:group={theme} />
              <span class="choice-name">{th.label}</span>
              <span class="hint">{t(th.note)}</span>
            </label>
          {/each}
        </div>
      </fieldset>
      <div class="preview">
        <div class="tabs" role="tablist" aria-label={t('preview')}>
          {#each views as v (v.id)}
            <button type="button" role="tab" class="tab" aria-selected={view === v.id} onclick={() => (view = v.id)}>{t(v.label)}</button>
          {/each}
        </div>
        <img class="preview-image" src={shot(theme, view)} alt={t('previewAlt', { theme })} />
      </div>
    </div>
  </details>

  <!-- 既定値のままでよい項目は折りたたむ -->
  <details class="card">
    <summary class="section-title">{t('advanced')}</summary>
    <div class="stack section-body">
      <div class="field">
        <label for="description">{t('description')}</label>
        <input id="description" type="text" bind:value={description} />
      </div>
      <div class="field">
        <label for="author">{t('author')}</label>
        <input id="author" type="text" bind:value={author} placeholder={owner} />
      </div>
      <div class="field">
        <label for="bio">{t('bio')}</label>
        <input id="bio" type="text" bind:value={bio} placeholder={t('bioPlaceholder')} />
        <p class="hint">{t('bioHint')}</p>
      </div>
      <fieldset class="field">
        <legend>{t('sidebarLinks')}</legend>
        {#each links as link, i}
          <div class="link-row">
            <i class={LINK_ICONS.find((d) => d.id === link.icon)?.icon} aria-hidden="true"></i>
            <select bind:value={link.icon} aria-label={t('linkType')}>
              {#each LINK_ICONS as d (d.id)}<option value={d.id}>{i18n.locale === 'en' ? d.nameEn : d.name}</option>{/each}
            </select>
            <input type="url" bind:value={link.url} placeholder={link.icon === 'mail' ? 'mailto:info@example.jp' : 'https://'} aria-label="URL" />
            <button class="icon-button" type="button" onclick={() => links.splice(i, 1)} aria-label={t('removeLink')} title={t('removeLink')}>
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        {/each}
        {#if !linksValid}<p class="error-text">{t('linkUrlInvalid')}</p>{/if}
        <div class="actions">
          <button class="button secondary" type="button" onclick={addLink}>
            <i class="fa-solid fa-plus" aria-hidden="true"></i> {t('addLink')}
          </button>
        </div>
      </fieldset>
      <label class="checkbox">
        <input type="checkbox" bind:checked={sidebar} />
        {t('showSidebar')}
      </label>
      <div class="field">
        <label for="pager-size">{t('pageSize')}</label>
        <input id="pager-size" type="number" min="1" max="100" bind:value={pagerSize} style="width: 8rem" />
        {#if !pagerSizeValid}<p class="error-text">{t('pageSizeInvalid')}</p>{/if}
        <p class="hint">{t('pageSizeHint')}</p>
      </div>
      <div class="field">
        <label for="language">{t('blogLanguage')}</label>
        <select id="language" bind:value={language} style="width: auto; justify-self: start">
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
      </div>
      {#if useCustomDomain}
        <div class="field">
          <label for="custom-domain">{t('customDomain')}</label>
          <input id="custom-domain" type="text" bind:value={customDomain} placeholder="blog.example.jp" autocomplete="off" spellcheck="false" />
          {#if !domainValid}
            <p class="error-text">{t('customDomainInvalid')}</p>
          {:else if domain}
            <p class="hint">{t('dnsBefore')}<code>{domain}</code>{t('dnsMiddle')}<code>{owner.toLowerCase()}.github.io</code>{t('dnsAfter')}<a href="https://docs.github.com/{i18n.locale}/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site" target="_blank" rel="noopener">{t('dnsLink')}</a>{t('dnsClose')}</p>
          {/if}
        </div>
      {/if}
      <label class="checkbox">
        <input type="checkbox" bind:checked={themeAutoUpdate} />
        {t('themeAutoUpdate')}
      </label>
      <p class="hint">{t(themeAutoUpdate ? 'themeAutoUpdateHint' : 'themePinnedHint')}</p>
      <label class="checkbox">
        <input type="checkbox" bind:checked={isPrivate} />
        {t(isGitLab ? 'createPrivateProject' : 'createPrivateRepo')}
      </label>
      {#if isPrivate}
        <p class="hint">
          {#if selectedProvider === 'github-pages'}{t('privatePaidPlan')}{/if}
          {t('privatePreview')}
        </p>
      {/if}
    </div>
  </details>

  {#if error}<p class="error-text">{error}</p>{/if}
  {#if resumable}
    <p class="hint">{t('resumeHint', { repo: `${owner}/${repo}` })}</p>
  {/if}
  <div class="actions">
    <button class="button" type="submit" disabled={busy || !canSubmit}>{t(resumable ? 'resume' : 'create')}</button>
  </div>
</form>
