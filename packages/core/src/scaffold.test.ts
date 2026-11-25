import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hugoToml, pagesBaseURL, siteFiles } from './scaffold.ts';
import { validateRepoName } from './setup.ts';
import type { BlogConfig } from './types.ts';

const config: BlogConfig = {
  title: 'テスト "ブログ"',
  description: '説明',
  author: 'Tester',
  owner: 'Kmmz532',
  ownerType: 'User',
  repo: 'my-blog',
  theme: 'warm',
  language: 'ja',
};

test('pagesBaseURL: project page and user page', () => {
  assert.equal(pagesBaseURL('Kmmz532', 'my-blog'), 'https://kmmz532.github.io/my-blog/');
  assert.equal(pagesBaseURL('Kmmz532', 'kmmz532.github.io'), 'https://kmmz532.github.io/');
});

test('hugoToml: escapes strings and imports the chosen theme', () => {
  const toml = hugoToml(config);
  assert.match(toml, /^title = "テスト \\"ブログ\\""$/m);
  assert.match(toml, /^defaultContentLanguage = "ja"$/m);
  assert.match(toml, /path = "github.com\/kmmz532\/blogit\/themes\/warm"/);
  assert.match(toml, /repo = "Kmmz532\/my-blog"/);
});

test('siteFiles: includes workflow and a first post', () => {
  const files = siteFiles(config, new Date('2026-11-25T00:00:00Z'));
  assert.ok(files['.github/workflows/deploy.yml'].includes('${{ steps.deployment.outputs.page_url }}'));
  assert.ok('content/posts/2026-11-25-hello.md' in files);
});

test('validateRepoName', () => {
  assert.ok(validateRepoName('my-blog'));
  assert.ok(!validateRepoName('my blog'));
  assert.ok(!validateRepoName('..'));
});
