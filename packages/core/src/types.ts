export type ThemeName = 'default' | 'warm' | 'cool';
export type Language = 'ja' | 'en';
export type DeploymentProvider = 'github-pages' | 'cloudflare-pages' | 'gitlab-pages';

// ウィザードで集める入力。ここから生成するファイルとセットアップ手順がすべて決まる
export interface BlogConfig {
  title: string;
  description: string;
  author: string;
  // リポジトリを作るアカウント（ユーザー名か Organization 名）
  owner: string;
  ownerType: 'User' | 'Organization';
  repo: string;
  provider: DeploymentProvider;
  cloudflareAccountId?: string;
  // provider が gitlab-pages のときの GitLab インスタンスの URL（例: https://gitlab.com）。owner はネームスペースのフルパス
  gitlabUrl?: string;
  // provider が github-pages のときの独自ドメイン（例: blog.example.jp）。省略時は GitHub Pages の既定の URL
  customDomain?: string;
  // サイドバーのプロフィール文
  bio?: string;
  // サイドバーのリンク。icon は LINK_ICONS の id
  links?: ProfileLink[];
  // false ならサイドバーを表示しない（1カラム）。省略時は表示する
  sidebar?: boolean;
  // 一覧の1ページあたりの記事数。省略時は10
  pagerSize?: number;
  // true ならリポジトリを非公開で作成する。省略時は公開
  private?: boolean;
  theme: ThemeName;
  language: Language;
}

export interface ProfileLink {
  icon: string;
  url: string;
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
