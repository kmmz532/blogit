const RETRY_STATUSES = [429, 502, 503, 504];
const MAX_ATTEMPTS = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 一時的な障害（通信エラー・429・502〜504）のときは、間隔を延ばしながら再試行する。
// POST などは二重に実行されると困るため、GET と HEAD だけを再試行する
export async function fetchWithRetry(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const retryable = method === 'GET' || method === 'HEAD';
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (e) {
      if (!retryable || attempt >= MAX_ATTEMPTS) throw e;
      await sleep(1000 * 2 ** (attempt - 1));
      continue;
    }
    if (!retryable || attempt >= MAX_ATTEMPTS || !RETRY_STATUSES.includes(res.status)) return res;
    // Retry-After（秒）があれば従う。長すぎる場合は 30 秒にとどめる
    const after = Number(res.headers.get('Retry-After'));
    await sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 30) * 1000 : 1000 * 2 ** (attempt - 1));
  }
}
