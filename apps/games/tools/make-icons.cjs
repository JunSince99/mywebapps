// Renders the app icons (three fanned game covers on the app's dark background) into public/icons.
// Run: node tools/make-icons.cjs  (needs Playwright with Chromium)
const {chromium}=require('playwright');
const path=require('path');
const out=path.join(__dirname,'..','public','icons');
const svg=(scale)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#0b0c10"/>
<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
 <rect x="150" y="150" width="150" height="200" rx="16" fill="#3d5a8c" transform="rotate(-14 225 350)"/>
 <rect x="212" y="150" width="150" height="200" rx="16" fill="#8c4f3d" transform="rotate(14 287 350)"/>
 <rect x="181" y="128" width="150" height="200" rx="16" fill="#f1f2f5"/>
 <rect x="203" y="150" width="106" height="110" rx="8" fill="#0b0c10"/>
 <rect x="203" y="276" width="70" height="14" rx="7" fill="#0b0c10"/>
</g></svg>`;
(async()=>{
  const b=await chromium.launch();
  for(const [name,size,scale] of [['apple-touch-icon.png',180,1],['icon-192.png',192,1],['icon-512.png',512,1],['icon-maskable-512.png',512,.8],['favicon-32.png',32,1.25]]){
    const p=await b.newPage({viewport:{width:size,height:size}});
    await p.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg(scale)}`);
    await p.screenshot({path:path.join(out,name)});await p.close();
  }
  await b.close();
})();
