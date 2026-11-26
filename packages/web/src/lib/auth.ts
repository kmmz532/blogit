// GitHub のログイン。OAuth App が設定されていれば OAuth、無ければ開発用に PAT を入力する。
// トークンは sessionStorage にだけ置く（タブを閉じると消える）。サーバーには保存しない
const TOKEN_KEY = 'blogit:token';
const STATE_KEY = 'blogit:oauth-state';

const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;
// 末尾の / は付いていてもいなくてもよい
const workerUrl = (import.meta.env.VITE_AUTH_WORKER_URL as string | undefined)?.replace(/\/+$/, '');

// リポジトリ作成（非公開を含む）・ワークフローの追加・所属 Organization の取得に必要な権限
const SCOPES = ['repo', 'workflow', 'read:org'];

export const oauthEnabled = Boolean(clientId && workerUrl);

// 作成するブログの管理画面で「GitHub でログイン」に使う設定（Blogit の OAuth App・認証用 Worker・中継ページ）
export function adminLoginSettings(): { clientId: string; tokenUrl: string; relayUrl: string } | null {
  if (!clientId || !workerUrl) return null;
  return { clientId, tokenUrl: `${workerUrl}/github/token`, relayUrl: location.origin + location.pathname };
}

function storage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function loadToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function saveToken(token: string): void {
  storage()?.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  storage()?.removeItem(TOKEN_KEY);
}

export function startOAuth(): void {
  const state = crypto.randomUUID();
  storage()?.setItem(STATE_KEY, state);
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId!);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('redirect_uri', location.origin + location.pathname);
  location.assign(url);
}

// GitHub から戻ってきたとき（?code=...&state=...）にトークンへ交換する。戻りでなければ null
export async function completeOAuth(): Promise<string | null> {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  // ブログの管理画面への中継中（index.html の先頭の処理）は、Blogit のログインとして扱わない
  if (!code || (window as { blogitRelaying?: boolean }).blogitRelaying) return null;
  history.replaceState(null, '', location.pathname);
  const expected = storage()?.getItem(STATE_KEY);
  storage()?.removeItem(STATE_KEY);
  if (!expected || params.get('state') !== expected) throw new Error('OAuth state mismatch');
  const res = await fetch(`${workerUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data.error ?? 'Token exchange failed');
  saveToken(data.access_token);
  return data.access_token;
}
