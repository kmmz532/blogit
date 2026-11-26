<script lang="ts">
  import { t } from './lib/i18n.svelte';
  import { clearDraft } from './lib/draft';
  import { checkServiceStatus, DeployFailedError, DeployPendingError, GitHubClient, GitLabClient, isGitLabRepo, type ServiceStatus, type StatusService, runGitLabSetup, runSetup, steps, siteFiles, cloudflarePagesBaseURL, cloudflareBuildCommand, type BlogConfig, type SetupState, type StepId, type StepStatus } from '@blogit/core';
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
  // 待ち時間内に終わらなかったとき（失敗ではない）
  let pending = $state<DeployPendingError | null>(null);
  // ビルドと公開の手順で失敗したとき
  let deployFailed = $state(false);
  // ビルドが出力したエラー（GitHub Actions の注釈から取得する）
  let deployErrors = $state<string[]>([]);
  // 障害の可能性があるときに確認した、関係するサービスのステータス
  let serviceStatus = $state<ServiceStatus | null>(null);
  const serviceNames: Record<StatusService, string> = { github: 'GitHub', gitlab: 'GitLab', cloudflare: 'Cloudflare' };
  const repoService: StatusService = onGitLab ? 'gitlab' : 'github';
  const deployService: StatusService = config.provider === 'cloudflare-pages' ? 'cloudflare' : repoService;

  async function start() {
    running = true;
    error = '';
    pending = null;
    deployFailed = false;
    deployErrors = [];
    serviceStatus = null;
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
        // サイトのファイルが追加済みなら（再試行・読み直し後の再開も）、既定のブランチの最新コミットを使う
        if (setupState.commitSha === undefined) {
          setupState.commitSha = await repoClient.isBlogitSite(ref)
            ? await repoClient.getBranchHeadSha(ref, details.defaultBranch)
            : await repoClient.commitFiles(ref, details.defaultBranch, siteFiles(config, { branch: details.defaultBranch }), 'Set up blog with Blogit');
        }
        const commitSha = setupState.commitSha;
        report('push-site', 'done');

        report('wait-deploy', 'running');
        let project = await cf.getPagesProject(config.cloudflareAccountId, projectName);
        if (!project) {
          project = await cf.createPagesProject(config.cloudflareAccountId, {
            source: onGitLab ? 'gitlab' : 'github', owner: config.owner, ownerId: details.ownerId, repoId: details.id,
            repoName: projectName, branch: details.defaultBranch, buildCommand: cloudflareBuildCommand(config),
          });
        }
        const url = project.subdomain ? `https://${project.subdomain}/` : `https://${projectName}.pages.dev/`;
        // Git連携を設定する前に push 済みのコミットは webhook の対象外なので、
        // 最新コミットのデプロイがまだなければ Pages API から明示的に初回ビルドを開始する。
        let deployments = await cf.listDeployments(config.cloudflareAccountId, projectName);
        let deployment = deployments.find((item) => item.deployment_trigger?.metadata?.commit_hash === commitSha);
        // 前回のデプロイが失敗・中止していれば、新しくデプロイし直す
        if (!deployment || ['failure', 'canceled'].includes(deployment.latest_stage?.status ?? '')) {
          deployment = await cf.createDeployment(config.cloudflareAccountId, projectName, details.defaultBranch, commitSha);
          runUrl = deployment.url;
        }

        const deadline = Date.now() + 10 * 60 * 1000;
        let queued = true;
        while (Date.now() < deadline) {
          deployments = await cf.listDeployments(config.cloudflareAccountId, projectName);
          // 同じコミットのデプロイが複数あるときは、直前に作成したものを見る
          deployment = deployments.find((item) => item.id === deployment?.id)
            ?? deployments.find((item) => item.deployment_trigger?.metadata?.commit_hash === commitSha)
            ?? deployment;
          if (deployment) {
            runUrl = deployment.url;
            const stage = deployment.latest_stage;
            queued = !stage || stage.name === 'queued';
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
        if (!siteUrl) throw new DeployPendingError(runUrl, queued);
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
      const failedStep = (Object.keys(status) as StepId[]).find((id) => status[id] === 'running' || status[id] === 'error');
      if (e instanceof DeployPendingError) {
        // 失敗ではないため、エラーとしては表示しない
        error = '';
        pending = e;
        status['wait-deploy'] = 'pending';
      } else {
        if (!error) error = e instanceof Error ? e.message : String(e);
        if (failedStep) status[failedStep] = 'error';
        deployFailed = failedStep === 'wait-deploy';
        if (e instanceof DeployFailedError) deployErrors = e.details;
      }
      // 実行待ちのまま・ビルドの失敗・サーバーや通信のエラーは障害の可能性があるため、ステータスページを確認する
      const transient = /: 5\d\d |network|Failed to fetch|NetworkError/i.test(error);
      // ビルドのエラーが分かっているときは障害ではないため、確認しない
      if (pending || (deployFailed && !deployErrors.length) || transient) {
        serviceStatus = await checkServiceStatus(failedStep === 'wait-deploy' || pending ? deployService : repoService);
      }
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

  {#if pending}
    <p class="hint">{t(pending.queued ? 'deployQueued' : 'deployPending')}</p>
    <div class="actions">
      <button class="button" type="button" onclick={start} disabled={running}>{t('recheck')}</button>
    </div>
  {/if}

  {#if serviceStatus}
    <p class={serviceStatus.degraded ? 'error-text' : 'hint'}>
      {t(serviceStatus.degraded ? 'statusDegraded' : serviceStatus.degraded === false ? 'statusOk' : 'statusUnknown', { service: serviceNames[serviceStatus.service] })}
      {#each serviceStatus.incidents.slice(0, 3) as incident}
        <br /><a href={incident.url} target="_blank" rel="noopener">{incident.name}</a>
      {/each}
      <br /><a href={serviceStatus.pageUrl} target="_blank" rel="noopener">{t('statusLink', { service: serviceNames[serviceStatus.service] })}</a>
    </p>
  {/if}

  {#if error}
    <p class="error-text">{error}</p>
    {#if deployErrors.length}
      <pre class="deploy-errors">{deployErrors.join('
')}</pre>
      <p class="hint">{t('deployErrorHint')}</p>
    {:else if deployFailed}<p class="hint">{t('deployFailedHint')}</p>{/if}
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
    <p class="hint">{t('changeLaterBefore')}<a href="{siteUrl}admin/settings/" target="_blank" rel="noopener">{t('changeLaterLink')}</a>{t('changeLaterAfter')}</p>
  {/if}
</div>

<style>
  .deploy-errors {
    margin: 0;
    padding: 0.75rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 0.85rem;
    border-radius: 6px;
    border: 1px solid var(--border);
  }
</style>
