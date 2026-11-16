/* Auto backup to a secret GitHub Gist, shared by every app in this repo (each app's build inlines this file).
   One gist ("mywebapps backup") holds one file per app. The token is kept only in this device's storage.
   App side: Cloud.init({...}) once, Cloud.changed() after every save, Cloud.mount(el) when settings open. */
(function(){
const API='https://api.github.com', DESC='mywebapps backup';
const TOKEN_URL='https://github.com/settings/tokens/new?scopes=gist&description=mywebapps%20backup';
const LS={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
let cfg=null,root=null,timer=null,busy=false,again=false,state='idle',error='',armed=null,armT=null;
const token=()=>LS.get('cloud.token'), gist=()=>LS.get('cloud.gist');
const lastKey=()=>`cloud.last.${cfg.file}`, last=()=>+LS.get(lastKey())||0;

async function gh(path,opt={}){
  const r=await fetch(API+path,{...opt,cache:'no-store',headers:{'Authorization':'Bearer '+token(),'Accept':'application/vnd.github+json',...(opt.body?{'Content-Type':'application/json'}:{})}});
  if(!r.ok){const e=new Error('http '+r.status);e.status=r.status;throw e}
  return r.status===204?null:r.json();
}
function errText(e){
  if(e&&e.status===401)return '토큰이 맞지 않거나 만료됐어요. 연결을 끊고 새 토큰으로 다시 연결해 주세요.';
  if(e&&(e.status===403||e.status===404))return 'Gist 권한이 없는 토큰이에요. 토큰을 만들 때 gist에 체크했는지 확인해 주세요.';
  if(e&&e.status)return `백업하지 못했어요 (오류 ${e.status}). 잠시 뒤 다시 시도해요.`;
  return '인터넷에 연결되면 다시 백업할게요.';
}
async function findGist(){
  for(let page=1;page<=5;page++){
    const list=await gh(`/gists?per_page=100&page=${page}`);
    const g=list.find(x=>x.description===DESC);if(g)return g.id;
    if(list.length<100)break;
  }
  return null;
}
async function readRemote(){
  if(!gist())return null;
  const g=await gh(`/gists/${gist()}`);
  const f=g.files&&g.files[cfg.file];if(!f)return null;
  let text=f.content;
  if(f.truncated&&f.raw_url)text=await (await fetch(f.raw_url,{cache:'no-store'})).text();
  try{return JSON.parse(text)}catch(e){return null}
}
async function upload(){
  if(!token()||state==='conflict')return;
  if(busy){again=true;return}
  busy=true;clearTimeout(timer);timer=null;state='saving';paint();
  try{
    const content=JSON.stringify(await cfg.getData());
    if(!gist()){const id=await findGist();if(id)LS.set('cloud.gist',id)}
    let done=false;
    if(gist()){
      try{await gh(`/gists/${gist()}`,{method:'PATCH',body:JSON.stringify({files:{[cfg.file]:{content}}})});done=true}
      catch(e){if(e.status===404)LS.set('cloud.gist',null);else throw e} /* gist was deleted: make a new one */
    }
    if(!done){const g=await gh('/gists',{method:'POST',body:JSON.stringify({description:DESC,public:false,files:{[cfg.file]:{content}}})});LS.set('cloud.gist',g.id)}
    LS.set(lastKey(),String(Date.now()));error='';
  }catch(e){error=errText(e)}
  busy=false;state='idle';paint();
  if(again){again=false;schedule(1500)}
}
function schedule(ms=4000){if(!cfg||!token()||state==='conflict')return;clearTimeout(timer);timer=setTimeout(upload,ms)}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&timer)upload()});
window.addEventListener('online',()=>{if(error)schedule(800)});

async function connect(raw){
  const t=String(raw||'').trim();if(!t)return;
  LS.set('cloud.token',t);LS.set('cloud.gist',null);error='';state='connecting';paint();
  try{
    await gh('/gists?per_page=1'); /* checks the token */
    const id=await findGist();if(id)LS.set('cloud.gist',id);
    const remote=id?await readRemote():null;
    if(remote&&!cfg.hasLocalData()){
      await cfg.applyData(remote);LS.set(lastKey(),String(Date.now()));state='idle';paint();
      cfg.toast&&cfg.toast('백업에서 기록을 복원했어요');return;
    }
    if(remote){state='conflict';paint();return} /* both sides have records: let the person choose */
    state='idle';await upload();
    if(!error&&cfg.toast)cfg.toast('자동 백업을 켰어요');
  }catch(e){LS.set('cloud.token',null);LS.set('cloud.gist',null);state='idle';error=errText(e);paint()}
}
async function restore(){
  state='restoring';paint();
  try{
    const remote=await readRemote();
    if(!remote){state='idle';error='백업에 이 앱의 기록이 아직 없어요.';paint();return}
    await cfg.applyData(remote);LS.set(lastKey(),String(Date.now()));state='idle';error='';paint();
    cfg.toast&&cfg.toast('백업에서 기록을 복원했어요');
  }catch(e){state='idle';error=errText(e);paint()}
}
function disconnect(){clearTimeout(timer);timer=null;LS.set('cloud.token',null);LS.set('cloud.gist',null);state='idle';error='';paint()}

/* ---------- settings UI ---------- */
const ago=t=>{if(!t)return '아직 백업 전';const s=(Date.now()-t)/1000;if(s<60)return '방금 백업했어요';if(s<3600)return `${Math.floor(s/60)}분 전에 백업했어요`;
  if(s<86400)return `${Math.floor(s/3600)}시간 전에 백업했어요`;const d=new Date(t);return `${d.getMonth()+1}월 ${d.getDate()}일에 백업했어요`};
const CSS=`.cl{display:flex;flex-direction:column;gap:10px}
.cl-box{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:14px;background:var(--cl-bg)}
.cl-note{margin:0;font-size:13px;line-height:1.55;color:var(--ink-2)}
.cl-step{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14px;font-weight:600}
.cl-link{flex:none;display:inline-flex;align-items:center;height:36px;padding:0 14px;border-radius:10px;background:var(--cl-bg2);color:var(--ink);font-size:13.5px;font-weight:700;text-decoration:none}
.cl-row{display:flex;gap:8px}
.cl-in{flex:1;min-width:0;height:44px;padding:0 12px;border:0;border-radius:10px;background:var(--cl-bg2);color:var(--ink);font:inherit;font-size:16px;outline:none;-webkit-user-select:text;user-select:text}
.cl-in::placeholder{color:var(--ink-3)}
.cl-btn{flex:none;height:44px;padding:0 16px;border-radius:10px;background:var(--ink);color:var(--cl-on);font:inherit;font-size:14px;font-weight:700;border:0;cursor:pointer}
.cl-btn:disabled{opacity:.4;cursor:default}
.cl-btn.sub{background:var(--cl-bg2);color:var(--ink)}
.cl-btn.warn{background:var(--cl-bg2);color:var(--cl-warn)}
.cl-btn.armed{background:var(--cl-warn);color:var(--cl-on)}
.cl-acts{display:flex;gap:8px;flex-wrap:wrap}
.cl-acts .cl-btn{flex:1;height:40px;padding:0 10px;font-size:13.5px}
.cl-status{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600}
.cl-status i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--cl-ok)}
.cl-status i.busy{background:var(--ink-3);animation:clp 1s ease-in-out infinite}
.cl-status i.err{background:var(--cl-warn)}
.cl-status small{display:block;margin-top:2px;font-size:12.5px;font-weight:400;color:var(--ink-2)}
.cl-err{margin:0;font-size:13px;line-height:1.5;color:var(--cl-warn)}
@keyframes clp{50%{opacity:.35}}`;
function paint(){
  if(!root||!root.isConnected)return;
  const on=!!token(),busyNow=state==='saving'||state==='connecting'||state==='restoring';
  let h='';
  if(!on){
    h=`<div class="cl-box"><p class="cl-note">GitHub 비밀 Gist에 기록을 자동으로 백업해요. 앱을 다시 설치하거나 폰을 바꿔도 토큰만 넣으면 그대로 돌아와요. 토큰은 이 기기에만 저장돼요.</p>
      <div class="cl-step"><span>1. GitHub에서 토큰 만들기</span><a class="cl-link" href="${TOKEN_URL}" target="_blank" rel="noopener">열기 ↗</a></div>
      <div class="cl-row"><input class="cl-in" data-cl="in" placeholder="2. 토큰 붙여넣기 (ghp_…)" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="cl-btn" data-cl="connect"${busyNow?' disabled':''}>${state==='connecting'?'연결 중…':'연결'}</button></div>
      ${error?`<p class="cl-err">${error}</p>`:''}</div>`;
  }else if(state==='conflict'){
    h=`<div class="cl-box"><div class="cl-status"><i class="err"></i><span>백업과 이 기기에 모두 기록이 있어요<small>어느 쪽을 남길지 골라 주세요</small></span></div>
      <div class="cl-acts"><button class="cl-btn sub" data-cl="restore">백업으로 바꾸기</button><button class="cl-btn sub" data-cl="push">이 기기 기록으로 백업</button></div></div>`;
  }else{
    const label=state==='saving'?'백업하는 중…':state==='restoring'?'복원하는 중…':state==='connecting'?'연결 중…':ago(last());
    h=`<div class="cl-box"><div class="cl-status"><i class="${busyNow?'busy':error?'err':''}"></i><span>자동 백업 켜짐<small>${label}</small></span></div>
      ${error?`<p class="cl-err">${error}</p>`:''}
      <div class="cl-acts"><button class="cl-btn sub" data-cl="now"${busyNow?' disabled':''}>지금 백업</button>
      <button class="cl-btn sub${armed==='restore'?' armed':''}" data-cl="restore"${busyNow?' disabled':''}>${armed==='restore'?'한 번 더 누르면 복원':'백업에서 복원'}</button>
      <button class="cl-btn warn${armed==='off'?' armed':''}" data-cl="off">${armed==='off'?'한 번 더 누르면 끄기':'끄기'}</button></div></div>`;
  }
  root.innerHTML=h;
  if(cfg.onState)cfg.onState(); /* lets the app refresh text that depends on whether backup is on */
}
function arm(what){clearTimeout(armT);armed=what;paint();armT=setTimeout(()=>{armed=null;paint()},3000)}
function onClick(e){
  const b=e.target.closest('[data-cl]');if(!b||b.disabled)return;
  const a=b.dataset.cl;
  if(a==='connect')connect(root.querySelector('[data-cl="in"]').value);
  else if(a==='now')upload();
  else if(a==='push'){state='idle';upload()}
  else if(a==='restore'){if(state==='conflict'||armed==='restore'){armed=null;restore()}else arm('restore')}
  else if(a==='off'){if(armed==='off'){armed=null;disconnect()}else arm('off')}
}

window.Cloud={
  init(c){
    cfg=c;
    if(!document.getElementById('cl-css')){const s=document.createElement('style');s.id='cl-css';s.textContent=CSS;document.head.appendChild(s)}
    if(token())schedule(2500); /* catch up anything saved while offline */
  },
  changed(){schedule()},
  mount(el){
    root=el;armed=null;
    Object.entries(cfg.vars||{}).forEach(([k,v])=>el.style.setProperty(k,v));
    if(!el.dataset.clBound){el.addEventListener('click',onClick);el.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.cl==='in'){e.preventDefault();connect(e.target.value)}});el.dataset.clBound='1'}
    paint();
  },
  get on(){return !!token()},
};
})();
