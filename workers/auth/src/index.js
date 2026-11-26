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
  if (!match || method !== 'GET') return false;
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
    body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return json({ error: 'request_body_too_large' }, 413, cors);
    }
    try {
      if (!body || typeof JSON.parse(body) !== 'object' || Array.isArray(JSON.parse(body))) {
        return json({ error: 'invalid_json_body' }, 400, cors);
      }
    } catch {
      return json({ error: 'invalid_json_body' }, 400, cors);
    }
    headers.set('Content-Type', 'application/json');
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

      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error || !data.access_token) return json({ error: data.error ?? 'exchange_failed' }, 400, cors);
      return json({ access_token: data.access_token, scope: data.scope }, 200, cors);
    }

    if (url.pathname.startsWith('/cloudflare/')) {
      return handleCloudflare(request, cors);
    }
    return json({ error: 'not_found' }, 404, cors);
  },
};
