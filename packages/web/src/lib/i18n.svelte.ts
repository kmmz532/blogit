import { en, ja, type MessageKey } from './messages';

export type Locale = 'ja' | 'en';
const KEY = 'blogit:locale';

// 保存した選択を優先し、なければブラウザの言語から決める
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ja' || saved === 'en') return saved;
  } catch {}
  return navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export const i18n = $state({ locale: initialLocale() });

export function setLocale(locale: Locale): void {
  i18n.locale = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(KEY, locale);
  } catch {}
}

// {name} を params の値で置き換える
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  const text = (i18n.locale === 'en' ? en : ja)[key];
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}
