import type { GitLabClient } from './gitlab.ts';
import { defaultBaseURL, siteFiles } from './scaffold.ts';
import type { SetupState, StepId, StepStatus } from './setup.ts';
import type { BlogConfig, RepoRef } from './types.ts';

const POLL_MS = 5000;
const DEPLOY_TIMEOUT_MS = 15 * 60 * 1000;
// パイプラインの成功後、Pages への反映（pages:deploy）が終わるまで公開 URL の取得を試みる回数
const PAGES_URL_RETRIES = 12;
const BRANCH = 'main';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GitLabSetupContext {
  gl: GitLabClient;
  config: BlogConfig;
  state: SetupState;
  ref: RepoRef;
}

interface GitLabStep {
  id: StepId;
  done(ctx: GitLabSetupContext): Promise<boolean>;
  run(ctx: GitLabSetupContext): Promise<void>;
}

// GitLab Pages はプロジェクト作成時の pages_access_level と .gitlab-ci.yml の pages ジョブで有効になるため、enable-pages は確認だけ行う
export const gitlabSteps: GitLabStep[] = [
  {
    id: 'create-repo',
    done: ({ gl, ref }) => gl.repoExists(ref),
    async run({ gl, config, ref }) {
      await gl.createRepo(ref.owner, config.ownerType, ref.repo, config.description);
      for (let i = 0; i < 10 && !(await gl.repoExists(ref)); i++) await sleep(1000);
    },
  },
  {
    id: 'enable-pages',
    done: async () => true,
    async run() {},
  },
  {
    id: 'push-site',
    done: async ({ state }) => state.commitSha !== undefined,
    async run({ gl, config, ref, state }) {
      state.commitSha = await gl.commitFiles(ref, BRANCH, siteFiles(config), 'Set up blog with Blogit');
    },
  },
  {
    id: 'wait-deploy',
    done: async ({ state }) => state.siteUrl !== undefined,
    async run({ gl, config, ref, state }) {
      const sha = state.commitSha;
      if (!sha) throw new Error('push-site has not run');
      const deadline = Date.now() + DEPLOY_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const pipeline = await gl.findPipeline(ref, sha);
        if (pipeline) {
          state.runUrl = pipeline.web_url;
          if (pipeline.status === 'success') {
            let url: string | null = null;
            for (let i = 0; i < PAGES_URL_RETRIES && !url; i++) {
              url = await gl.getPagesUrl(ref);
              if (!url) await sleep(POLL_MS);
            }
            const fallback = defaultBaseURL(config);
            state.siteUrl = url ?? (fallback === '/' ? `${gl.baseUrl}/${ref.owner}/${ref.repo}/pages` : fallback);
            return;
          }
          if (['failed', 'canceled', 'skipped'].includes(pipeline.status)) {
            throw new Error(`Pipeline ${pipeline.status}: ${pipeline.web_url}`);
          }
        }
        await sleep(POLL_MS);
      }
      throw new Error(`Deploy timed out: ${state.runUrl ?? ''}`);
    },
  },
];

// 手順を順に実行する。完了済みの手順は飛ばすので、失敗後に同じ state で呼べば続きから再開する
export async function runGitLabSetup(
  gl: GitLabClient,
  config: BlogConfig,
  state: SetupState,
  onProgress: (id: StepId, status: StepStatus, error?: unknown) => void,
): Promise<SetupState> {
  const ctx: GitLabSetupContext = { gl, config, state, ref: { owner: config.owner, repo: config.repo } };
  for (const step of gitlabSteps) {
    onProgress(step.id, 'running');
    try {
      if (!(await step.done(ctx))) await step.run(ctx);
      onProgress(step.id, 'done');
    } catch (e) {
      onProgress(step.id, 'error', e);
      throw e;
    }
  }
  return state;
}
