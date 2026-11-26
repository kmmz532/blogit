<script lang="ts">
  import Page from '../Page.svelte';
  import { i18n } from '../lib/i18n.svelte';
</script>

<Page title={i18n.locale === 'en' ? 'Privacy Policy' : 'プライバシーポリシー'} updated={i18n.locale === 'en' ? 'November 26, 2026' : '2026年11月26日'}>
  {#if i18n.locale === 'en'}
    <p>This policy describes how Blogit (the "Service") handles your information. This English version is a translation for reference; if it differs from the Japanese version, the Japanese version prevails.</p>

    <section>
      <h2>1. Information collected and where it is stored</h2>
      <p>The Service runs in your browser. Most of the information it handles stays in your browser, and the operator cannot see it.</p>
      <h3>Information the operator cannot see</h3>
      <ul>
        <li>Access tokens for GitHub, GitLab and Cloudflare. They are stored in your browser's <code>sessionStorage</code> and discarded when you close the tab.</li>
        <li>Account information from each service's API (account name, avatar URL, organizations and so on)</li>
        <li>Information you enter on the setup screen (blog name, repository name, custom domain and so on)</li>
      </ul>
      <p>Account information is kept in your browser only while the page is open. The information you enter is saved in your browser's <code>localStorage</code> so that it is not lost when you move to another page, and is deleted when your blog has been created.</p>
      <h3>Information the operator can see</h3>
      <ul>
        <li>Access logs recorded by the web page host and the authentication server (section 3), such as IP addresses, access times and URLs accessed</li>
      </ul>
    </section>

    <section>
      <h2>2. Purpose of use</h2>
      <p>Access tokens and other information are used only to provide the features of the Service, such as creating repositories, adding site files and configuring hosting. Access logs are viewed only to investigate failures and prevent misuse.</p>
    </section>

    <section>
      <h2>3. Relay through the authentication server</h2>
      <p>The authorization code exchange for GitHub login (including "Log in with GitHub" in the admin of blogs created with the service) and calls to the Cloudflare API go through a server that the operator runs on Cloudflare Workers. Access tokens and request contents pass through this server, but the server only relays requests and neither stores nor records them.</p>
    </section>

    <section>
      <h2>4. Transmission to external services</h2>
      <p>The Service communicates with the GitHub, GitLab and Cloudflare APIs to provide its features. It also loads fonts and icons from Google Fonts (Google LLC) and cdnjs (Cloudflare, Inc.), which sends your IP address and other data to those companies. Each company handles that information under its own privacy policy.</p>
    </section>

    <section>
      <h2>5. Disclosure to third parties</h2>
      <p>Except as required by law, the information collected is not disclosed to third parties.</p>
    </section>

    <section>
      <h2>6. Analytics and advertising</h2>
      <p>The Service does not use analytics tools or advertising.</p>
    </section>

    <section>
      <h2>7. Changes to this policy</h2>
      <p>This policy may be changed as needed. A changed policy takes effect when it is posted on this page.</p>
    </section>

    <section>
      <h2>Operator and contact</h2>
      <p>Mizuto Kaminakano (<a href="https://kmmz.jp" target="_blank" rel="noopener">kmmz.jp</a>)<br /><a href="mailto:contact@kmmz.jp">contact@kmmz.jp</a></p>
    </section>
  {:else}
    <p>Blogit（以下「本サービス」）における利用者の情報の取り扱いについて、次のとおり定めます。</p>

    <section>
      <h2>1. 取得する情報と保存場所</h2>
      <p>本サービスは、利用者のブラウザ上で動作します。取得する情報の大半はブラウザ内でのみ保持し、運営者が閲覧することはできません。</p>
      <h3>運営者が閲覧できない情報</h3>
      <ul>
        <li>GitHub、GitLab、Cloudflareのアクセストークン。ブラウザの <code>sessionStorage</code> に保存し、タブを閉じると破棄します。</li>
        <li>各サービスのAPIから取得するアカウントの情報（アカウント名、アイコン画像のURL、所属するOrganizationなど）</li>
        <li>セットアップの画面で入力された情報（ブログ名、リポジトリ名、独自ドメインなど）</li>
      </ul>
      <p>アカウントの情報は、ページを表示している間のみブラウザ内で保持します。入力された情報は、別のページに移動しても失われないよう、ブラウザの <code>localStorage</code> に保存し、ブログの作成が完了すると削除します。</p>
      <h3>運営者が閲覧できる情報</h3>
      <ul>
        <li>Webページの配信元と認証用サーバー（第3項）に記録されるアクセスログ（IPアドレス、アクセス日時、アクセスしたURLなど）</li>
      </ul>
    </section>

    <section>
      <h2>2. 利用目的</h2>
      <p>アクセストークンなどの情報は、リポジトリの作成、サイトのファイルの追加、公開先の設定など、本サービスの機能を提供する目的にのみ利用します。アクセスログは、障害の調査と不正な利用の防止のためにのみ参照します。</p>
    </section>

    <section>
      <h2>3. 認証用サーバーによる中継</h2>
      <p>GitHubのログイン（本サービスで作成したブログの管理画面の「GitHubでログイン」を含みます）における認可コードの交換と、Cloudflare APIの呼び出しは、運営者がCloudflare Workers上で運用するサーバーを経由します。その際、アクセストークンとリクエストの内容がこのサーバーを通過しますが、サーバーはリクエストを中継するのみで、これらを保存も記録もしません。</p>
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
  {/if}
</Page>
