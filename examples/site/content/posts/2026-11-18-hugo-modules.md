---
title: "Hugo Modules でテーマを管理する"
date: 2026-11-18T21:00:00+09:00
categories: ["技術"]
tags: ["hugo", "go"]
---

![](/images/leaf.svg)

Hugo Modules を使うと、テーマを Go のモジュールとして取り込めます。バージョンは `go.mod` に記録されます。

## 取り込み方

```toml
[[module.imports]]
  path = "github.com/kmmz532/blogit/themes/default"
```

## 更新する

```sh
hugo mod get -u
```

## 注意すること

- テーマの `outputs` はサイトに引き継がれない
- `defaultContentLanguage` を書かないと英語扱いになる
- 更新前に差分を確認する
