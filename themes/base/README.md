# Blogit テーマ: base

Blogit の各テーマ（default / warm / cool）が共通で使う HTML・CSS・JS・管理画面ページ・i18n。hugo-gh-admin と hugo-shortcodes を取り込み済み。
サイトはこのモジュールを直接ではなく、各テーマを取り込む。

```toml
[[module.imports]]
  path = "github.com/kmmz532/blogit/themes/<name>"
```

## テーマの作り方

- `hugo.toml` で base を import する
- `layouts/partials/theme/head.html` に Web フォントなどを書く
- `assets/css/theme.css` に色（CSS 変数）や装飾の差分を書く。base の CSS の後に読まれる
- 構造を変えたい部分だけ、base と同じパスの layout を置いて上書きする

## サイトの設定

`defaultContentLanguage` を必ず書く（未設定だと `en` 扱いになり、画面の文言が英語になる）。
`outputs`（`home = ["HTML", "RSS", "JSON"]`）も書く。テーマの `outputs` はサイトに引き継がれず、検索が使う `/index.json` が出ない。

### `params`

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
| `dateFormat` | 日付の表示形式（Goの書式）。未設定なら `2006.01.02` |

画面の文言は `i18n/ja.toml`・`i18n/en.toml`。サイト側に同じキーを書けば上書きできる。
レイアウトはサイト側に同じパスのファイルを置けば上書きできる。サイドバーの検索欄は `partials/sidebar-search.html` に分けてあり、この部品だけを上書きできる。
検索とアーカイブへのリンクは、`search`・`archives` のページの URL を参照する。サイト側の `content/search.md`・`content/archives.md` で `url` を変えれば、リンクも変わる。
