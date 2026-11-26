<script lang="ts">
  import Page from '../Page.svelte';
  import { i18n } from '../lib/i18n.svelte';
</script>

<Page title={i18n.locale === 'en' ? 'About' : 'About'}>
  {#if i18n.locale === 'en'}
    <section>
      <h2>What is Blogit</h2>
      <p>Blogit is a tool that builds a Hugo blog with your GitHub or GitLab account. Choose a blog name, a theme and where to publish, and Blogit creates the repository and publishes the blog for you.</p>
    </section>

    <section>
      <h2>How it works</h2>
      <ol>
        <li>Log in with GitHub or GitLab</li>
        <li>Choose a blog name, a theme and where to publish</li>
        <li>Blogit creates a repository and adds the site files</li>
        <li>GitHub Actions or another service builds and publishes the site</li>
      </ol>
      <figure class="shot">
        <img class="shot-light" src="./screens/setup-light.png" alt="The blog creation screen" width="760" height="640" loading="lazy" />
        <img class="shot-dark" src="./screens/setup-dark.png" alt="The blog creation screen" width="760" height="640" loading="lazy" />
        <figcaption class="hint">The blog creation screen (Japanese)</figcaption>
      </figure>
    </section>

    <section>
      <h2>Themes</h2>
      <p>Choose from three themes. All of them support dark mode.</p>
      <div class="shots">
        {#each [['default', 'Default'], ['warm', 'Warm'], ['cool', 'Cool']] as [name, label]}
          <figure class="shot">
            <img class="shot-light" src="./themes/{name}-home-light.png" alt="{label} theme" width="1280" height="800" loading="lazy" />
            <img class="shot-dark" src="./themes/{name}-home-dark.png" alt="{label} theme" width="1280" height="800" loading="lazy" />
            <figcaption class="hint">{label}</figcaption>
          </figure>
        {/each}
      </div>
    </section>

    <section>
      <h2>Hosting</h2>
      <p>You can publish to GitHub Pages, GitLab Pages or Cloudflare Pages. The site is built with GitHub Actions, GitLab CI/CD or the Cloudflare Git integration, respectively.</p>
      <p>A custom domain can be set during setup only for GitHub Pages. With self-hosted GitLab, only GitLab Pages is available. Cloudflare Pages requires a Cloudflare account.</p>
    </section>

    <section>
      <h2>Writing posts</h2>
      <p>Your blog has an admin page at <code>/admin/</code>. You can write posts, add images and change site settings in the browser. Changes are committed to the repository and published again automatically.</p>
    </section>

    <section>
      <h2>Cost</h2>
      <p>Blogit is free to use, and the blog runs within the free tier of each hosting service. GitHub Pages for private repositories requires a paid GitHub plan.</p>
    </section>

    <section>
      <h2>Source code</h2>
      <p>The source code is available on <a href="https://github.com/kmmz532/blogit" target="_blank" rel="noopener">GitHub</a> under the MIT License.</p>
    </section>

    <div class="actions">
      <a class="button" href="./">Create a blog</a>
    </div>
  {:else}
    <section>
      <h2>Blogitとは</h2>
      <p>Blogitは、GitHubまたはGitLabのアカウントでHugoのブログを構築するツールです。ブログ名、テーマ、公開先を選択すると、リポジトリの作成から公開までを自動で行います。</p>
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
        <img class="shot-light" src="./screens/setup-light.png" alt="ブログの作成画面" width="760" height="640" loading="lazy" />
        <img class="shot-dark" src="./screens/setup-dark.png" alt="ブログの作成画面" width="760" height="640" loading="lazy" />
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
      <p>GitHub Pages、GitLab Pages、Cloudflare Pagesのいずれかに公開できます。ビルドはそれぞれGitHub Actions、GitLab CI/CD、CloudflareのGit連携で行います。</p>
      <p>作成時に独自ドメインを設定できるのはGitHub Pagesのみです。セルフホストのGitLabでは、GitLab Pagesのみ利用できます。Cloudflare Pagesを利用するには、Cloudflareのアカウントが必要です。</p>
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
  {/if}
</Page>
