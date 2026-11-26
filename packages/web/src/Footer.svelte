<script lang="ts">
  import { i18n, setLocale, t } from './lib/i18n.svelte';
</script>

<footer class="footer">
  <p>
    <a href="./about.html">{t('about')}</a> | <a href="./terms.html">{t('terms')}</a> | <a href="./privacy.html">{t('privacy')}</a>
    | <button class="link-button" type="button" onclick={() => setLocale(i18n.locale === 'ja' ? 'en' : 'ja')} aria-label={t('switchLanguageLabel')}>{t('switchLanguage')}</button>
  </p>
  <p>
    <a href="https://github.com/kmmz532/blogit" target="_blank" rel="noopener">Blogit</a> © 2025-2026 Mizuto, Kaminakano - <a href="https://github.com/kmmz532/blogit/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>. | <a href="mailto:contact@kmmz.jp">contact@kmmz.jp</a> - Osaka, Japan
  </p>
</footer>
