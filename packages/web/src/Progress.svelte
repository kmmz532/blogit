<script lang="ts">
  import { GitHubClient, runSetup, steps, type BlogConfig, type SetupState, type StepId, type StepStatus } from '@blogit/core';
  import { onMount } from 'svelte';
  import { saveToken } from './lib/auth';
  import TokenHelp from './TokenHelp.svelte';

  let { gh, config, onBack }: { gh: GitHubClient; config: BlogConfig; onBack: () => void } = $props();

  const labels: Record<StepId, string> = {
    'create-repo': 'リポジトリを作成',
    'enable-pages': 'GitHub Pages を有効化',
    'push-site': 'ブログのファイルを追加',
    'wait-deploy': '初回のビルドと公開（数分かかります）',
  };
  const icons: Record<StepStatus, string> = {
    pending: 'fa-regular fa-circle',
    running: 'fa-solid fa-spinner fa-spin',
    done: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-xmark',
  };

  // 失敗しても同じ state で再実行すれば、完了済みの手順を飛ばして続きから進む
  const setupState: SetupState = {};
  let status = $state<Record<StepId, StepStatus>>(Object.fromEntries(steps.map((s) => [s.id, 'pending'])) as Record<StepId, StepStatus>);
  let error = $state('');
  let running = $state(false);
  let siteUrl = $state('');
  let runUrl = $state('');
  // 権限不足で止まったときは、トークンを入れ直して続きから再実行できる
  let client = $state(gh);
  let newToken = $state('');

  async function start() {
    running = true;
    error = '';
    try {
      await runSetup(client, config, setupState, (id, s, e) => {
        status[id] = s;
        runUrl = setupState.runUrl ?? '';
        if (e) {
          error = e instanceof Error ? e.message : String(e);
          if (/: 40[34] /.test(error)) error += '（トークンの権限が足りない可能性があります。下で権限を確認して入れ直してください）';
        }
      });
      siteUrl = setupState.siteUrl ?? '';
    } catch {
      // エラーは onProgress で表示済み
    } finally {
      running = false;
    }
  }

  function retryWithToken(e: SubmitEvent) {
    e.preventDefault();
    client = new GitHubClient(newToken.trim());
    saveToken(newToken.trim());
    newToken = '';
    start();
  }

  onMount(start);
</script>

<h1 class="page-title">{siteUrl ? '公開しました' : '作成しています'}</h1>
<p class="lead">{config.owner}/{config.repo}</p>

<div class="stack">
  <ol class="card steps">
    {#each steps as s (s.id)}
      <li class="step {status[s.id]}">
        <i class={icons[status[s.id]]} aria-hidden="true"></i>
        <div>
          <div>{labels[s.id]}</div>
          {#if s.id === 'wait-deploy' && runUrl}
            <a class="hint" href={runUrl} target="_blank" rel="noopener">Actions のログを見る</a>
          {/if}
        </div>
      </li>
    {/each}
  </ol>

  {#if error}
    <p class="error-text">{error}</p>
    <div class="actions">
      <button class="button" type="button" onclick={start} disabled={running}>続きから再実行</button>
      <button class="button secondary" type="button" onclick={onBack} disabled={running}>入力に戻る</button>
    </div>
    <form class="card stack" onsubmit={retryWithToken}>
      <div class="field">
        <label for="new-token">トークンを入れ直して再実行</label>
        <input id="new-token" type="password" bind:value={newToken} autocomplete="off" required />
        <TokenHelp />
      </div>
      <div class="actions">
        <button class="button" type="submit" disabled={running || !newToken.trim()}>このトークンで続きから再実行</button>
      </div>
    </form>
  {/if}

  {#if siteUrl}
    <div class="actions">
      <a class="button" href={siteUrl} target="_blank" rel="noopener">ブログを開く</a>
      <a class="button secondary" href="{siteUrl}admin/" target="_blank" rel="noopener">記事を書く</a>
      <a class="button secondary" href="https://github.com/{config.owner}/{config.repo}" target="_blank" rel="noopener">リポジトリ</a>
    </div>
  {/if}
</div>
