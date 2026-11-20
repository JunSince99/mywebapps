// Builds 지출 기록 (installable web app) from src/app.html.
// Output goes to the folder given as the first argument (the root build passes dist/expense),
// or to ./dist when run on its own. Paths are relative, so the app works under any URL prefix.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const OUT = resolve(process.argv[2] || 'dist');
process.chdir(dirname(fileURLToPath(import.meta.url)));

const swTemplate = readFileSync('tools/sw.template.js', 'utf8');
const raw = readFileSync('src/app.html', 'utf8');
const cloud = readFileSync('../../shared/cloud.js', 'utf8'); // auto backup, shared by all apps
const version = createHash('sha256').update(raw + swTemplate + cloud + readFileSync('build.mjs', 'utf8')).digest('hex').slice(0, 10);
const src = raw.replaceAll('__APP_VERSION__', version);
const title = (src.match(/<title>([\s\S]*?)<\/title>/) || [, '지출 기록'])[1];
const style = src.match(/<style>[\s\S]*?<\/style>/)[0];
const body = src
  .replace(/<title>[\s\S]*?<\/title>\s*/, '')
  .replace(/<meta name="claude:[^>]*>\s*/g, '')
  .replace(style, '')
  .trim();

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${title}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1013" media="(prefers-color-scheme: dark)">
<meta name="format-detection" content="telephone=no">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png?v=6">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png?v=6">
<link rel="apple-touch-startup-image" media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="splash/iphone-16-pro-portrait.png?v=3">
<style>
:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px)}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;overscroll-behavior:none}
body{margin:0;-webkit-touch-callout:none}
[hidden]{display:none!important}
</style>
${style}
</head>
<body>
${body.replace('<!--CLOUD-->', () => `<script>\n${cloud}\n</script>`)}
<script>
if('serviceWorker' in navigator){
  // A new version takes over when the server has one; reload into it, but never while a sheet is open.
  let current=navigator.serviceWorker.controller, pending=false;
  const reload=()=>{if(document.body.classList.contains('lock')){pending=true;return}location.reload()};
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!current){current=navigator.serviceWorker.controller;return}reload()});
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
    const check=()=>reg.update().catch(()=>{});
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')check();
      else if(pending)location.reload();
    });
    setInterval(check,30*60*1000);
  }).catch(()=>{});
}
if(navigator.storage&&navigator.storage.persist){navigator.storage.persist().catch(()=>{})}
</script>
</body>
</html>
`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('public', OUT, { recursive: true });
writeFileSync(`${OUT}/index.html`, html);
writeFileSync(`${OUT}/sw.js`, swTemplate.replace('__VERSION__', version));
console.log(`built ${OUT} version ${version}`);
