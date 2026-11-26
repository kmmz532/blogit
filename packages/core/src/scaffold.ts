import { GITLAB_COM, normalizeGitLabUrl } from './gitlab.ts';
import { fetchWithRetry } from './http.ts';
import type { BlogConfig, FileMap } from './types.ts';

export const HUGO_VERSION = '0.141.0';
const THEME_MODULE = 'github.com/kmmz532/blogit/themes';
const ADMIN_MODULE = 'github.com/kmmz532/hugo-gh-admin';

// Blogit 以外のテーマを使うか
export const isExternalTheme = (c: BlogConfig) => Boolean(c.externalTheme);

// themes.gohugo.io に載っているテーマの一覧（1 行に 1 つのモジュールのパス）
export const HUGO_THEMES_LIST_URL = 'https://raw.githubusercontent.com/gohugoio/hugoThemesSiteBuilder/main/themes.txt';

export function parseHugoThemesList(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && validateThemeModule(line));
}

// テーマの入力（モジュールのパスか、リポジトリの URL）をモジュールのパスにする。受け付けない形なら null。
// 例: https://github.com/owner/theme.git・https://github.com/owner/theme/tree/main → github.com/owner/theme
// themes には themes.gohugo.io の一覧を渡す。渡すと、テーマのページの URL（https://themes.gohugo.io/themes/<名前>/）も受け付ける
export function normalizeThemeModule(input: string, themes: string[] = []): string | null {
  const page = /^(?:https?:\/\/)?themes\.gohugo\.io\/themes\/([^/?#]+)/i.exec(input.trim());
  if (page) {
    const name = page[1].toLowerCase();
    // 名前はパスの最後の要素。末尾のメジャーバージョン（/v2 など）は除く
    const nameOf = (theme: string) => theme.replace(/\/v\d+$/, '').split('/').pop()!.toLowerCase();
    return themes.find((theme) => nameOf(theme) === name) ?? null;
  }
  let path = input.trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '');
  const [host = '', ...rest] = path.split('/');
  path = [host.toLowerCase(), ...rest].join('/');
  // GitHub はリポジトリまで（/tree/main などのページの URL を除く）。GitLab は /-/ 以降がページの URL
  if (host.toLowerCase() === 'github.com') path = path.split('/').slice(0, 3).join('/');
  path = path.replace(/\/-\/.*$/, '');
  return validateThemeModule(path) ? path : null;
}

// Hugo Modules のパスとして受け付ける形か（ホスト名/パス。スキームやバージョンは不可）
export function validateThemeModule(path: string): boolean {
  return path.length <= 200
    && /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[A-Za-z0-9._~-]+)+$/.test(path)
    && !path.startsWith(`${THEME_MODULE}/`);
}

// ビルド後の HTML に管理ボタン（hugo-gh-admin の浮かせる部品）を差し込むスクリプト。
// 管理画面からテーマを外部テーマに切り替えても動くように、テーマによらず生成する（Blogit のテーマのページには差し込まれない）
export const FLOAT_SCRIPT = 'scripts/gh-admin-float.sh';

export function floatScript(): string {
  return `#!/bin/sh
# ビルド後の HTML に、管理画面の浮かせるボタン（hugo-gh-admin の gh-admin/js/float.js）を読み込む 1 行を差し込む。
# 引数は公開 URL（例: https://example.org/blog/）。そのパスをスクリプトの URL の前に付ける。
# 管理画面の部品を組み込んだページ（<meta name="gh-admin"> がある）には差し込まない。
# ボタンを出さない場合は、hugo.toml の params.ghAdmin.float を false にする
set -eu
base=$(printf '%s' "\${1:-}" | sed -E 's#^[a-z]+://[^/]+##; s#/+$##')
tag="<script type=\"module\" src=\"$base/gh-admin/js/float.js\"></script>"
find public -name '*.html' | while IFS= read -r file; do
  # minify で属性の引用符が省かれる（name=gh-admin）ことがある
  grep -Eq '<meta[^>]+name="?gh-admin' "$file" && continue
  grep -q '</head>' "$file" || continue
  sed -i "s#</head>#$tag</head>#" "$file"
done
`;
}

// Cloudflare Pages のビルドコマンド。管理ボタンを差し込む（公開先はドメイン直下）
export function cloudflareBuildCommand(): string {
  return `hugo --minify --gc && sh ${FLOAT_SCRIPT}`;
}

// <owner>.github.io という名前のリポジトリはドメイン直下、それ以外は /<repo>/ に公開される。
// userSiteOrigin は <owner>.github.io に設定された独自ドメインのオリジン（例: https://example.jp）。設定時は /<repo>/ もそのドメイン配下になる
export function pagesBaseURL(owner: string, repo: string, userSiteOrigin?: string | null): string {
  const host = `${owner.toLowerCase()}.github.io`;
  const origin = userSiteOrigin ? userSiteOrigin.replace(/\/+$/, '') : `https://${host}`;
  return repo.toLowerCase() === host ? `${origin}/` : `${origin}/${repo}/`;
}

export function cloudflarePagesBaseURL(repo: string): string {
  const projectName = repo.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 58);
  return `https://${projectName}.pages.dev/`;
}

// gitlab.com の Pages の URL の目安。トップレベルのネームスペースがサブドメインになり、サブグループはパスに入る。
// 一意のドメインが有効なプロジェクトでは実際の URL と異なるため、ビルド時は CI_PAGES_URL を使う
export function gitlabPagesBaseURL(owner: string, repo: string): string {
  const [top, ...subgroups] = owner.toLowerCase().split('/');
  const host = `${top}.gitlab.io`;
  if (subgroups.length === 0 && repo.toLowerCase() === host) return `https://${host}/`;
  return `https://${host}/${[...subgroups, repo].join('/')}/`;
}

// 独自ドメインとして受け付ける形か（ホスト名のみ。スキーム・パス・ポートは不可）
export function validateCustomDomain(domain: string): boolean {
  return domain.length <= 253
    && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/i.test(domain);
}

// GitLab のプロジェクトのパスとして受け付ける形か
export function validateGitLabProjectPath(name: string): boolean {
  return /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9_])?$/.test(name)
    && !/\.(git|atom)$/i.test(name)
    && !/[._-]{2}/.test(name);
}

const gitlabUrl = (c: BlogConfig) => normalizeGitLabUrl(c.gitlabUrl ?? GITLAB_COM) ?? GITLAB_COM;
const isGitLabCom = (c: BlogConfig) => gitlabUrl(c) === GITLAB_COM;
// リポジトリが GitLab にあるか（公開先は GitLab Pages か Cloudflare Pages）
export const isGitLabRepo = (c: BlogConfig) => c.provider === 'gitlab-pages' || c.gitlabUrl !== undefined;
// 選択された公開先の URL。セルフホストの GitLab は Pages のドメインが不明なため / にする（ビルド時に CI_PAGES_URL で上書きする）
export function defaultBaseURL(c: BlogConfig): string {
  if (c.provider === 'cloudflare-pages') return cloudflarePagesBaseURL(c.repo);
  if (c.provider === 'gitlab-pages') return isGitLabCom(c) ? gitlabPagesBaseURL(c.owner, c.repo) : '/';
  return c.customDomain ? `https://${c.customDomain.toLowerCase()}/` : pagesBaseURL(c.owner, c.repo);
}

// TOML の基本文字列。JSON の文字列エスケープは TOML でもそのまま通る
const str = (s: string) => JSON.stringify(s);

// 記事カードの既定のサムネイル（テーマの static/blogit/ にある）。作成時に画像を選ばなかったときに使う
export const DEFAULT_THUMBNAIL = '/blogit/default-thumbnail.svg';

// サイドバーのリンクに選べるアイコン。生成するサイトのテーマは Font Awesome 6.5.2 を読み込む
export const LINK_ICONS = [
  { id: 'website', name: 'Webサイト', nameEn: 'Website', icon: 'fa-solid fa-house' },
  { id: 'github', name: 'GitHub', nameEn: 'GitHub', icon: 'fa-brands fa-github' },
  { id: 'gitlab', name: 'GitLab', nameEn: 'GitLab', icon: 'fa-brands fa-gitlab' },
  { id: 'x', name: 'X', nameEn: 'X', icon: 'fa-brands fa-x-twitter' },
  { id: 'twitter', name: 'Twitter（鳥のロゴ）', nameEn: 'Twitter (bird logo)', icon: 'fa-brands fa-twitter' },
  { id: 'bluesky', name: 'Bluesky', nameEn: 'Bluesky', icon: 'fa-brands fa-bluesky' },
  { id: 'mastodon', name: 'Mastodon', nameEn: 'Mastodon', icon: 'fa-brands fa-mastodon' },
  { id: 'threads', name: 'Threads', nameEn: 'Threads', icon: 'fa-brands fa-threads' },
  { id: 'instagram', name: 'Instagram', nameEn: 'Instagram', icon: 'fa-brands fa-instagram' },
  { id: 'youtube', name: 'YouTube', nameEn: 'YouTube', icon: 'fa-brands fa-youtube' },
  { id: 'facebook', name: 'Facebook', nameEn: 'Facebook', icon: 'fa-brands fa-facebook' },
  { id: 'rss', name: 'RSS', nameEn: 'RSS', icon: 'fa-solid fa-rss' },
  { id: 'mail', name: 'メール', nameEn: 'Email', icon: 'fa-solid fa-envelope' },
] as const;

function profileLinks(c: BlogConfig): string {
  return (c.links ?? []).flatMap(({ icon, url }) => {
    const def = LINK_ICONS.find((d) => d.id === icon);
    if (!def || !url) return [];
    // リンク名はブログの言語にそろえる
    const name = c.language === 'en' ? def.nameEn : def.name;
    return [`  [[params.links]]\n    name = ${str(name)}\n    url = ${str(url)}\n    icon = ${str(def.icon)}\n`];
  }).join('');
}

// リンクとして受け付ける URL か（http(s) と mailto）
export function validateLinkUrl(url: string): boolean {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

// baseURL は実際の公開 URL。省略時は選択された公開先の URL。branch は記事を保存するブランチ（リポジトリの既定のブランチ）
// 管理画面の「最新バージョンで再ビルド」の設定。GitHub Pages はワークフロー、GitLab Pages はパイプラインを実行する。
// Cloudflare Pages は push でビルドするため、空のコミットを積む（GitHub のみ。GitLab の API では空のコミットを作れない）
function buildSettings(c: BlogConfig): string {
  if (c.provider === 'github-pages') return '  buildWorkflow = "deploy.yml"';
  if (c.provider === 'gitlab-pages') return '  buildWorkflow = ".gitlab-ci.yml"';
  if (c.provider === 'cloudflare-pages' && !isGitLabRepo(c)) return '  buildCommit = true';
  return '';
}

export function hugoToml(c: BlogConfig, baseURL = defaultBaseURL(c), branch = 'main'): string {
  if (isExternalTheme(c)) return externalHugoToml(c, baseURL, branch);
  return `${siteHeader(c, baseURL)}
# 検索は /index.json を読む。outputs はテーマから引き継がれないのでここに書く
[outputs]
  home = ["HTML", "RSS", "JSON"]

[markup.highlight]
  noClasses = false

[markup.tableOfContents]
  startLevel = 2
  endLevel = 3

[params]
  description = ${str(c.description)}
  author = ${str(c.author)}
  footer = ${str(`© ${new Date().getFullYear()} ${c.author}`)}
${c.favicon ? `  icon = ${str(`/favicon.${c.favicon.ext}`)}\n` : ''}${c.favicon?.ext === 'png' ? '  appleIcon = "/favicon.png"\n' : ''}  defaultThumbnail = ${str(c.defaultThumbnail ? `/default-thumbnail.${c.defaultThumbnail.ext}` : DEFAULT_THUMBNAIL)}\n${c.bio ? `  bio = ${str(c.bio)}\n` : ''}${c.sidebar === false ? '  sidebar = false\n' : ''}${profileLinks(c)}
${adminSettings(c, branch)}

# テーマ（Blogit）。default / warm / cool から選べる
[[module.imports]]
  path = ${str(`${THEME_MODULE}/${c.theme}`)}
`;
}

// 外部テーマのサイト。Blogit のテーマ専用の設定（サイドバー・既定のサムネイルなど）は書かない
function externalHugoToml(c: BlogConfig, baseURL: string, branch: string): string {
  return `${siteHeader(c, baseURL)}
[params]
  description = ${str(c.description)}
  author = ${str(c.author)}

${adminSettings(c, branch)}

# テーマ（Blogit 以外）。設定はテーマの説明に従って追加する
[[module.imports]]
  path = ${str(c.externalTheme!)}

# 管理画面。管理ボタンはビルド後に ${FLOAT_SCRIPT} が差し込む
[[module.imports]]
  path = ${str(ADMIN_MODULE)}
`;
}

// テーマによらない設定
function siteHeader(c: BlogConfig, baseURL: string): string {
  return `title = ${str(c.title)}
baseURL = ${str(baseURL)}
languageCode = ${str(c.language)}
# 未設定だと en 扱いになり、画面の文言が英語になる
defaultContentLanguage = ${str(c.language)}
timeZone = ${str(c.language === 'ja' ? 'Asia/Tokyo' : 'UTC')}
timeout = "5m"
enableRobotsTXT = true

[pagination]
  pagerSize = ${c.pagerSize ?? 10}

[taxonomies]
  tag = "tags"
  category = "categories"
`;
}

function adminSettings(c: BlogConfig, branch: string): string {
  const repo = `${c.owner}/${c.repo}`;
  const gitlab = isGitLabRepo(c);
  // 管理画面は hugo-gh-admin（テーマが取り込む）。GitLab のサイトでは provider = "gitlab" にする
  const admin = `# 管理画面（hugo-gh-admin）。記事もサイト設定もこの${gitlab ? 'プロジェクト' : 'リポジトリ'}に保存する
[params.ghAdmin]
${gitlab ? `  provider = "gitlab"
  gitlabURL = ${str(gitlabUrl(c))}
` : ''}  lang = ${str(c.language)}
  repo = ${str(repo)}
  branch = ${str(branch)}
  siteRepo = ${str(repo)}
  siteBranch = ${str(branch)}
  siteConfigPath = "hugo.toml"${buildSettings(c) ? `
  # 管理画面の「更新」の「最新バージョンで再ビルド」の方法
${buildSettings(c)}` : ''}${c.adminLogin && !gitlab ? `
  # 「GitHub でログイン」（Blogit の OAuth App と認証用 Worker を利用する）
  oauthClientID = ${str(c.adminLogin.clientId)}
  oauthTokenURL = ${str(c.adminLogin.tokenUrl)}
  oauthRelayURL = ${str(c.adminLogin.relayUrl)}` : ''}`;
  return admin;
}

// コミットの SHA と日時から Go modules の疑似バージョンを作る（例: v0.0.0-20261126012345-0123456789ab）
export function pseudoVersion(sha: string, date: string): string {
  const time = new Date(date).toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `v0.0.0-${time}-${sha.slice(0, 12)}`;
}

// テーマのリポジトリの既定のブランチの最新コミットから、テーマを固定するバージョンを取得する
export async function fetchThemeVersion(): Promise<string> {
  const res = await fetchWithRetry('https://api.github.com/repos/kmmz532/blogit/commits/main', {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GET theme version: ${res.status} ${res.statusText}`);
  const data = await res.json() as { sha: string; commit: { committer: { date: string } } };
  return pseudoVersion(data.sha, data.commit.committer.date);
}

// themeVersion を指定した場合はテーマ（と共通部分の base）をそのバージョンに固定する。省略時はビルドのたびに最新バージョンを利用する
export function goMod(c: BlogConfig): string {
  const host = isGitLabRepo(c)
    ? new URL(normalizeGitLabUrl(c.gitlabUrl ?? GITLAB_COM) ?? GITLAB_COM).host
    : 'github.com';
  const require = c.themeVersion && !isExternalTheme(c)
    ? `
require (
	${THEME_MODULE}/base ${c.themeVersion}
	${THEME_MODULE}/${c.theme} ${c.themeVersion}
)
`
    : '';
  return `module ${host}/${c.owner}/${c.repo}

go 1.24.0
${require}`;
}

export function deployWorkflow(branch = 'main'): string {
  return `name: deploy

on:
  push:
    branches: [${JSON.stringify(branch)}]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1
      - uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: "${HUGO_VERSION}"
          extended: true
      - uses: actions/cache@v4
        with:
          path: \${{ runner.temp }}/hugo_cache
          key: hugo-\${{ hashFiles('assets/**', 'hugo.toml', 'go.sum') }}
          restore-keys: hugo-
      # 公開 URL は GitHub が決定する（独自ドメインや、<owner>.github.io に設定した独自ドメイン配下の /<repo>/ に対応する）
      - id: pages
        uses: actions/configure-pages@v5
      # 失敗したときは Hugo の Error 行を注釈にする（Blogit の作成画面が API から読み、エラーとして表示する）
      - shell: bash
        run: |
          if ! hugo --minify --gc --baseURL "\${{ steps.pages.outputs.base_url }}/" 2>&1 | tee "\$RUNNER_TEMP/hugo.log"; then
            grep '^Error' "\$RUNNER_TEMP/hugo.log" | sed 's/^/::error::/'
            exit 1
          fi
        env:
          HUGO_CACHEDIR: \${{ runner.temp }}/hugo_cache
      # 管理ボタン（hugo-gh-admin の浮かせる部品）を差し込む。Blogit のテーマのページには差し込まれない
      - run: sh ${FLOAT_SCRIPT} "\${{ steps.pages.outputs.base_url }}/"
      - uses: actions/upload-pages-artifact@v4
        with:
          path: public

  # アーティファクトはジョブが終わってから確定するので、公開は別のジョブで行う
  deploy:
    needs: build
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`;
}

// GitLab CI で Hugo をビルドし、GitLab Pages に公開する。hugomods/hugo の exts イメージは Go と Git を含むため Hugo Modules を取得できる
export function gitlabCi(): string {
  return `pages:
  image: hugomods/hugo:exts-${HUGO_VERSION}
  variables:
    GIT_DEPTH: 1
    HUGO_CACHEDIR: $CI_PROJECT_DIR/.hugo_cache
  cache:
    key: hugo
    paths:
      - .hugo_cache
  # 公開 URL は GitLab が決定する（一意のドメイン・独自ドメイン・セルフホストに対応する）
  script:
    - hugo --minify --gc --baseURL "\${CI_PAGES_URL}/"
    # 管理ボタン（hugo-gh-admin の浮かせる部品）を差し込む。Blogit のテーマのページには差し込まれない
    - sh ${FLOAT_SCRIPT} "\${CI_PAGES_URL}/"
  artifacts:
    paths:
      - public
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
`;
}

function firstPost(c: BlogConfig, now: Date): { path: string; content: string } {
  const date = now.toISOString().slice(0, 10);
  const ja = c.language === 'ja';
  return {
    path: `content/posts/${date}-hello.md`,
    content: `---
title: ${str(ja ? 'はじめての記事' : 'Hello, world')}
date: ${now.toISOString()}
categories: [${str(ja ? 'お知らせ' : 'News')}]
tags: ["blogit"]
---

${
  isExternalTheme(c)
    ? ja
      ? 'Blogit でブログを作りました。公開 URL の /login/ からログインすると、画面の左下に表示されるボタンから記事を書けます。'
      : 'This blog was created with Blogit. Log in at /login/ on the site, then write posts from the button at the bottom left.'
    : ja
      ? 'Blogit でブログを作りました。右上の鉛筆アイコンからログインすると、ブラウザで記事を書けます。'
      : 'This blog was created with Blogit. Log in from the pencil icon at the top right to write posts in your browser.'
}
`,
  };
}

function readme(c: BlogConfig, baseURL: string): string {
  return `# ${c.title}

${c.description}

[Blogit](https://github.com/kmmz532/blogit) で作成した Hugo ブログです。

${baseURL === '/'
    ? `- 記事の編集: 公開 URL の \`/admin/\`
`
    : `- 公開 URL: ${baseURL}
- 記事の編集: ${baseURL}admin/
`}`;
}

// 単一リポジトリ型のサイト一式
export function siteFiles(c: BlogConfig, { now = new Date(), baseURL = defaultBaseURL(c), branch = 'main' } = {}): FileMap {
  const post = firstPost(c, now);
  const files: FileMap = {
    'hugo.toml': hugoToml(c, baseURL, branch),
    'go.mod': goMod(c),
    '.gitignore': 'public/\nresources/\n.hugo_build.lock\n.hugo_cache/\n',
    'README.md': readme(c, baseURL),
    'static/images/.gitkeep': '',
    [post.path]: post.content,
  };
  if (c.favicon) files[`static/favicon.${c.favicon.ext}`] = { base64: c.favicon.base64 };
  const external = isExternalTheme(c);
  // 既定のサムネイルは Blogit のテーマだけが使う
  if (c.defaultThumbnail && !external) files[`static/default-thumbnail.${c.defaultThumbnail.ext}`] = { base64: c.defaultThumbnail.base64 };
  files[FLOAT_SCRIPT] = floatScript();
  if (c.provider === 'github-pages') files['.github/workflows/deploy.yml'] = deployWorkflow(branch);
  if (c.provider === 'gitlab-pages') files['.gitlab-ci.yml'] = gitlabCi();
  return files;
}
