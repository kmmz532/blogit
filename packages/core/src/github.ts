import type { FileMap, Owner, RepoRef } from './types.ts';

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// ブラウザから GitHub REST API を直接呼ぶ薄いクライアント。トークンはメモリにだけ持つ
export class GitHubClient {
  constructor(private readonly token: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new GitHubError(res.status, `${method} ${path}: ${res.status} ${data.message ?? res.statusText}`);
    }
    return res.status === 204 ? (undefined as T) : res.json();
  }

  async getViewer(): Promise<Owner> {
    const u = await this.request<{ login: string; avatar_url: string }>('GET', '/user');
    return { login: u.login, type: 'User', avatarUrl: u.avatar_url };
  }

  // 自分と、自分が所属する Organization
  async listOwners(): Promise<Owner[]> {
    const [viewer, orgs] = await Promise.all([
      this.getViewer(),
      this.request<{ login: string; avatar_url: string }[]>('GET', '/user/orgs'),
    ]);
    return [viewer, ...orgs.map((o) => ({ login: o.login, type: 'Organization' as const, avatarUrl: o.avatar_url }))];
  }

  async repoExists({ owner, repo }: RepoRef): Promise<boolean> {
    try {
      await this.request('GET', `/repos/${owner}/${repo}`);
      return true;
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return false;
      throw e;
    }
  }

  // README だけの初期コミット付きで作る（Git Data API でコミットを積むには既存のブランチが要る）
  async createRepo(owner: string, ownerType: Owner['type'], repo: string, description: string): Promise<void> {
    const path = ownerType === 'Organization' ? `/orgs/${owner}/repos` : '/user/repos';
    await this.request('POST', path, { name: repo, description, private: false, auto_init: true });
  }

  async getRepositoryDetails({ owner, repo }: RepoRef): Promise<{ id: number; ownerId: number; defaultBranch: string }> {
    const r = await this.request<{ id: number; default_branch: string; owner: { id: number } }>('GET', `/repos/${owner}/${repo}`);
    return { id: r.id, ownerId: r.owner.id, defaultBranch: r.default_branch };
  }

  async getDefaultBranch(ref: RepoRef): Promise<string> {
    return (await this.getRepositoryDetails(ref)).defaultBranch;
  }

  // 複数ファイルを 1 コミットで追加する。返り値はコミットの SHA
  async commitFiles(ref: RepoRef, branch: string, files: FileMap, message: string): Promise<string> {
    const base = `/repos/${ref.owner}/${ref.repo}/git`;
    const head = await this.request<{ object: { sha: string } }>('GET', `${base}/ref/heads/${branch}`);
    const parent = await this.request<{ tree: { sha: string } }>('GET', `${base}/commits/${head.object.sha}`);
    const tree = await this.request<{ sha: string }>('POST', `${base}/trees`, {
      base_tree: parent.tree.sha,
      tree: Object.entries(files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })),
    });
    const commit = await this.request<{ sha: string }>('POST', `${base}/commits`, {
      message,
      tree: tree.sha,
      parents: [head.object.sha],
    });
    await this.request('PATCH', `${base}/refs/heads/${branch}`, { sha: commit.sha });
    return commit.sha;
  }

  // 公開元を GitHub Actions にする。有効化済みなら 409 が返るので成功扱い
  async enablePages({ owner, repo }: RepoRef): Promise<void> {
    try {
      await this.request('POST', `/repos/${owner}/${repo}/pages`, { build_type: 'workflow' });
    } catch (e) {
      if (e instanceof GitHubError && e.status === 409) return;
      throw e;
    }
  }

  async getPagesUrl({ owner, repo }: RepoRef): Promise<string | null> {
    try {
      const p = await this.request<{ html_url: string }>('GET', `/repos/${owner}/${repo}/pages`);
      return p.html_url;
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return null;
      throw e;
    }
  }

  // 指定コミットで起動したワークフローの実行（まだ無ければ null）
  async findWorkflowRun({ owner, repo }: RepoRef, sha: string): Promise<WorkflowRun | null> {
    const r = await this.request<{ workflow_runs: WorkflowRun[] }>(
      'GET',
      `/repos/${owner}/${repo}/actions/runs?head_sha=${sha}&per_page=1`,
    );
    return r.workflow_runs[0] ?? null;
  }
}

export interface WorkflowRun {
  id: number;
  status: 'queued' | 'in_progress' | 'completed' | string;
  conclusion: 'success' | 'failure' | 'cancelled' | null | string;
  html_url: string;
}
