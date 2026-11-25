# blogit-auth

Blogit の Web アプリが GitHub OAuth でログインするとき、認可コードをアクセストークンに交換する Cloudflare Worker。

## セットアップ

1. GitHub で OAuth App を作る（Settings → Developer settings → OAuth Apps）
   - Homepage URL: Web アプリの URL（例 `https://kmmz532.github.io/blogit/`）
   - Authorization callback URL: 同じ URL
2. Worker を公開し、Client ID と Client Secret を登録する

   ```sh
   npx wrangler deploy
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

3. `wrangler.toml` の `ALLOWED_ORIGINS` に Web アプリの origin を入れる
4. Web アプリの `.env` に `VITE_GITHUB_CLIENT_ID` と `VITE_AUTH_WORKER_URL`（Worker の URL）を入れる
