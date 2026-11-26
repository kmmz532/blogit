# Blogit
GitHub PagesやGitLab Pages、Cloudflare PagesでHugoブログを構築するWebツール

- https://blogit.kmmz.jp/

## できること

- GitHubまたはGitLabにログインし、ブログ用のリポジトリを作成する。
- Hugoのサイト一式（設定・テーマ・最初の記事・ビルド設定）をコミットし、初回の公開まで自動で行う。
- 公開後は、ブラウザの管理画面（[hugo-gh-admin](https://github.com/kmmz532/hugo-gh-admin)）から記事の執筆やサイト設定の変更を行う。管理画面のサイト設定では、ブログ名・説明・テーマ・テーマの版の固定・サイドバーのリンクなどを変更できる。

| リポジトリ | 公開先 | ビルド |
|---|---|---|
| GitHub | GitHub Pages | GitHub Actions |
| GitHub | Cloudflare Pages | CloudflareのGit連携 |
| GitLab（gitlab.com・セルフホスト） | GitLab Pages | GitLab CI/CD |
| GitLab（gitlab.comのみ） | Cloudflare Pages | CloudflareのGit連携 |

- リポジトリは公開・非公開のどちらでも作成できる。GitHub Pagesを非公開リポジトリで利用するには、GitHubの有料プランが必要。
- Cloudflare Pagesを利用する場合は、CloudflareのダッシュボードでGitHubまたはGitLabとの連携を済ませておく。
- 高度な設定では、説明・著者・サイドバーのリンク・ファビコン・記事カードの既定のサムネイルなども設定できる。設定しなかった項目も、作成後に管理画面のサイト設定から変更できる。
- テーマは `default`・`warm`・`cool` から選択する。既定ではビルドのたびに最新のテーマを利用し、高度な設定で作成時の版に固定することもできる。
- GitHubのリポジトリでは、管理画面に「GitHubでログイン」を設定する（BlogitのOAuth Appと `workers/auth` を共用する）。高度な設定でオフにすると、管理画面にはトークンを入力してログインする。
- テーマ（`themes/base`）は、Blogitで作成したブログ以外のHugoサイトからも取り込める。見た目は、サイト側の `layouts/` と `assets/` で上書きする（[themes/base/README.md](themes/base/README.md)）。
- 構築の途中で失敗した場合や、ビルドが時間内に完了しなかった場合は、完了していない手順から再実行できる。障害の可能性があるときは、GitHub・GitLab・Cloudflareのステータスページへのリンクを表示する。
- 公開後のビルドが一時的な障害で失敗した場合は、GitHub Actions、GitLabのパイプライン、Cloudflare Pagesのいずれかの画面から再実行する。

## 構成

| パス | 内容 |
|---|---|
| `packages/core` | 生成するファイルとセットアップ手順（GitHub・GitLabのAPIクライアントを含む） |
| `packages/web` | ウィザードのWebアプリ（Svelte + Vite） |
| `themes/` | Hugoのテーマ（`base` と、それを取り込む `default`・`warm`・`cool`） |
| `workers/auth` | GitHub OAuthのコード交換とCloudflare APIの中継を行うWorker（[README](workers/auth/README.md)）。ブログの管理画面の「GitHubでログイン」にも使う |
| `examples/site` | 生成されるサイトの例 |

## 開発

```sh
npm install
npm run dev     # ウィザードを起動する
npm test        # core のテスト
npm run check   # 型チェック
npm run build   # Web アプリのビルド
```

ログインに使用する値は `packages/web/.env` に記述する（[.env.example](packages/web/.env.example)）。未設定のサービスは、アクセストークンを入力してログインする。

| 変数 | 内容 |
|---|---|
| `VITE_GITHUB_CLIENT_ID` | GitHub OAuth AppのClient ID |
| `VITE_AUTH_WORKER_URL` | `workers/auth` のWorkerのURL |
| `VITE_GITLAB_CLIENT_ID` | gitlab.comのOAuthアプリケーションのApplication ID |

## OAuthの設定

### GitHub

[workers/auth/README.md](workers/auth/README.md) の手順でOAuth AppとWorkerを用意する。スコープは `repo`・`workflow`・`read:org` を要求する。

OAuth AppのAuthorization callback URLには、次の2つを登録する。

- WebアプリのURL（例: `https://blogit.kmmz.jp/`）: Blogit自身のログイン
- 中継ページのURL（例: `https://blogit.kmmz.jp/oauth/`）: 作成したブログの管理画面の「GitHubでログイン」。GitHubから受け取ったコードを、ブログのログイン画面に戻す（`packages/web/public/oauth/index.html`）

### GitLab

gitlab.comのUser settings → Applicationsで、次の設定のアプリケーションを作成する。PKCEでトークンを交換するため、Client SecretとWorkerは不要。

- Redirect URI: WebアプリのURL（例: `https://blogit.kmmz.jp/`）
- 非公開（Confidential）: 無効
- Scopes: `api`

セルフホストのGitLabは、ログイン画面でインスタンスのURLと `api` スコープのPersonal Access Tokenを入力する。

## 公開

`main` へのpushで、GitHub Actions（`.github/workflows/web.yml`）がWebアプリをビルドし、GitHub Pagesに公開する。ビルドに渡す値は、リポジトリのSettings → Secrets and variables → Actions → Variablesに登録する。

| Variable | 渡す先 |
|---|---|
| `OAUTH_CLIENT_ID` | `VITE_GITHUB_CLIENT_ID` |
| `AUTH_WORKER_URL` | `VITE_AUTH_WORKER_URL` |
| `GITLAB_CLIENT_ID` | `VITE_GITLAB_CLIENT_ID` |
