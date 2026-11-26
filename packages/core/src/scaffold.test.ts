import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeGitLabUrl } from './gitlab.ts';
import { validateLinkUrl, gitlabPagesBaseURL, goMod, hugoToml, pseudoVersion, pagesBaseURL, siteFiles, validateCustomDomain, validateGitLabProjectPath } from './scaffold.ts';
import { validateRepoName } from './setup.ts';
import type { BlogConfig } from './types.ts';

const config: BlogConfig = {
  title: 'テスト "ブログ"',
  description: '説明',
  author: 'Tester',
  owner: 'Kmmz532',
  ownerType: 'User',
  repo: 'my-blog',
  provider: 'github-pages',
  theme: 'warm',
  language: 'ja',
};

test('pagesBaseURL: project page and user page', () => {
  assert.equal(pagesBaseURL('Kmmz532', 'my-blog'), 'https://kmmz532.github.io/my-blog/');
  assert.equal(pagesBaseURL('Kmmz532', 'kmmz532.github.io'), 'https://kmmz532.github.io/');
  assert.equal(pagesBaseURL('alice', 'blog', 'https://example.jp'), 'https://example.jp/blog/');
  assert.equal(pagesBaseURL('alice', 'alice.github.io', 'https://example.jp/'), 'https://example.jp/');
});

test('hugoToml: escapes strings and imports the chosen theme', () => {
  const toml = hugoToml(config);
  assert.match(toml, /^title = "テスト \\"ブログ\\""$/m);
  assert.match(toml, /^defaultContentLanguage = "ja"$/m);
  assert.match(toml, /path = "github.com\/kmmz532\/blogit\/themes\/warm"/);
  assert.match(toml, /repo = "Kmmz532\/my-blog"/);
});

test('siteFiles: includes workflow and a first post, and uses the given baseURL', () => {
  const files = siteFiles(config, { now: new Date('2026-11-25T00:00:00Z'), baseURL: 'https://kmmz.jp/my-blog/' });
  assert.ok(files['.github/workflows/deploy.yml'].includes('${{ steps.deployment.outputs.page_url }}'));
  assert.ok(files['.github/workflows/deploy.yml'].includes('--baseURL "${{ steps.pages.outputs.base_url }}/"'));
  assert.ok(!files['.github/workflows/deploy.yml'].includes('hugo_cache}'));
  assert.ok('content/posts/2026-11-25-hello.md' in files);
  assert.match(files['hugo.toml'], /^baseURL = "https:\/\/kmmz\.jp\/my-blog\/"$/m);
});

test('validateRepoName', () => {
  assert.ok(validateRepoName('my-blog'));
  assert.ok(!validateRepoName('my blog'));
  assert.ok(!validateRepoName('..'));
});

const gitlab: BlogConfig = { ...config, owner: 'Example-Group/sub', provider: 'gitlab-pages', gitlabUrl: 'https://gitlab.com' };

test('gitlabPagesBaseURL: user page, project page and subgroup', () => {
  assert.equal(gitlabPagesBaseURL('Alice', 'blog'), 'https://alice.gitlab.io/blog/');
  assert.equal(gitlabPagesBaseURL('alice', 'alice.gitlab.io'), 'https://alice.gitlab.io/');
  assert.equal(gitlabPagesBaseURL('Example-Group/sub', 'blog'), 'https://example-group.gitlab.io/sub/blog/');
});

test('siteFiles: GitLab Pages uses .gitlab-ci.yml and CI_PAGES_URL', () => {
  const files = siteFiles(gitlab, { now: new Date('2026-11-25T00:00:00Z') });
  assert.ok(!('.github/workflows/deploy.yml' in files));
  assert.match(files['.gitlab-ci.yml'], /^pages:$/m);
  assert.match(files['.gitlab-ci.yml'], /--baseURL "\$\{CI_PAGES_URL\}\/"/);
  assert.match(files['hugo.toml'], /^baseURL = "https:\/\/example-group\.gitlab\.io\/sub\/my-blog\/"$/m);
  assert.match(files['hugo.toml'], /^\[params\.ghAdmin\]$/m);
  assert.match(files['hugo.toml'], /^  provider = "gitlab"$/m);
  assert.match(files['hugo.toml'], /^  gitlabURL = "https:\/\/gitlab\.com"$/m);
  assert.match(files['hugo.toml'], /^  repo = "Example-Group\/sub\/my-blog"$/m);
  assert.doesNotMatch(files['hugo.toml'], /hugo-gl-admin|glAdmin|params\.blogit/);
  assert.ok(!('content/admin.md' in files));
  assert.match(files['go.mod'], /^module gitlab\.com\/Example-Group\/sub\/my-blog$/m);
});

test('siteFiles: self-hosted GitLab uses its host and a relative baseURL', () => {
  const files = siteFiles({ ...gitlab, gitlabUrl: 'git.example.com/' });
  assert.match(files['hugo.toml'], /^baseURL = "\/"$/m);
  assert.match(files['go.mod'], /^module git\.example\.com\//m);
});

test('siteFiles: GitLab repository published to Cloudflare Pages', () => {
  const files = siteFiles({ ...gitlab, provider: 'cloudflare-pages' });
  assert.ok(!('.gitlab-ci.yml' in files));
  assert.ok(!('.github/workflows/deploy.yml' in files));
  assert.match(files['hugo.toml'], /^baseURL = "https:\/\/my-blog\.pages\.dev\/"$/m);
  assert.match(files['hugo.toml'], /^  provider = "gitlab"$/m);
  assert.match(files['go.mod'], /^module gitlab\.com\//m);
});

test('siteFiles: uses the repository default branch', () => {
  const files = siteFiles(config, { branch: 'master' });
  assert.match(files['hugo.toml'], /^  branch = "master"$/m);
  assert.match(files['hugo.toml'], /^  siteBranch = "master"$/m);
  assert.match(files['.github/workflows/deploy.yml'], /branches: \["master"\]/);
});

test('normalizeGitLabUrl', () => {
  assert.equal(normalizeGitLabUrl('gitlab.com'), 'https://gitlab.com');
  assert.equal(normalizeGitLabUrl('https://git.example.com/gitlab/'), 'https://git.example.com/gitlab');
  assert.equal(normalizeGitLabUrl(''), null);
});

test('validateGitLabProjectPath', () => {
  assert.ok(validateGitLabProjectPath('my-blog'));
  assert.ok(!validateGitLabProjectPath('-blog'));
  assert.ok(!validateGitLabProjectPath('blog.git'));
  assert.ok(!validateGitLabProjectPath('my blog'));
});

test('validateCustomDomain', () => {
  assert.ok(validateCustomDomain('blog.example.jp'));
  assert.ok(validateCustomDomain('example.jp'));
  assert.ok(!validateCustomDomain('example'));
  assert.ok(!validateCustomDomain('https://blog.example.jp'));
  assert.ok(!validateCustomDomain('blog.example.jp/path'));
  assert.ok(!validateCustomDomain('-blog.example.jp'));
});

test('siteFiles: GitHub Pages with a custom domain uses it as baseURL', () => {
  const files = siteFiles({ ...config, customDomain: 'Blog.Example.jp' });
  assert.match(files['hugo.toml'], /^baseURL = "https:\/\/blog\.example\.jp\/"$/m);
});

test('hugoToml: advanced settings', () => {
  const toml = hugoToml({ ...config, bio: '自己紹介', sidebar: false, pagerSize: 20, links: [{ icon: 'github', url: 'https://github.com/example' }, { icon: 'x', url: 'https://x.com/example' }, { icon: 'unknown', url: 'https://example.jp/' }] });
  assert.match(toml, /^  pagerSize = 20$/m);
  assert.match(toml, /^  bio = "自己紹介"$/m);
  assert.match(toml, /^  sidebar = false$/m);
  assert.match(toml, /name = "GitHub"\n    url = "https:\/\/github\.com\/example"\n    icon = "fa-brands fa-github"/);
  assert.match(toml, /name = "X"\n    url = "https:\/\/x\.com\/example"/);
  assert.equal(toml.match(/\[\[params\.links\]\]/g)?.length, 2);
});

test('hugoToml: defaults without advanced settings', () => {
  const toml = hugoToml(config);
  assert.match(toml, /^  pagerSize = 10$/m);
  assert.doesNotMatch(toml, /bio =|sidebar =|params\.links/);
});

test('validateLinkUrl', () => {
  assert.ok(validateLinkUrl('https://example.jp/'));
  assert.ok(validateLinkUrl('mailto:info@example.jp'));
  assert.ok(!validateLinkUrl('example.jp'));
  assert.ok(!validateLinkUrl('javascript:alert(1)'));
});

test('hugoToml: link names follow the blog language', () => {
  const links = [{ icon: 'website', url: 'https://example.jp/' }];
  assert.match(hugoToml({ ...config, links }), /name = "Webサイト"/);
  assert.match(hugoToml({ ...config, language: 'en', links }), /name = "Website"/);
});

test('pseudoVersion: builds a Go pseudo-version from the commit time in UTC', () => {
  assert.equal(
    pseudoVersion('0123456789abcdef0123456789abcdef01234567', '2026-11-26T09:08:07+09:00'),
    'v0.0.0-20261126000807-0123456789ab',
  );
});

test('goMod: requires no theme by default and pins the theme and base when a version is given', () => {
  assert.doesNotMatch(goMod(config), /require/);
  const pinned = goMod({ ...config, themeVersion: 'v0.0.0-20261126000807-0123456789ab' });
  assert.match(pinned, /github\.com\/kmmz532\/blogit\/themes\/base v0\.0\.0-20261126000807-0123456789ab/);
  assert.match(pinned, /github\.com\/kmmz532\/blogit\/themes\/warm v0\.0\.0-20261126000807-0123456789ab/);
});

test('hugoToml: writes the admin login settings only for GitHub repositories', () => {
  const adminLogin = { clientId: 'cid', tokenUrl: 'https://auth.example/github/token', relayUrl: 'https://blogit.example/oauth/' };
  const toml = hugoToml({ ...config, adminLogin });
  assert.match(toml, /oauthClientID = "cid"/);
  assert.match(toml, /oauthRelayURL = "https:\/\/blogit\.example\/oauth\/"/);
  assert.doesNotMatch(hugoToml(config), /oauthClientID/);
  assert.doesNotMatch(hugoToml({ ...config, provider: 'gitlab-pages', adminLogin }), /oauthClientID/);
});

test('siteFiles: adds the uploaded favicon and default thumbnail as binary files', () => {
  const files = siteFiles({ ...config, favicon: { ext: 'png', base64: 'AAAA' }, defaultThumbnail: { ext: 'jpg', base64: 'BBBB' } });
  assert.deepEqual(files['static/favicon.png'], { base64: 'AAAA' });
  assert.deepEqual(files['static/default-thumbnail.jpg'], { base64: 'BBBB' });
  const toml = files['hugo.toml'] as string;
  assert.match(toml, /icon = "\/favicon\.png"/);
  assert.match(toml, /appleIcon = "\/favicon\.png"/);
  assert.match(toml, /defaultThumbnail = "\/default-thumbnail\.jpg"/);
  assert.doesNotMatch(siteFiles(config)['hugo.toml'] as string, /icon =/);
});

test('hugoToml: writes the rebuild workflow for GitHub Pages and GitLab Pages only', () => {
  assert.match(hugoToml(config), /buildWorkflow = "deploy\.yml"/);
  assert.match(hugoToml({ ...config, provider: 'gitlab-pages' }), /buildWorkflow = "\.gitlab-ci\.yml"/);
  assert.doesNotMatch(hugoToml({ ...config, provider: 'cloudflare-pages' }), /buildWorkflow/);
});
