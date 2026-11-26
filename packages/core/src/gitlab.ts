import { fetchWithRetry } from './http.ts';
import type { FileMap, Owner, RepoRef } from './types.ts';

export const GITLAB_COM = 'https://gitlab.com';

export class GitLabError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// GitLab インスタンスの URL を https://host[/path] の形にそろえる。不正なら null
export function normalizeGitLabUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

// ブラウザから GitLab REST API（v4）を直接呼ぶ薄いクライアント。トークンはメモリにだけ持つ
export class GitLabClient {
  readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = normalizeGitLabUrl(baseUrl) ?? GITLAB_COM;
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetchWithRetry(`${this.baseUrl}/api/v4${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = typeof data.message === 'string' ? data.message : JSON.stringify(data.message ?? data.error ?? res.statusText);
      throw new GitLabError(res.status, `${method} ${path}: ${res.status} ${message}`);
    }
    return res.status === 204 ? (undefined as T) : res.json();
  }

  private static project({ owner, repo }: RepoRef): string {
    return encodeURIComponent(`${owner}/${repo}`);
  }

  async getViewer(): Promise<Owner> {
    const u = await this.request<{ username: string; avatar_url: string | null }>('GET', '/user');
    return { login: u.username, type: 'User', avatarUrl: u.avatar_url ?? '' };
  }

  // 自分と、プロジェクトを作成できる（Maintainer 以上の）グループ
  async listOwners(): Promise<Owner[]> {
    const [viewer, groups] = await Promise.all([
      this.getViewer(),
      this.request<{ full_path: string; avatar_url: string | null }[]>('GET', '/groups?min_access_level=40&per_page=100&order_by=path'),
    ]);
    return [
      viewer,
      ...groups.map((g) => ({ login: g.full_path, type: 'Organization' as const, avatarUrl: g.avatar_url ?? '' })),
    ];
  }

  async repoExists(ref: RepoRef): Promise<boolean> {
    try {
      await this.request('GET', `/projects/${GitLabClient.project(ref)}`);
      return true;
    } catch (e) {
      if (e instanceof GitLabError && e.status === 404) return false;
      throw e;
    }
  }

  // 空のプロジェクトを作る。非公開のプロジェクトでも Pages は誰でも閲覧できるようにする
  async createRepo(owner: string, ownerType: Owner['type'], repo: string, description: string, isPrivate = false): Promise<void> {
    let namespaceId: number | undefined;
    if (ownerType === 'Organization') {
      namespaceId = (await this.request<{ id: number }>('GET', `/namespaces/${encodeURIComponent(owner)}`)).id;
    }
    await this.request('POST', '/projects', {
      name: repo,
      path: repo,
      description,
      visibility: isPrivate ? 'private' : 'public',
      pages_access_level: 'public',
      default_branch: 'main',
      ...(namespaceId === undefined ? {} : { namespace_id: namespaceId }),
    });
  }

  // 複数ファイルを 1 コミットで追加する。ブランチが無ければ作られる。返り値はコミットの SHA
  async commitFiles(ref: RepoRef, branch: string, files: FileMap, message: string): Promise<string> {
    const commit = await this.request<{ id: string }>('POST', `/projects/${GitLabClient.project(ref)}/repository/commits`, {
      branch,
      commit_message: message,
      actions: Object.entries(files).map(([file_path, content]) => ({ action: 'create', file_path, content })),
    });
    return commit.id;
  }

  // Cloudflare Pages の Git 連携に渡す ID と既定のブランチ（空のプロジェクトは default_branch が無いため main）
  async getRepositoryDetails(ref: RepoRef): Promise<{ id: number; ownerId: number; defaultBranch: string }> {
    const p = await this.request<{ id: number; default_branch: string | null; namespace: { id: number } }>('GET', `/projects/${GitLabClient.project(ref)}`);
    return { id: p.id, ownerId: p.namespace.id, defaultBranch: p.default_branch ?? 'main' };
  }

  // ファイルの中身（テキスト）。ファイルかブランチがなければ null
  async getFileText(ref: RepoRef, path: string, branch = 'main'): Promise<string | null> {
    const res = await fetchWithRetry(
      `${this.baseUrl}/api/v4/projects/${GitLabClient.project(ref)}/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(branch)}`,
      { headers: { Authorization: `Bearer ${this.token}` } },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new GitLabError(res.status, `GET ${path}: ${res.status} ${res.statusText}`);
    return res.text();
  }

  // Blogit が作成したサイトのファイルが追加済みか（途中で止まったプロジェクトの再開に使う）
  async isBlogitSite(ref: RepoRef): Promise<boolean> {
    const branch = (await this.getRepositoryDetails(ref)).defaultBranch;
    const toml = await this.getFileText(ref, 'hugo.toml', branch);
    return toml !== null && toml.includes('[params.ghAdmin]') && toml.includes(`siteRepo = "${ref.owner}/${ref.repo}"`);
  }

  // ファイルが 1 つもないか。セットアップがファイルの追加前に止まった場合の再開に使う
  async isEmptyRepo(ref: RepoRef): Promise<boolean> {
    try {
      const items = await this.request<unknown[]>('GET', `/projects/${GitLabClient.project(ref)}/repository/tree?per_page=1`);
      return items.length === 0;
    } catch (e) {
      // リポジトリが空のときは 404 が返る
      if (e instanceof GitLabError && e.status === 404) return true;
      throw e;
    }
  }

  async getBranchHeadSha(ref: RepoRef, branch: string): Promise<string> {
    const b = await this.request<{ commit: { id: string } }>('GET', `/projects/${GitLabClient.project(ref)}/repository/branches/${encodeURIComponent(branch)}`);
    return b.commit.id;
  }

  async getDefaultBranch(ref: RepoRef): Promise<string> {
    return (await this.getRepositoryDetails(ref)).defaultBranch;
  }

  // 失敗・中止したパイプラインのジョブを再実行する
  async retryPipeline(ref: RepoRef, pipelineId: number): Promise<void> {
    await this.request('POST', `/projects/${GitLabClient.project(ref)}/pipelines/${pipelineId}/retry`);
  }

  // 公開 URL（初回のデプロイ前や、Pages の API が無い古い GitLab では null）
  async getPagesUrl(ref: RepoRef): Promise<string | null> {
    try {
      const p = await this.request<{ url?: string }>('GET', `/projects/${GitLabClient.project(ref)}/pages`);
      return p.url ? p.url.replace(/\/?$/, '/') : null;
    } catch (e) {
      if (e instanceof GitLabError && (e.status === 404 || e.status === 403)) return null;
      throw e;
    }
  }

  // 指定コミットで起動したパイプライン（まだ無ければ null）
  async findPipeline(ref: RepoRef, sha: string): Promise<Pipeline | null> {
    const r = await this.request<Pipeline[]>('GET', `/projects/${GitLabClient.project(ref)}/pipelines?sha=${sha}&per_page=1`);
    return r[0] ?? null;
  }
}

export interface Pipeline {
  id: number;
  // created / pending / running / success / failed / canceled / skipped / manual など
  status: string;
  web_url: string;
}
