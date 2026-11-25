export type ThemeName = 'default' | 'warm' | 'cool';
export type Language = 'ja' | 'en';

// ウィザードで集める入力。ここから生成するファイルとセットアップ手順がすべて決まる
export interface BlogConfig {
  title: string;
  description: string;
  author: string;
  // リポジトリを作るアカウント（ユーザー名か Organization 名）
  owner: string;
  ownerType: 'User' | 'Organization';
  repo: string;
  theme: ThemeName;
  language: Language;
}

export interface Owner {
  login: string;
  type: 'User' | 'Organization';
  avatarUrl: string;
}

export interface RepoRef {
  owner: string;
  repo: string;
}

// 生成するファイル（パス → 中身）
export type FileMap = Record<string, string>;
