<script lang="ts">
  import Page from '../Page.svelte';
  import { i18n } from '../lib/i18n.svelte';
</script>

<Page title={i18n.locale === 'en' ? 'Terms of Service' : '利用規約'} updated={i18n.locale === 'en' ? 'November 26, 2026' : '2026年11月26日'}>
  {#if i18n.locale === 'en'}
    <p>These Terms of Service ("Terms") set out the conditions for using Blogit (the "Service"). By using the Service, you agree to these Terms. This English version is a translation for reference; if it differs from the Japanese version, the Japanese version prevails.</p>

    <section>
      <h2>1. The Service</h2>
      <p>The Service creates a repository in your GitHub or GitLab account and builds a Hugo blog up to its publication on a hosting service. Running the blog after it is built (including managing posts, updating the theme and changing hosting settings) is outside the scope of the Service.</p>
    </section>

    <section>
      <h2>2. External services</h2>
      <p>The Service uses external services such as GitHub, GitLab and Cloudflare. You must follow the terms and pricing of each external service. The operator is not liable for damages caused by changes to or outages of external services.</p>
    </section>

    <section>
      <h2>3. Your responsibilities</h2>
      <ul>
        <li>Repositories created and sites published by the Service belong to you, and you are responsible for managing and running them.</li>
        <li>You must not publish content that violates laws or public order and morals, or that infringes the rights of third parties.</li>
      </ul>
    </section>

    <section>
      <h2>4. Prohibited acts</h2>
      <ul>
        <li>Placing an excessive load on the Service or external services</li>
        <li>Interfering with the operation of the Service</li>
        <li>Attempting unauthorized access</li>
      </ul>
    </section>

    <section>
      <h2>5. Disclaimer</h2>
      <p>The Service is provided as is, and the operator makes no warranty as to its completeness, accuracy or usefulness. Except in cases of intent or gross negligence by the operator, the operator is not liable for damages arising from your use of the Service.</p>
    </section>

    <section>
      <h2>6. Changes to and suspension of the Service</h2>
      <p>The operator may change or stop providing the Service without prior notice.</p>
    </section>

    <section>
      <h2>7. Changes to these Terms</h2>
      <p>The operator may change these Terms as needed. Changed Terms take effect when they are posted on this page.</p>
    </section>

    <section>
      <h2>8. Governing law and jurisdiction</h2>
      <p>These Terms are governed by the laws of Japan. Any dispute concerning the Service is subject to the exclusive jurisdiction of the Osaka District Court as the court of first instance.</p>
    </section>

    <section>
      <h2>Operator and contact</h2>
      <p>Mizuto Kaminakano (<a href="https://kmmz.jp" target="_blank" rel="noopener">kmmz.jp</a>)<br /><a href="mailto:contact@kmmz.jp">contact@kmmz.jp</a></p>
    </section>
  {:else}
    <p>この利用規約（以下「本規約」）は、Blogit（以下「本サービス」）の利用条件を定めるものです。本サービスを利用した時点で、本規約に同意したものとみなします。</p>

    <section>
      <h2>第1条（本サービスの内容）</h2>
      <p>本サービスは、利用者のGitHubまたはGitLabのアカウントにリポジトリを作成し、Hugoのブログを各公開先に公開するまでの構築の機能を提供します。構築の完了後のブログの運用（記事の管理、テーマの更新、公開先の設定の変更などを含みます）は、本サービスの範囲に含まれません。</p>
    </section>

    <section>
      <h2>第2条（外部サービス）</h2>
      <p>本サービスは、GitHub、GitLab、Cloudflareなどの外部サービスを利用します。利用者は、各外部サービスの利用規約と料金体系に従うものとします。外部サービスの仕様変更や障害によって生じた損害について、運営者は責任を負いません。</p>
    </section>

    <section>
      <h2>第3条（利用者の責任）</h2>
      <ul>
        <li>本サービスによって作成されたリポジトリと公開されたサイトは利用者に帰属し、その管理と運用は利用者の責任で行うものとします。</li>
        <li>利用者は、法令または公序良俗に反する内容、第三者の権利を侵害する内容を公開してはなりません。</li>
      </ul>
    </section>

    <section>
      <h2>第4条（禁止事項）</h2>
      <ul>
        <li>本サービスまたは外部サービスに過度な負荷をかける行為</li>
        <li>本サービスの運営を妨げる行為</li>
        <li>不正なアクセスを試みる行為</li>
      </ul>
    </section>

    <section>
      <h2>第5条（免責）</h2>
      <p>本サービスは現状のまま提供され、運営者は、本サービスの完全性、正確性、有用性について保証しません。本サービスの利用によって利用者に生じた損害について、運営者の故意または重大な過失による場合を除き、運営者は責任を負いません。</p>
    </section>

    <section>
      <h2>第6条（サービスの変更と停止）</h2>
      <p>運営者は、事前の通知なく、本サービスの内容を変更し、または提供を停止することがあります。</p>
    </section>

    <section>
      <h2>第7条（規約の変更）</h2>
      <p>運営者は、必要に応じて本規約を変更できるものとします。変更後の規約は、本ページに掲載した時点で効力を生じます。</p>
    </section>

    <section>
      <h2>第8条（準拠法と管轄裁判所）</h2>
      <p>本規約は日本法に準拠します。本サービスに関して紛争が生じた場合は、大阪地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
    </section>

    <section>
      <h2>運営者とお問い合わせ</h2>
      <p>上中野 瑞人（<a href="https://kmmz.jp" target="_blank" rel="noopener">kmmz.jp</a>）<br /><a href="mailto:contact@kmmz.jp">contact@kmmz.jp</a></p>
    </section>
  {/if}
</Page>
