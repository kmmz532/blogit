// GitHub OAuth のコード交換と Cloudflare API の限定プロキシを提供する Worker。
// アクセストークンは保存・ログ出力せず、リクエスト単位で中継する。
const API_URL = 'https://api.cloudflare.com/client/v4';
const MAX_BODY_BYTES = 64 * 1024;

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim());
  if (!allowed.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// GitHub の OAuth コードをトークンに交換する。Client Secret を Worker の外に出さないための中継
async function exchangeGitHubCode(code, env) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : { error: 'github_unreachable' };
  return data.access_token ? { access_token: data.access_token, scope: data.scope } : { error: data.error ?? 'exchange_failed' };
}

// hugo-gh-admin の「GitHub でログイン」用。Blogit で作ったブログはドメインが決まっていないため、どの origin からも呼べるようにする。
// コードは GitHub が中継ページ（OAuth App のコールバック URL）に渡したもので、コード自体がログインの証明になる
const OPEN_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

async function handleAdminToken(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: OPEN_CORS });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, OPEN_CORS);
  const { code } = await request.json().catch(() => ({}));
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(code)) return json({ error: 'missing_code' }, 400, OPEN_CORS);
  const result = await exchangeGitHubCode(code, env);
  return json(result, result.access_token ? 200 : 400, OPEN_CORS);
}

function json(body, status = 200, cors = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  });
}

function validCloudflareRoute(url, method) {
  const path = url.pathname;
  if (method === 'GET' && path === '/cloudflare/accounts') {
    return url.searchParams.size <= 1
      && (!url.searchParams.has('per_page') || /^(?:[1-9]|[1-4][0-9]|50)$/.test(url.searchParams.get('per_page')));
  }
  if (method === 'POST' && /^\/cloudflare\/accounts\/[a-f\d]{32}\/pages\/projects$/.test(path)) {
    return url.search === '';
  }
  const match = path.match(/^\/cloudflare\/accounts\/([a-f\d]{32})\/pages\/projects\/([a-z0-9-]+)(\/deployments)?$/);
  if (!match) return false;
  if (match[3] && method === 'POST') return url.search === '';
  if (method !== 'GET') return false;
  if (match[3]) {
    return url.searchParams.size <= 1
      && (!url.searchParams.has('per_page') || /^(?:[1-9]|[1-4][0-9]|50)$/.test(url.searchParams.get('per_page')));
  }
  return url.search === '';
}

async function handleCloudflare(request, cors) {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, cors);
  }
  if (!validCloudflareRoute(url, request.method)) {
    return json({ error: 'not_found' }, 404, cors);
  }

  const authorization = request.headers.get('Authorization') ?? '';
  if (!/^Bearer\s+\S.{0,4095}$/.test(authorization)) {
    return json({ error: 'missing_or_invalid_bearer_token' }, 401, cors);
  }

  const headers = new Headers({ Authorization: authorization, Accept: 'application/json' });
  let body;
  if (request.method === 'POST') {
    const contentType = request.headers.get('Content-Type') ?? '';
    const contentLength = Number(request.headers.get('Content-Length') ?? 0);
    if (!contentType.toLowerCase().startsWith('application/json')) {
      return json({ error: 'content_type_must_be_json' }, 415, cors);
    }
    if (contentLength > MAX_BODY_BYTES) return json({ error: 'request_body_too_large' }, 413, cors);
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ error: 'request_body_too_large' }, 413, cors);
    }
    let input;
    try {
      input = JSON.parse(rawBody);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid');
    } catch {
      return json({ error: 'invalid_json_body' }, 400, cors);
    }

    // Pages の Git 連携デプロイ API は multipart/form-data を要求する。
    // Worker 側で FormData を組み立て、boundary は fetch に自動生成させる。
    if (url.pathname.endsWith('/deployments')) {
      if (typeof input.branch !== 'string' || !/^[A-Za-z0-9._/-]{1,255}$/.test(input.branch)) {
        return json({ error: 'invalid_branch' }, 400, cors);
      }
      if (typeof input.commit_hash !== 'string' || !/^[a-f0-9]{7,64}$/i.test(input.commit_hash)) {
        return json({ error: 'invalid_commit_hash' }, 400, cors);
      }
      body = new FormData();
      body.set('branch', input.branch);
      body.set('commit_hash', input.commit_hash);
      body.set('commit_message', typeof input.commit_message === 'string' ? input.commit_message.slice(0, 500) : 'Blogit initial deployment');
      body.set('commit_dirty', 'false');
    } else {
      body = rawBody;
      headers.set('Content-Type', 'application/json');
    }
  }

  const apiPath = url.pathname.slice('/cloudflare'.length);
  try {
    const upstream = await fetch(`${API_URL}${apiPath}${url.search}`, {
      method: request.method,
      headers,
      ...(body === undefined ? {} : { body }),
    });
    const responseHeaders = new Headers(cors);
    responseHeaders.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json');
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return json({ error: 'cloudflare_api_unreachable' }, 502, cors);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/github/token') return handleAdminToken(request, env);
    const cors = getCorsHeaders(request, env);
    if (!cors) return json({ error: 'origin_not_allowed' }, 403);

    if (request.method === 'OPTIONS') {
      const requestedMethod = request.headers.get('Access-Control-Request-Method');
      const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') ?? '')
        .split(',').map((header) => header.trim().toLowerCase()).filter(Boolean);
      if (!['GET', 'POST'].includes(requestedMethod)
        || requestedHeaders.some((header) => !['authorization', 'content-type'].includes(header))) {
        return json({ error: 'preflight_not_allowed' }, 403, cors);
      }
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/token' && request.method === 'POST') {
      const { code } = await request.json().catch(() => ({}));
      if (typeof code !== 'string' || !code) return json({ error: 'missing_code' }, 400, cors);

      const result = await exchangeGitHubCode(code, env);
      return json(result, result.access_token ? 200 : 400, cors);
    }

    if (url.pathname.startsWith('/cloudflare/')) {
      return handleCloudflare(request, cors);
    }
    return json({ error: 'not_found' }, 404, cors);
  },
};
