import { fetchWithRetry, HUGO_VERSION } from '@blogit/core';

const CLIENT_ID = '9a85458daa8ab9012af72788828c7c21';
const AUTH_URL = 'https://dash.cloudflare.com/oauth2/auth';
const TOKEN_URL = 'https://dash.cloudflare.com/oauth2/token';
const TOKEN_KEY = 'blogit:cloudflare-token';
const STATE_KEY = 'blogit:cloudflare-oauth-state';
const VERIFIER_KEY = 'blogit:cloudflare-code-verifier';
const WORKER_URL = ((import.meta.env.VITE_AUTH_WORKER_URL as string | undefined) || 'https://blogit-auth.kmmz1127.workers.dev').replace(/\/+$/, '');
const SCOPES = ['account-settings.read', 'page.write'];

function storage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
}

export function loadCloudflareToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function clearCloudflareToken(): void {
  storage()?.removeItem(TOKEN_KEY);
  storage()?.removeItem(STATE_KEY);
  storage()?.removeItem(VERIFIER_KEY);
}

export async function startCloudflareOAuth(): Promise<void> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64Url(new Uint8Array(await sha256(verifier)));
  const state = crypto.randomUUID();
  const redirectUri = location.origin + location.pathname;
  storage()?.setItem(STATE_KEY, state);
  storage()?.setItem(VERIFIER_KEY, verifier);

  const url = new URL(AUTH_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  location.assign(url);
}

export async function completeCloudflareOAuth(): Promise<string | null> {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const expectedState = storage()?.getItem(STATE_KEY);
  if (!code || !expectedState || params.get('state') !== expectedState) return null;

  // 失敗しても ?code= を残さない（残ると GitHub の戻りとして扱われ、state の不一致でログアウトする）
  history.replaceState(null, '', location.pathname);
  const verifier = storage()?.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('Cloudflare OAuth code verifier is missing');
  const redirectUri = location.origin + location.pathname;
  clearCloudflareToken();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (error) {
    throw new Error(`Cloudflare token exchange network/CORS error: ${error instanceof Error ? error.message : String(error)}`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? 'Cloudflare token exchange failed');
  }
  storage()?.setItem(TOKEN_KEY, data.access_token);
  storage()?.removeItem(STATE_KEY);
  storage()?.removeItem(VERIFIER_KEY);
  return data.access_token as string;
}

export interface CloudflareAccount {
  id: string;
  name: string;
}

export interface CloudflareDeployment {
  id: string;
  url: string;
  latest_stage?: { name: string; status: string };
  deployment_trigger?: { metadata?: { commit_hash?: string } };
}

class CloudflareApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export class CloudflareClient {
  constructor(private readonly token: string) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!WORKER_URL) throw new Error('Cloudflare API Worker URL is not configured (VITE_AUTH_WORKER_URL)');
    let response: Response;
    try {
      response = await fetchWithRetry(`${WORKER_URL}/cloudflare${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...init.headers,
        },
      });
    } catch (error) {
      throw new Error(`Cloudflare API Worker network/CORS error: ${error instanceof Error ? error.message : String(error)}`);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success !== true) {
      const message = data.errors?.map((error: { message?: string }) => error.message).filter(Boolean).join(', ')
        || data.error
        || `Cloudflare API error: ${response.status}`;
      throw new CloudflareApiError(response.status, message);
    }
    return data.result as T;
  }

  async listAccounts(): Promise<CloudflareAccount[]> {
    const result = await this.request<{ id: string; name: string }[]>('/accounts?per_page=50');
    return (result ?? []).map((account: { id: string; name: string }) => ({
      id: account.id,
      name: account.name,
    }));
  }

  async getPagesProject(accountId: string, projectName: string): Promise<{ subdomain?: string } | null> {
    try {
      return await this.request(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`);
    } catch (error) {
      if (error instanceof CloudflareApiError && error.status === 404) return null;
      throw error;
    }
  }

  async createPagesProject(accountId: string, repo: {
    // source は Cloudflare の Git 連携の種類。gitlab は gitlab.com のみ（セルフホストは非対応）
    source: 'github' | 'gitlab'; owner: string; ownerId: number; repoId: number; repoName: string; branch: string;
    // ビルドコマンド（@blogit/core の cloudflareBuildCommand）
    buildCommand: string;
  }): Promise<{ subdomain?: string }> {
    return this.request(`/accounts/${accountId}/pages/projects`, {
      method: 'POST',
      body: JSON.stringify({
        name: repo.repoName.toLowerCase(),
        production_branch: repo.branch,
        build_config: {
          build_command: repo.buildCommand,
          destination_dir: 'public',
          root_dir: '/',
        },
        deployment_configs: {
          preview: { env_vars: {
            HUGO_VERSION: { type: 'plain_text', value: HUGO_VERSION },
            GO_VERSION: { type: 'plain_text', value: '1.24.0' },
          } },
          production: { env_vars: {
            HUGO_VERSION: { type: 'plain_text', value: HUGO_VERSION },
            GO_VERSION: { type: 'plain_text', value: '1.24.0' },
          } },
        },
        source: {
          type: repo.source,
          config: {
            owner: repo.owner,
            owner_id: String(repo.ownerId),
            repo_id: String(repo.repoId),
            repo_name: repo.repoName,
            production_branch: repo.branch,
            production_deployments_enabled: true,
            preview_deployment_setting: 'none',
            pr_comments_enabled: false,
          },
        },
      }),
    });
  }

  async createDeployment(accountId: string, projectName: string, branch: string, commitSha: string): Promise<CloudflareDeployment> {
    return this.request(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/deployments`, {
      method: 'POST',
      body: JSON.stringify({
        branch,
        commit_hash: commitSha,
        commit_message: 'Initial Blogit deployment',
        commit_dirty: false,
      }),
    });
  }

  async listDeployments(accountId: string, projectName: string): Promise<CloudflareDeployment[]> {
    return this.request(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}/deployments?per_page=10`);
  }
}
