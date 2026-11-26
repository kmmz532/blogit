<script lang="ts"></script>

<!-- PAT に必要な権限の説明。ログイン画面と、権限不足で止まったときの入れ直しで使う -->
<div class="hint">
  <p>
    <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Fine-grained token</a>の場合は、Repository accessを<strong>All repositories</strong>にして次の権限を付与してください。
  </p>
  <ul class="token-perms">
    <li>Administration: Read and write（リポジトリの作成）</li>
    <li>Contents: Read and write（ファイルの追加）</li>
    <li>Workflows: Read and write（デプロイ用ワークフローの追加）</li>
    <li>Pages: Read and write（GitHub Pagesの有効化）</li>
    <li>Actions: Read（ビルドの確認）</li>
  </ul>
  <p>
    Classic tokenの場合は <code>repo</code>、<code>workflow</code>、<code>read:org</code> を付与してください。
    トークンはタブを閉じると破棄されます。
  </p>
</div>
