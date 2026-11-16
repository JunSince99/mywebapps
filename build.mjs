// Builds every app in apps/<name>/ into dist/<name>/ and writes a landing page at dist/index.html.
// Each app has its own build.mjs that takes the output folder as its first argument.
// The site is served from https://<user>.github.io/<repo>/, so every app lives at <repo>/<name>/.
import { readdirSync, existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');

const apps = readdirSync('apps', { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('_') && existsSync(join('apps', d.name, 'build.mjs')))
  .map(d => d.name)
  .sort();

const listed = [];
for (const name of apps) {
  const r = spawnSync(process.execPath, [join('apps', name, 'build.mjs'), join('dist', name)], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
  const manifestPath = join('apps', name, 'public', 'manifest.webmanifest');
  const m = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const icon = existsSync(join('apps', name, 'public', 'icons', 'apple-touch-icon.png')) ? `${name}/icons/apple-touch-icon.png` : '';
  listed.push({ name, title: m.name || name, description: m.description || '', icon });
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rows = listed.map(a => `
  <a class="app" href="${a.name}/">
    ${a.icon ? `<img src="${a.icon}" alt="" width="52" height="52">` : `<span class="ph">${esc(a.title[0])}</span>`}
    <span class="txt"><b>${esc(a.title)}</b>${a.description ? `<small>${esc(a.description)}</small>` : ''}</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>
  </a>`).join('');

writeFileSync('dist/index.html', `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>웹앱</title>
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1013" media="(prefers-color-scheme: dark)">
<style>
:root{--bg:#ffffff;--ink:#15171c;--ink-2:#6c7180;--ink-3:#a8acb7;--line:#eceef2;--fill:#f2f3f6;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0f1013;--ink:#f2f3f5;--ink-2:#989dab;--ink-3:#5f6470;--line:#212329;--fill:#24262c;color-scheme:dark}}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink)}
body{font:15px/1.4 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;letter-spacing:-.01em;-webkit-font-smoothing:antialiased}
main{max-width:440px;margin:0 auto;padding:calc(28px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 40px max(16px,env(safe-area-inset-left,0px))}
h1{margin:0 0 4px;font-size:28px;font-weight:700;letter-spacing:-.02em}
p{margin:0 0 20px;color:var(--ink-2);font-size:14px}
.app{display:grid;grid-template-columns:52px minmax(0,1fr) 18px;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);color:inherit;text-decoration:none}
.app:last-child{border-bottom:0}
.app img,.ph{width:52px;height:52px;border-radius:12px;box-shadow:0 0 0 .5px rgba(0,0,0,.12)}
.ph{display:grid;place-items:center;background:var(--fill);font-weight:700}
.txt{display:flex;flex-direction:column;gap:2px;min-width:0}
.txt b{font-size:16px;font-weight:600}
.txt small{font-size:13px;color:var(--ink-2)}
.app svg{width:18px;height:18px;color:var(--ink-3)}
</style>
</head>
<body>
<main>
<h1>웹앱</h1>
<p>Safari에서 앱을 열고 공유 → 홈 화면에 추가하면 앱처럼 쓸 수 있어요.</p>${rows}
</main>
</body>
</html>
`);
writeFileSync('dist/.nojekyll', '');
console.log(`built landing page with ${listed.length} app(s): ${listed.map(a => a.name).join(', ')}`);
