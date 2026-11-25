import type { BlogConfig, FileMap } from './types.ts';

export const HUGO_VERSION = '0.141.0';
const THEME_MODULE = 'github.com/kmmz532/blogit/themes';

// <owner>.github.io という名前のリポジトリはドメイン直下、それ以外は /<repo>/ に公開される
export function pagesBaseURL(owner: string, repo: string): string {
  const host = `${owner.toLowerCase()}.github.io`;
  return repo.toLowerCase() === host ? `https://${host}/` : `https://${host}/${repo}/`;
}

// TOML の基本文字列。JSON の文字列エスケープは TOML でもそのまま通る
const str = (s: string) => JSON.stringify(s);

export function hugoToml(c: BlogConfig): string {
  const repo = `${c.owner}/${c.repo}`;
  return `title = ${str(c.title)}
baseURL = ${str(pagesBaseURL(c.owner, c.repo))}
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

# 管理画面（hugo-gh-admin）。記事もサイト設定もこのリポジトリに保存する
[params.ghAdmin]
  lang = ${str(c.language)}
  repo = ${str(repo)}
  branch = "main"
  siteRepo = ${str(repo)}
  siteBranch = "main"
  siteConfigPath = "hugo.toml"

# テーマ（Blogit）。default / warm / cool から選べる
[[module.imports]]
  path = ${str(`${THEME_MODULE}/${c.theme}`)}
`;
}

// 依存の版は初回ビルドで Hugo が解決する（その後は hugo mod get で固定する）
export function goMod(c: BlogConfig): string {
  return `module github.com/${c.owner}/${c.repo}

go 1.24.0
`;
}

export function deployWorkflow(): string {
  return `name: deploy

on:
  push:
    branches: [main]
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
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
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
      - run: hugo --minify --gc
        env:
          HUGO_CACHEDIR: \${{ runner.temp }}/hugo_cache
      - uses: actions/upload-pages-artifact@v3
        with:
          path: public
      - id: deployment
        uses: actions/deploy-pages@v4
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

function readme(c: BlogConfig): string {
  return `# ${c.title}

${c.description}

[Blogit](https://github.com/kmmz532/blogit) で作成した Hugo ブログです。

- 公開 URL: ${pagesBaseURL(c.owner, c.repo)}
- 記事の編集: ${pagesBaseURL(c.owner, c.repo)}admin/
`;
}

// 単一リポジトリ型のサイト一式
export function siteFiles(c: BlogConfig, now = new Date()): FileMap {
  const post = firstPost(c, now);
  return {
    'hugo.toml': hugoToml(c),
    'go.mod': goMod(c),
    '.github/workflows/deploy.yml': deployWorkflow(),
    '.gitignore': 'public/\nresources/\n.hugo_build.lock\n',
    'README.md': readme(c),
    'static/images/.gitkeep': '',
    [post.path]: post.content,
  };
}
