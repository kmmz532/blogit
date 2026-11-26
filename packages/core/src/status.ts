// サービスのステータスページ。GitHub と Cloudflare は Statuspage の API（CORS 許可）から障害の有無を取得できる
export type StatusService = 'github' | 'gitlab' | 'cloudflare';

const PAGES: Record<StatusService, string> = {
  github: 'https://www.githubstatus.com/',
  gitlab: 'https://status.gitlab.com/',
  cloudflare: 'https://www.cloudflarestatus.com/',
};
// セットアップに関係するコンポーネント
const COMPONENTS: Partial<Record<StatusService, string[]>> = {
  github: ['Actions', 'Pages', 'API Requests', 'Git Operations'],
  cloudflare: ['Pages', 'API'],
};

export interface ServiceStatus {
  service: StatusService;
  pageUrl: string;
  // 障害が報告されているか。取得できない（GitLab や通信エラー）場合は null
  degraded: boolean | null;
  // 障害が報告されているコンポーネントと、未解決のインシデント
  components: string[];
  incidents: { name: string; url: string }[];
}

interface Summary {
  components: { name: string; status: string }[];
  incidents: { name: string; shortlink?: string; status: string }[];
}

export async function checkServiceStatus(service: StatusService): Promise<ServiceStatus> {
  const pageUrl = PAGES[service];
  const unknown: ServiceStatus = { service, pageUrl, degraded: null, components: [], incidents: [] };
  const targets = COMPONENTS[service];
  if (!targets) return unknown;
  try {
    const res = await fetch(`${pageUrl}api/v2/summary.json`);
    if (!res.ok) return unknown;
    const data = (await res.json()) as Summary;
    const components = data.components
      .filter((c) => targets.includes(c.name) && c.status !== 'operational')
      .map((c) => c.name);
    const incidents = data.incidents
      .filter((i) => i.status !== 'resolved' && i.status !== 'postmortem')
      .map((i) => ({ name: i.name, url: i.shortlink ?? pageUrl }));
    return { service, pageUrl, degraded: components.length > 0 || incidents.length > 0, components: [...new Set(components)], incidents };
  } catch {
    return unknown;
  }
}
