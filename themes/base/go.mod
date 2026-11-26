module github.com/kmmz532/blogit/themes/base

go 1.24.0

// hugo-gh-admin と hugo-shortcodes は hugo.toml の [[module.imports]] で取り込むが、ここでは require しない。
// require すると、サイトはテーマが指定したバージョンに留まり、テーマを更新するまで新しいバージョンを使えない。
// 書かなければ、サイトの go.mod で固定していない限り、Hugo がビルドのたびに最新バージョンを取得する
