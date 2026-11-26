<script lang="ts">
  import Page from '../Page.svelte';
</script>

<Page title="About">
  <section>
    <h2>Blogitとは</h2>
    <p>Blogitは、GitHubまたはGitLabのアカウントでHugoのブログを作成するサービスです。ブログ名、テーマ、公開先を選択すると、リポジトリの作成から公開までを自動で行います。</p>
  </section>

  <section>
    <h2>作成の流れ</h2>
    <ol>
      <li>GitHubまたはGitLabでログインする</li>
      <li>ブログ名、テーマ、公開先を選択する</li>
      <li>Blogitがリポジトリを作成し、サイトのファイルを追加する</li>
      <li>GitHub Actionsなどがサイトをビルドし、公開する</li>
    </ol>
  </section>

  <section>
    <h2>公開先</h2>
    <ul>
      <li><strong>GitHub Pages</strong>: GitHub Actionsでビルドし、公開します。独自ドメインを設定できます。</li>
      <li><strong>GitLab Pages</strong>: GitLab CI/CDでビルドし、公開します。セルフホストのGitLabにも対応します。</li>
      <li><strong>Cloudflare Pages</strong>: CloudflareのGit連携でビルドし、公開します。Cloudflareのアカウントが必要です。</li>
    </ul>
  </section>

  <section>
    <h2>記事の執筆</h2>
    <p>作成したブログの <code>/admin/</code> に管理画面があります。記事の執筆、画像の追加、サイトの設定の変更をブラウザから行えます。変更はリポジトリにコミットされ、自動で再公開されます。</p>
  </section>

  <section>
    <h2>費用</h2>
    <p>Blogitの利用は無料です。各公開先の無料枠の範囲で運用できます。ただし、非公開リポジトリでGitHub Pagesを利用するには、GitHubの有料プランが必要です。</p>
  </section>

  <section>
    <h2>ソースコード</h2>
    <p>ソースコードは <a href="https://github.com/kmmz532/blogit" target="_blank" rel="noopener">GitHub</a> で公開しています（MIT License）。</p>
  </section>

  <div class="actions">
    <a class="button" href="./">ブログを作成する</a>
  </div>
</Page>
