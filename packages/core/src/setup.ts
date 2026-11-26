import type { GitHubClient } from './github.ts';
import { defaultBaseURL, siteFiles } from './scaffold.ts';
import type { BlogConfig, RepoRef } from './types.ts';

// セットアップの途中経過。中断しても、この値から続きを実行できる
export interface SetupState {
  commitSha?: string;
  runUrl?: string;
  siteUrl?: string;
}

export interface SetupContext {
  gh: GitHubClient;
  config: BlogConfig;
  state: SetupState;
  ref: RepoRef;
}

export interface Step {
  id: StepId;
  // すでに完了していれば true（再実行時に飛ばす）
  done(ctx: SetupContext): Promise<boolean>;
  run(ctx: SetupContext): Promise<void>;
}

export type StepId = 'create-repo' | 'enable-pages' | 'push-site' | 'wait-deploy';

const POLL_MS = 5000;
const DEPLOY_TIMEOUT_MS = 10 * 60 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Pages を先に有効化してから push する。逆だと最初のデプロイが Pages 未設定で失敗する
export const steps: Step[] = [
  {
    id: 'create-repo',
    done: ({ gh, ref }) => gh.repoExists(ref),
    async run({ gh, config, ref }) {
      await gh.createRepo(ref.owner, config.ownerType, ref.repo, config.description, config.private);
      // 作成直後は API から見えないことがあるので、見えるまで待つ
      for (let i = 0; i < 10 && !(await gh.repoExists(ref)); i++) await sleep(1000);
    },
  },
  {
    id: 'enable-pages',
    // 独自ドメインを指定した場合は、そのドメインが設定済みであることまで確認する
    async done({ gh, config, ref }) {
      const url = await gh.getPagesUrl(ref);
      if (url === null) return false;
      return !config.customDomain || new URL(url).host === config.customDomain.toLowerCase();
    },
    async run({ gh, config, ref }) {
      await gh.enablePages(ref);
      if (config.customDomain) await gh.setPagesDomain(ref, config.customDomain.toLowerCase());
    },
  },
  {
    id: 'push-site',
    // サイトのファイルが追加済みなら（前回の途中で止まった場合も）、既定のブランチの最新コミットのデプロイを待つ
    async done({ gh, ref, state }) {
      if (state.commitSha !== undefined) return true;
      if (!(await gh.isBlogitSite(ref))) return false;
      state.commitSha = await gh.getBranchHeadSha(ref, await gh.getDefaultBranch(ref));
      return true;
    },
    async run({ gh, config, ref, state }) {
      const branch = await gh.getDefaultBranch(ref);
      // 独自ドメイン（例: ユーザーの github.io に設定したドメイン）があれば、その URL を baseURL にする
      // 独自ドメイン指定時は https にする（証明書の発行前は API が http の URL を返すため）
      const baseURL = config.customDomain ? undefined : (await gh.getPagesUrl(ref)) ?? undefined;
      state.commitSha = await gh.commitFiles(ref, branch, siteFiles(config, { baseURL, branch }), 'Set up blog with Blogit');
    },
  },
  {
    id: 'wait-deploy',
    done: async ({ state }) => state.siteUrl !== undefined,
    async run({ gh, config, ref, state }) {
      const sha = state.commitSha;
      if (!sha) throw new Error('push-site has not run');
      const deadline = Date.now() + DEPLOY_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const run = await gh.findWorkflowRun(ref, sha);
        if (run) {
          state.runUrl = run.html_url;
          if (run.status === 'completed') {
            if (run.conclusion !== 'success') throw new Error(`Deploy ${run.conclusion}: ${run.html_url}`);
            state.siteUrl = config.customDomain ? defaultBaseURL(config) : (await gh.getPagesUrl(ref)) ?? defaultBaseURL(config);
            return;
          }
        }
        await sleep(POLL_MS);
      }
      throw new Error(`Deploy timed out: ${state.runUrl ?? ''}`);
    },
  },
];

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

// 手順を順に実行する。完了済みの手順は飛ばすので、失敗後に同じ state で呼べば続きから再開する
export async function runSetup(
  gh: GitHubClient,
  config: BlogConfig,
  state: SetupState,
  onProgress: (id: StepId, status: StepStatus, error?: unknown) => void,
): Promise<SetupState> {
  const ctx: SetupContext = { gh, config, state, ref: { owner: config.owner, repo: config.repo } };
  for (const step of steps) {
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

// リポジトリ名として GitHub が受け付ける形か
export function validateRepoName(name: string): boolean {
  return /^[A-Za-z0-9._-]{1,100}$/.test(name) && name !== '.' && name !== '..';
}
