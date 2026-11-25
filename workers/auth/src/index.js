// GitHub OAuth のコードをアクセストークンに交換するだけの Worker。
// client_secret をブラウザに出さないために置く。トークンは保存もログ出力もしない
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
    const cors = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' }
      : {};
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (new URL(request.url).pathname !== '/token' || request.method !== 'POST') return json({ error: 'not_found' }, 404);
    if (!cors['Access-Control-Allow-Origin']) return json({ error: 'origin_not_allowed' }, 403);

    const { code } = await request.json().catch(() => ({}));
    if (typeof code !== 'string' || !code) return json({ error: 'missing_code' }, 400);

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
    });
    const data = await res.json();
    if (data.error || !data.access_token) return json({ error: data.error ?? 'exchange_failed' }, 400);
    return json({ access_token: data.access_token, scope: data.scope });
  },
};
