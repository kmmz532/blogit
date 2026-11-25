<script lang="ts">
  import { runSetup, steps, type BlogConfig, type GitHubClient, type SetupState, type StepId, type StepStatus } from '@blogit/core';
  import { onMount } from 'svelte';

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

  async function start() {
    running = true;
    error = '';
    try {
      await runSetup(gh, config, setupState, (id, s, e) => {
        status[id] = s;
        runUrl = setupState.runUrl ?? '';
        if (e) error = e instanceof Error ? e.message : String(e);
      });
      siteUrl = setupState.siteUrl ?? '';
    } catch {
      // エラーは onProgress で表示済み
    } finally {
      running = false;
    }
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
  {/if}

  {#if siteUrl}
    <div class="actions">
      <a class="button" href={siteUrl} target="_blank" rel="noopener">ブログを開く</a>
      <a class="button secondary" href="{siteUrl}admin/" target="_blank" rel="noopener">記事を書く</a>
      <a class="button secondary" href="https://github.com/{config.owner}/{config.repo}" target="_blank" rel="noopener">リポジトリ</a>
    </div>
  {/if}
</div>
