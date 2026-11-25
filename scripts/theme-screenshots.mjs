// テーマのスクリーンショットを撮る。examples/site をテーマごとに hugo server で配信し、Chrome のヘッドレスで撮影する。
// 出力先は packages/web/public/themes/（Web アプリのテーマ選択に出す）
//
//   node scripts/theme-screenshots.mjs
//
// 環境変数: HUGO（hugo の実行ファイル。既定は hugo）、CHROME（Chrome の実行ファイル）
import { spawn, execFile } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const root = resolve(import.meta.dirname, '..');
const site = join(root, 'examples/site');
const out = join(root, 'packages/web/public/themes');
const hugo = process.env.HUGO ?? 'hugo';
const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const themes = ['default', 'warm', 'cool'];
const port = 1390;

// 撮るページ: [ファイル名, パス, ダークモードか]
const shots = [
  ['home-light', '/', false],
  ['home-dark', '/', true],
  ['post-light', '/posts/2026-11-18-hugo-modules/', false],
];

const run = promisify(execFile);
const baseConfig = readFileSync(join(site, 'hugo.toml'), 'utf8');

async function waitForServer(url) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`hugo server did not start: ${url}`);
}

mkdirSync(out, { recursive: true });
for (const theme of themes) {
  const config = join(site, `.hugo-${theme}.toml`);
  writeFileSync(config, baseConfig.replace(/themes\/default"/, `themes/${theme}"`));
  const server = spawn(hugo, ['server', '--config', config, '--port', String(port), '--disableLiveReload', '--logLevel', 'error'], {
    cwd: site,
    stdio: 'inherit',
  });
  try {
    const base = `http://localhost:${port}`;
    await waitForServer(base + '/');
    for (const [name, path, dark] of shots) {
      const file = join(out, `${theme}-${name}.png`);
      await run(chrome, [
        '--headless=new',
        '--hide-scrollbars',
        '--window-size=1280,800',
        '--virtual-time-budget=4000',
        // OS の設定に関係なく配色を固定する（0: dark, 1: light）
        `--blink-settings=preferredColorScheme=${dark ? 0 : 1}`,
        `--screenshot=${file}`,
        base + path,
      ]);
      console.log(file);
    }
  } finally {
    server.kill();
    rmSync(config);
  }
}
