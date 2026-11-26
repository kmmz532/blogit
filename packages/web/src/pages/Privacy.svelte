<script lang="ts">
  import Page from '../Page.svelte';
</script>

<Page title="プライバシーポリシー" updated="2026年11月26日">
  <p>Blogit（以下「本サービス」）における利用者の情報の取り扱いについて、次のとおり定めます。</p>

  <section>
    <h2>1. 取得する情報と保存場所</h2>
    <p>本サービスは、利用者のブラウザ上で動作します。取得する情報の大半はブラウザ内でのみ保持し、運営者が閲覧することはできません。</p>
    <h3>運営者が閲覧できない情報</h3>
    <ul>
      <li><strong>アクセストークン</strong>（GitHub、GitLab、Cloudflare）: ブラウザの <code>sessionStorage</code> に保存し、タブを閉じると破棄されます。</li>
      <li><strong>アカウントの情報</strong>（アカウント名、アイコン画像のURL、所属するOrganizationなど）: 各サービスのAPIから取得し、ページを表示している間のみブラウザ内で保持します。</li>
      <li><strong>セットアップの画面で入力された情報</strong>（ブログ名、リポジトリ名、独自ドメインなど）: ページを表示している間のみブラウザ内で保持します。</li>
    </ul>
    <h3>運営者が閲覧できる情報</h3>
    <ul>
      <li><strong>アクセスログ</strong>: Webページの配信元と認証用サーバー（第3項）に記録される、IPアドレス、アクセス日時、アクセスしたURLなど。</li>
    </ul>
  </section>

  <section>
    <h2>2. 利用目的</h2>
    <p>アクセストークンなどの情報は、リポジトリの作成、サイトのファイルの追加、公開先の設定など、本サービスの機能を提供する目的にのみ利用します。アクセスログは、障害の調査と不正な利用の防止のためにのみ参照します。</p>
  </section>

  <section>
    <h2>3. 認証用サーバーによる中継</h2>
    <p>GitHubのログインにおける認可コードの交換と、Cloudflare APIの呼び出しは、運営者がCloudflare Workers上で運用するサーバーを経由します。その際、アクセストークンとリクエストの内容がこのサーバーを通過しますが、サーバーはリクエストを中継するのみで、これらを保存も記録もしません。</p>
  </section>

  <section>
    <h2>4. 外部サービスへの送信</h2>
    <p>本サービスは、機能の提供のためにGitHub、GitLab、CloudflareのAPIと通信します。また、フォントとアイコンの読み込みのためにGoogle Fonts（Google LLC）とcdnjs（Cloudflare, Inc.）を利用しており、その際にIPアドレスなどが各社に送信されます。各社における情報の取り扱いは、各社のプライバシーポリシーに従います。</p>
  </section>

  <section>
    <h2>5. 第三者への提供</h2>
    <p>法令に基づく場合を除き、取得した情報を第三者に提供することはありません。</p>
  </section>

  <section>
    <h2>6. アクセス解析と広告</h2>
    <p>本サービスは、アクセス解析ツールと広告を利用していません。</p>
  </section>

  <section>
    <h2>7. ポリシーの変更</h2>
    <p>本ポリシーは、必要に応じて変更することがあります。変更後のポリシーは、本ページに掲載した時点で効力を生じます。</p>
  </section>

  <section>
    <h2>運営者とお問い合わせ</h2>
    <p>上中野 瑞人（<a href="https://kmmz.jp" target="_blank" rel="noopener">kmmz.jp</a>）<br /><a href="mailto:contact@kmmz.jp">contact@kmmz.jp</a></p>
  </section>
</Page>
