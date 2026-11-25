<script lang="ts">
  import { pagesBaseURL, validateRepoName, type BlogConfig, type GitHubClient, type Owner, type ThemeName } from '@blogit/core';

  let { gh, owners, onSubmit }: { gh: GitHubClient; owners: Owner[]; onSubmit: (c: BlogConfig) => void } = $props();

  // 見本の色は各テーマの theme.css の背景・文字・リンクの色
  const themes: { name: ThemeName; label: string; colors: string[] }[] = [
    { name: 'default', label: 'Default', colors: ['#ffffff', '#1a1a1a', '#0a63d8'] },
    { name: 'warm', label: 'Warm', colors: ['#fbf7f1', '#3b2f2a', '#b8532a'] },
    { name: 'cool', label: 'Cool', colors: ['#f5f8fb', '#14202b', '#0a7aa3'] },
  ];

  let owner = $state(owners[0].login);
  let repo = $state('blog');
  let title = $state('');
  let description = $state('');
  let author = $state(owners[0].login);
  let theme = $state<ThemeName>('default');
  let language = $state<'ja' | 'en'>('ja');
  let busy = $state(false);
  let error = $state('');

  const repoValid = $derived(validateRepoName(repo));
  const url = $derived(repoValid ? pagesBaseURL(owner, repo) : '');

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
<p class="lead">入力した内容で GitHub にリポジトリを作り、GitHub Pages に公開します。あとから管理画面で変更できます。</p>

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
        <p class="hint">公開 URL: {url}</p>
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
            <span class="swatches">
              {#each t.colors as c}<span style:background={c}></span>{/each}
            </span>
            <span class="choice-name">{t.label}</span>
          </label>
        {/each}
      </div>
    </fieldset>
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
