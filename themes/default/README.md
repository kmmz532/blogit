# Blogit テーマ: default

## 取り込み方

```toml
[[module.imports]]
  path = "github.com/kmmz532/blogit/themes/default"
```

## 設定（`params`）

| 項目 | 意味 |
|---|---|
| `description` | サイトの説明（meta description・RSS） |
| `headerTitle` | ヘッダーに出す名前。未設定なら `title` |
| `author` / `bio` | サイドバーのプロフィール |
| `links` | サイドバーのリンク（`name`・`url`・`icon`） |
| `footer` | フッターの文言 |
| `icon` / `appleIcon` | ファビコン・apple-touch-icon |
| `defaultThumbnail` | 記事カードの既定サムネイル |
| `indexPageSize` | 検索索引 1 ファイルの件数 |
| `cfAnalyticsToken` | Cloudflare Web Analytics（任意） |
| `ogLocale` | og:locale。未設定なら言語から決める |
| `sidebar` | `false` でサイドバーを消して 1 カラムにする |

画面の文言は `i18n/ja.toml`・`i18n/en.toml`。サイト側に同じキーを書けば上書きできる。
レイアウトはサイト側に同じパスのファイルを置けば上書きできる。
