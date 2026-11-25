module github.com/kmmz532/blogit/examples/site

go 1.24.0

// テーマはこのリポジトリのものを使う（hugo mod tidy をすると使っていないテーマの行が消えるので実行しない）
require (
	github.com/kmmz532/blogit/themes/base v0.0.0
	github.com/kmmz532/blogit/themes/default v0.0.0
	github.com/kmmz532/blogit/themes/warm v0.0.0
	github.com/kmmz532/blogit/themes/cool v0.0.0
)

replace github.com/kmmz532/blogit/themes/base => ../../themes/base

replace github.com/kmmz532/blogit/themes/default => ../../themes/default

replace github.com/kmmz532/blogit/themes/warm => ../../themes/warm

replace github.com/kmmz532/blogit/themes/cool => ../../themes/cool
