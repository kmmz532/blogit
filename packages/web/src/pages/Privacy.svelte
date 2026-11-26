<script lang="ts">
  import Page from '../Page.svelte';
</script>

<Page title="プライバシーポリシー" updated="2026年11月26日">
  <p>Blogit（以下「本サービス」）における利用者の情報の取り扱いについて、次のとおり定めます。</p>

  <section>
    <h2>1. 取得する情報</h2>
    <ul>
      <li>GitHub、GitLab、Cloudflareのアクセストークン（ログインまたは接続の際に取得します）</li>
      <li>アカウント名、アイコン画像のURL、所属するOrganizationなど、各サービスのAPIから取得する情報</li>
      <li>セットアップの画面で入力された情報（ブログ名、リポジトリ名、独自ドメインなど）</li>
    </ul>
  </section>

  <section>
    <h2>2. 利用目的</h2>
    <p>取得した情報は、リポジトリの作成、サイトのファイルの追加、公開先の設定など、本サービスの機能を提供する目的にのみ利用します。</p>
  </section>

  <section>
    <h2>3. 保存場所と保存期間</h2>
    <ul>
      <li>アクセストークンは、利用者のブラウザの <code>sessionStorage</code> に保存し、タブを閉じると破棄されます。</li>
      <li>セットアップの画面で入力された情報は、ページを表示している間のみ保持します。</li>
      <li>表示テーマ（ライト・ダーク）の設定は、ブラウザの <code>localStorage</code> に保存します。</li>
      <li>本サービスのサーバーに、アクセストークンや入力内容を保存することはありません。</li>
    </ul>
  </section>

  <section>
    <h2>4. 認証用サーバーによる中継</h2>
    <p>GitHubのログインにおける認可コードの交換と、Cloudflare APIの呼び出しは、運営者がCloudflare Workers上で運用するサーバーを経由します。このサーバーはリクエストを中継するのみで、アクセストークンを保存・記録しません。ただし、Cloudflareが通信の記録としてIPアドレスなどを取得する場合があります。</p>
  </section>

  <section>
    <h2>5. 外部サービスへの送信</h2>
    <p>本サービスは、機能の提供のためにGitHub、GitLab、CloudflareのAPIと通信します。また、フォントとアイコンの読み込みのためにGoogle Fonts（Google LLC）とcdnjs（Cloudflare, Inc.）を利用しており、その際にIPアドレスなどが各社に送信されます。各社における情報の取り扱いは、各社のプライバシーポリシーに従います。</p>
  </section>

  <section>
    <h2>6. 第三者への提供</h2>
    <p>法令に基づく場合を除き、取得した情報を第三者に提供することはありません。</p>
  </section>

  <section>
    <h2>7. アクセス解析</h2>
    <p>本サービスは、アクセス解析ツールと広告を利用していません。</p>
  </section>

  <section>
    <h2>8. ポリシーの変更</h2>
    <p>本ポリシーは、必要に応じて変更することがあります。変更後のポリシーは、本ページに掲載した時点で効力を生じます。</p>
  </section>

  <section>
    <h2>お問い合わせ</h2>
    <p><a href="mailto:contact@kmmz.jp">contact@kmmz.jp</a></p>
  </section>
</Page>
