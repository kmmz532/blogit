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
    <figure class="shot">
      <img class="shot-light" src="./screens/setup-light.png" alt="ブログの作成画面" width="760" height="720" loading="lazy" />
      <img class="shot-dark" src="./screens/setup-dark.png" alt="ブログの作成画面" width="760" height="720" loading="lazy" />
      <figcaption class="hint">ブログの作成画面</figcaption>
    </figure>
  </section>

  <section>
    <h2>テーマ</h2>
    <p>3種類のテーマから選択できます。いずれもダークモードに対応しています。</p>
    <div class="shots">
      {#each [['default', 'Default'], ['warm', 'Warm'], ['cool', 'Cool']] as [name, label]}
        <figure class="shot">
          <img class="shot-light" src="./themes/{name}-home-light.png" alt="{label}テーマ" width="1280" height="800" loading="lazy" />
          <img class="shot-dark" src="./themes/{name}-home-dark.png" alt="{label}テーマ" width="1280" height="800" loading="lazy" />
          <figcaption class="hint">{label}</figcaption>
        </figure>
      {/each}
    </div>
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
    <p>ソースコードは<a href="https://github.com/kmmz532/blogit" target="_blank" rel="noopener">GitHub</a>で公開しています（MIT License）</p>
  </section>

  <div class="actions">
    <a class="button" href="./">ブログを作成する</a>
  </div>
</Page>
