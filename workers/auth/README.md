# blogit-auth

Blogit の OAuth 補助 Worker。GitHub OAuth の認可コード交換と、Cloudflare API の限定プロキシを担当する。

- GitHub / Cloudflare のアクセストークンは保存しない・ログに出さない
- Cloudflare API は許可した Pages 関連エンドポイントだけを中継する（汎用プロキシにはしない）
- `ALLOWED_ORIGINS` で許可した Web origin 以外は拒否する

## セットアップ

1. GitHub で OAuth App を作る（Settings → Developer settings → OAuth Apps）
   - Homepage URL: Web アプリの URL（例 `https://blogit.kmmz.jp/`）
   - Authorization callback URL: 同じ URL
2. Worker を公開し、GitHub OAuth の Client ID と Client Secret を登録する

   ```sh
   npx wrangler deploy
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

3. `wrangler.toml` の `ALLOWED_ORIGINS` に Web アプリの origin を設定する
4. Web アプリのビルド環境に `VITE_GITHUB_CLIENT_ID` と `VITE_AUTH_WORKER_URL`（Worker の URL）を設定する

## API

- `POST /token` — GitHub OAuth の認可コードをトークンに交換する
- `GET /cloudflare/accounts` — Cloudflare アカウント一覧
- `GET /cloudflare/accounts/:accountId/pages/projects/:projectName` — Pages プロジェクト取得
- `POST /cloudflare/accounts/:accountId/pages/projects` — Pages プロジェクト作成
- `GET /cloudflare/accounts/:accountId/pages/projects/:projectName/deployments` — デプロイ一覧

Cloudflare API の呼び出しではブラウザから Bearer トークンを受け取り、そのリクエスト内だけで Cloudflare API に中継する。トークンは Worker のストレージやログに残さない。
