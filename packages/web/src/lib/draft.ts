// セットアップの入力内容の下書き。別のページに移動しても消えないよう localStorage に保存し、作成が完了したら消す
const KEY = 'blogit:setup-draft';

export type Draft = Record<string, unknown>;

export function loadDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

export function saveDraft(draft: Draft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {}
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
