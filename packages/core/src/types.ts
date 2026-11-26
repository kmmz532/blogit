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
  // ファビコン（ico・png・svg）。png なら apple-touch-icon にも使う。省略時は設定しない
  favicon?: UploadedImage;
  // 記事カードの既定のサムネイル。省略時は画像なし
  defaultThumbnail?: UploadedImage;
  // true ならリポジトリを非公開で作成する。省略時は公開
  private?: boolean;
  theme: ThemeName;
  // 管理画面（hugo-gh-admin）の「GitHub でログイン」に使う OAuth の設定。省略時はトークンを入力してログインする（GitHub のリポジトリのみ）
  adminLogin?: AdminLogin;
  // テーマの版を固定するときの Go modules の版（例: v0.0.0-20261126000000-0123456789ab）。省略時は最新の版を利用し、自動で更新される
  themeVersion?: string;
  language: Language;
}

export interface AdminLogin {
  // GitHub OAuth App の Client ID
  clientId: string;
  // OAuth のコードをトークンに交換する URL（Blogit の認証用 Worker の /github/token）
  tokenUrl: string;
  // OAuth App のコールバック URL にある中継ページ（Blogit の /oauth/）
  relayUrl: string;
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

// 生成するファイル（パス → 中身）。画像などのバイナリは Base64 で持つ
export type FileMap = Record<string, string | BinaryFile>;

export interface BinaryFile {
  base64: string;
}

// 作成時にアップロードする画像（ファビコン・既定のサムネイル）。ext は小文字の拡張子
export interface UploadedImage {
  ext: string;
  base64: string;
}
