import { GITLAB_COM, normalizeGitLabUrl } from '@blogit/core';

// GitLab のログイン。gitlab.com は OAuth（PKCE、Client Secret 不要）、セルフホストは Personal Access Token を利用する。
// トークンとインスタンスの URL は sessionStorage にだけ置く（タブを閉じると消える）
const TOKEN_KEY = 'blogit:gitlab-token';
const URL_KEY = 'blogit:gitlab-url';
const STATE_KEY = 'blogit:gitlab-oauth-state';
const VERIFIER_KEY = 'blogit:gitlab-code-verifier';

const clientId = import.meta.env.VITE_GITLAB_CLIENT_ID as string | undefined;
// プロジェクトの作成・ファイルの追加・パイプラインの確認に必要な権限
const SCOPES = ['api'];

export const gitlabOAuthEnabled = Boolean(clientId);

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

export function loadGitLab(): { url: string; token: string } | null {
  const token = storage()?.getItem(TOKEN_KEY);
  if (!token) return null;
  return { url: storage()?.getItem(URL_KEY) ?? GITLAB_COM, token };
}

export function saveGitLab(url: string, token: string): void {
  storage()?.setItem(URL_KEY, normalizeGitLabUrl(url) ?? GITLAB_COM);
  storage()?.setItem(TOKEN_KEY, token);
}

export function clearGitLab(): void {
  for (const key of [TOKEN_KEY, URL_KEY, STATE_KEY, VERIFIER_KEY]) storage()?.removeItem(key);
}

export async function startGitLabOAuth(): Promise<void> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const state = crypto.randomUUID();
  storage()?.setItem(STATE_KEY, state);
  storage()?.setItem(VERIFIER_KEY, verifier);
  const url = new URL(`${GITLAB_COM}/oauth/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId!);
  url.searchParams.set('redirect_uri', location.origin + location.pathname);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  location.assign(url);
}

// gitlab.com から戻ってきたとき（?code=...&state=...）にトークンへ交換する。GitLab の戻りでなければ null
export async function completeGitLabOAuth(): Promise<{ url: string; token: string } | null> {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const expected = storage()?.getItem(STATE_KEY);
  if (!code || !expected || params.get('state') !== expected) return null;
  const verifier = storage()?.getItem(VERIFIER_KEY);
  history.replaceState(null, '', location.pathname);
  storage()?.removeItem(STATE_KEY);
  storage()?.removeItem(VERIFIER_KEY);
  if (!verifier) throw new Error('GitLab OAuth code verifier is missing');

  const res = await fetch(`${GITLAB_COM}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId!,
      code,
      redirect_uri: location.origin + location.pathname,
      code_verifier: verifier,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data.error_description ?? data.error ?? 'GitLab token exchange failed');
  saveGitLab(GITLAB_COM, data.access_token);
  return { url: GITLAB_COM, token: data.access_token };
}
