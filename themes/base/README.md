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
| `defaultThumbnail` | 記事カードの既定サムネイル。テーマの既定の画像は `/blogit/default-thumbnail.svg` |
| `indexPageSize` | 検索索引 1 ファイルの件数 |
| `cfAnalyticsToken` | Cloudflare Web Analytics（任意） |
| `ogLocale` | og:locale。未設定なら言語から決める |
| `sidebar` | `false` でサイドバーを消して 1 カラムにする |
| `dateFormat` | 日付の表示形式（Goの書式）。未設定なら `2006.01.02` |

## サイトでのカスタマイズ

Hugo は、サイトのファイルをテーマのファイルより優先する。テーマのリポジトリを変更せずに、サイトのリポジトリにファイルを追加して見た目や動作を変える。

### CSS を追加する

サイトの `assets/css/custom.css` に書く。テーマの CSS（`base` と各テーマの `theme.css`）の後に連結されるため、テーマの配色を残したまま一部だけを変更できる。

```css
/* assets/css/custom.css */
:root {
  --link: #0a7d5a;
}

.post-body h2 {
  border-bottom: 2px solid var(--border);
}
```

色は CSS 変数で定義している。主な変数は `--foreground`・`--background`・`--text-primary`・`--text-secondary`・`--border`・`--link`。ダークモードの値は `html.dark` の中で上書きする。

サイトに `assets/css/theme.css` を置くと、テーマの `theme.css` が置き換わる。warm や cool の配色も消えるため、通常は `custom.css` を利用する。

### `<head>` に追加する

解析タグや Web フォントの読み込みは、サイトの `layouts/partials/custom/head.html` に書く。すべてのページの `<head>` の末尾に出力する。

```html
<!-- layouts/partials/custom/head.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
```

外部のスクリプトを読み込む場合は、Content-Security-Policy に送り先を追加する必要がある（`partials/head.html` の CSP の行を参照）。

### レイアウトを上書きする

サイトに、テーマと同じパスのファイルを置く。ファイル単位で置き換わるため、テーマのファイルをコピーしてから変更する。テーマを更新しても、上書きしたファイルには反映されない。

| パス | 内容 |
|---|---|
| `layouts/_default/baseof.html` | ページ全体の枠 |
| `layouts/_default/single.html`・`list.html` | 記事・一覧のページ |
| `layouts/partials/header.html`・`footer.html` | ヘッダー・フッター |
| `layouts/partials/sidebar.html` | サイドバー全体 |
| `layouts/partials/sidebar-search.html` | サイドバーの検索欄だけ |
| `layouts/partials/post-card.html` | 一覧の記事カード |
| `layouts/partials/theme/head.html` | テーマの Web フォント |
| `layouts/gh-admin/baseof.html` | 管理画面の枠 |

記事の書式（ショートコード）は、サイトの `layouts/shortcodes/<名前>.html` で上書きする。

### 文言を変える

画面の文言は `i18n/ja.toml`・`i18n/en.toml` にある。サイトの `i18n/ja.toml` に同じキーを書けば、そのキーだけを上書きできる。管理画面の文言は hugo-gh-admin の `data/gh-admin/i18n/` にある（[hugo-gh-admin の README](https://github.com/kmmz532/hugo-gh-admin#文言の上書き)）。

### ページの URL

検索とアーカイブへのリンクは、`search`・`archives` のページの URL を参照する。サイトの `content/search.md`・`content/archives.md` で `url` を変えれば、リンクも変わる。

### モジュールを追加する

ほかの Hugo Modules（ショートコード集など）は、管理画面の「モジュール」（`/admin/modules/`）で追加・削除・並べ替えができる。上にあるモジュールほど優先される。
