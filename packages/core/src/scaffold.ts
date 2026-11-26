import { GITLAB_COM, normalizeGitLabUrl } from './gitlab.ts';
import type { BlogConfig, FileMap } from './types.ts';

export const HUGO_VERSION = '0.141.0';
const THEME_MODULE = 'github.com/kmmz532/blogit/themes';

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
  return pagesBaseURL(c.owner, c.repo);
}

// TOML の基本文字列。JSON の文字列エスケープは TOML でもそのまま通る
const str = (s: string) => JSON.stringify(s);

// baseURL は実際の公開 URL。省略時は選択された公開先の URL。branch は記事を保存するブランチ（リポジトリの既定のブランチ）
export function hugoToml(c: BlogConfig, baseURL = defaultBaseURL(c), branch = 'main'): string {
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
  siteConfigPath = "hugo.toml"`;
  return `title = ${str(c.title)}
baseURL = ${str(baseURL)}
languageCode = ${str(c.language)}
# 未設定だと en 扱いになり、画面の文言が英語になる
defaultContentLanguage = ${str(c.language)}
timeZone = ${str(c.language === 'ja' ? 'Asia/Tokyo' : 'UTC')}
timeout = "5m"
enableRobotsTXT = true

[pagination]
  pagerSize = 10

[taxonomies]
  tag = "tags"
  category = "categories"

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

${admin}

# テーマ（Blogit）。default / warm / cool から選べる
[[module.imports]]
  path = ${str(`${THEME_MODULE}/${c.theme}`)}
`;
}

// 依存の版は初回ビルドで Hugo が解決する（その後は hugo mod get で固定する）
export function goMod(c: BlogConfig): string {
  const host = isGitLabRepo(c)
    ? new URL(normalizeGitLabUrl(c.gitlabUrl ?? GITLAB_COM) ?? GITLAB_COM).host
    : 'github.com';
  return `module ${host}/${c.owner}/${c.repo}

go 1.24.0
`;
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
      - run: hugo --minify --gc --baseURL "\${{ steps.pages.outputs.base_url }}/"
        env:
          HUGO_CACHEDIR: \${{ runner.temp }}/hugo_cache
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
  ja
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
  if (c.provider === 'github-pages') files['.github/workflows/deploy.yml'] = deployWorkflow(branch);
  if (c.provider === 'gitlab-pages') files['.gitlab-ci.yml'] = gitlabCi();
  return files;
}
