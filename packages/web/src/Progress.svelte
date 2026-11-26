<script lang="ts">
  import { t } from './lib/i18n.svelte';
  import { clearDraft } from './lib/draft';
  import { GitHubClient, GitLabClient, isGitLabRepo, runGitLabSetup, runSetup, steps, siteFiles, cloudflarePagesBaseURL, type BlogConfig, type SetupState, type StepId, type StepStatus } from '@blogit/core';
  import { CloudflareClient, loadCloudflareToken } from './lib/cloudflare';
  import { onMount } from 'svelte';
  import { saveToken } from './lib/auth';
  import { saveGitLab } from './lib/gitlab';
  import TokenHelp from './TokenHelp.svelte';

  let { gh = null, gl = null, config, onBack }: { gh?: GitHubClient | null; gl?: GitLabClient | null; config: BlogConfig; onBack: () => void } = $props();
  // isGitLab: GitLab Pages に公開する。onGitLab: リポジトリが GitLab にある（Cloudflare Pages の場合も含む）
  const isGitLab = config.provider === 'gitlab-pages';
  const onGitLab = isGitLabRepo(config);

  const labels: Record<StepId, string> = $derived({
    'create-repo': t(onGitLab ? 'stepCreateProject' : 'stepCreateRepo'),
    'enable-pages': t(isGitLab ? 'stepGitLabPages' : config.provider === 'cloudflare-pages' ? 'stepRepoInfo' : 'stepEnableGitHubPages'),
    'push-site': t('stepPushSite'),
    'wait-deploy': t('stepDeploy'),
  });
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
  let glClient = $state(gl);
  let newToken = $state('');

  async function start() {
    running = true;
    error = '';
    const report = (id: StepId, s: StepStatus, e?: unknown) => {
      status[id] = s;
      if (e) error = e instanceof Error ? e.message : String(e);
    };
    try {
      if (isGitLab) {
        if (!glClient) throw new Error(t('notLoggedIn', { service: 'GitLab' }));
        await runGitLabSetup(glClient, config, setupState, (id, s, e) => {
          status[id] = s;
          runUrl = setupState.runUrl ?? '';
          if (e) {
            error = e instanceof Error ? e.message : String(e);
            if (/: 40[34] /.test(error)) error += t('gitlabTokenScope');
          }
        });
        siteUrl = setupState.siteUrl ?? '';
      } else if (config.provider === 'cloudflare-pages') {
        // GitHubClient と GitLabClient は、ここで使うメソッドの形が同じ
        const repoClient = onGitLab ? glClient : client;
        if (!repoClient) throw new Error(t('notLoggedIn', { service: onGitLab ? 'GitLab' : 'GitHub' }));
        const token = loadCloudflareToken();
        if (!token) throw new Error(t('cloudflareNotConnected'));
        if (!config.cloudflareAccountId) throw new Error(t('cloudflareAccountMissing'));
        const cf = new CloudflareClient(token);
        const ref = { owner: config.owner, repo: config.repo };
        const projectName = config.repo.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 58);
        if (!projectName) throw new Error(t('cloudflareProjectNameFailed'));

        report('create-repo', 'running');
        if (!(await repoClient.repoExists(ref))) {
          await repoClient.createRepo(config.owner, config.ownerType, config.repo, config.description, config.private);
          for (let i = 0; i < 10 && !(await repoClient.repoExists(ref)); i++) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        report('create-repo', 'done');

        report('enable-pages', 'running');
        const details = await repoClient.getRepositoryDetails(ref);
        report('enable-pages', 'done');

        report('push-site', 'running');
        const commitSha = await repoClient.commitFiles(ref, details.defaultBranch, siteFiles(config, { branch: details.defaultBranch }), 'Set up blog with Blogit');
        setupState.commitSha = commitSha;
        report('push-site', 'done');

        report('wait-deploy', 'running');
        let project = await cf.getPagesProject(config.cloudflareAccountId, projectName);
        if (!project) {
          project = await cf.createPagesProject(config.cloudflareAccountId, {
            source: onGitLab ? 'gitlab' : 'github', owner: config.owner, ownerId: details.ownerId, repoId: details.id,
            repoName: projectName, branch: details.defaultBranch,
          });
        }
        const url = project.subdomain ? `https://${project.subdomain}/` : `https://${projectName}.pages.dev/`;
        // Git連携を設定する前に push 済みのコミットは webhook の対象外なので、
        // 最新コミットのデプロイがまだなければ Pages API から明示的に初回ビルドを開始する。
        let deployments = await cf.listDeployments(config.cloudflareAccountId, projectName);
        let deployment = deployments.find((item) => item.deployment_trigger?.metadata?.commit_hash === commitSha);
        if (!deployment) {
          deployment = await cf.createDeployment(config.cloudflareAccountId, projectName, details.defaultBranch, commitSha);
          runUrl = deployment.url;
        }

        const deadline = Date.now() + 10 * 60 * 1000;
        while (Date.now() < deadline) {
          deployments = await cf.listDeployments(config.cloudflareAccountId, projectName);
          deployment = deployments.find((item) => item.deployment_trigger?.metadata?.commit_hash === commitSha) ?? deployment;
          if (deployment) {
            runUrl = deployment.url;
            const stage = deployment.latest_stage;
            if (stage?.status === 'success') {
              siteUrl = url;
              setupState.siteUrl = url;
              break;
            }
            if (stage?.status === 'failure' || stage?.status === 'canceled') {
              throw new Error(`Cloudflare Pages deployment ${stage.status}: ${deployment.url}`);
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        if (!siteUrl) throw new Error(`Cloudflare Pages deployment timed out: ${runUrl}`);
        report('wait-deploy', 'done');
      } else {
        if (!client) throw new Error(t('notLoggedIn', { service: 'GitHub' }));
        await runSetup(client, config, setupState, (id, s, e) => {
          status[id] = s;
          runUrl = setupState.runUrl ?? '';
          if (e) {
            error = e instanceof Error ? e.message : String(e);
            if (/: 40[34] /.test(error)) error += t('githubTokenScope');
            else if (id === 'enable-pages' && config.private && /: 422 /.test(error)) error += t('privatePagesPaid');
          }
        });
        siteUrl = setupState.siteUrl ?? '';
      }
      // 作成が完了したら、入力内容の下書きは不要になる
      if (siteUrl) clearDraft();
    } catch (e) {
      if (!error) error = e instanceof Error ? e.message : String(e);
    } finally {
      running = false;
    }
  }

  function retryWithToken(e: SubmitEvent) {
    e.preventDefault();
    if (onGitLab && glClient) {
      glClient = new GitLabClient(glClient.baseUrl, newToken.trim());
      saveGitLab(glClient.baseUrl, newToken.trim());
    } else {
      client = new GitHubClient(newToken.trim());
      saveToken(newToken.trim());
    }
    newToken = '';
    start();
  }

  onMount(start);
</script>

<h1 class="page-title">{t(siteUrl ? 'published' : 'creating')}</h1>
<p class="lead">{config.owner}/{config.repo}</p>

<div class="stack">
  <ol class="card steps">
    {#each steps as s (s.id)}
      <li class="step {status[s.id]}">
        <i class={icons[status[s.id]]} aria-hidden="true"></i>
        <div>
          <div>{labels[s.id]}</div>
          {#if s.id === 'wait-deploy' && runUrl}
            <a class="hint" href={runUrl} target="_blank" rel="noopener">{t(config.provider === 'cloudflare-pages' ? 'viewCloudflareDeploy' : isGitLab ? 'viewPipeline' : 'viewActions')}</a>
          {/if}
        </div>
      </li>
    {/each}
  </ol>

  {#if error}
    <p class="error-text">{error}</p>
    <div class="actions">
      <button class="button" type="button" onclick={start} disabled={running}>{t('retry')}</button>
      <button class="button secondary" type="button" onclick={onBack} disabled={running}>{t('backToForm')}</button>
    </div>
    <!-- 権限不足のときだけ使うため、折りたたんでおく -->
    <details class="card">
      <summary>{t('changeToken')}</summary>
    <form class="stack" onsubmit={retryWithToken}>
      <div class="field">
        <label for="new-token">{t('newToken')}</label>
        <input id="new-token" type="password" bind:value={newToken} autocomplete="off" required />
        {#if !onGitLab}<TokenHelp />{/if}
      </div>
      <div class="actions">
        <button class="button" type="submit" disabled={running || !newToken.trim()}>{t('rerun')}</button>
      </div>
    </form>
    </details>
  {/if}

  {#if siteUrl}
    <div class="actions">
      <a class="button" href={siteUrl} target="_blank" rel="noopener">{t('openBlog')}</a>
      <a class="button secondary" href="{siteUrl}admin/" target="_blank" rel="noopener">{t('writePost')}</a>
      <a class="button secondary" href={onGitLab && glClient ? `${glClient.baseUrl}/${config.owner}/${config.repo}` : `https://github.com/${config.owner}/${config.repo}`} target="_blank" rel="noopener">{t('repository')}</a>
    </div>
  {/if}
</div>
