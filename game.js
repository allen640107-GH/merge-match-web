'use strict';
/* 花語寶石園 Gem Blossom Garden — one-finger match-3 + merge */
const $=s=>document.querySelector(s);
const N=8, NSLOT=6, SEED_COST=12;
const GEMC=['#ff3b5c','#ff9d2e','#ffd93b','#4cd964','#3fa9ff','#b45cff'];
const GEMNAME=['紅心','太陽','星星','葉子','水滴','鑽石'];
const TIERNAME=['魔法種子','小嫩芽','鬱金香','玫瑰花叢','魔法花樹','水晶噴泉'];
const CHARS={
 fox:{name:'小橘',full:'狐狸園丁 小橘',line:'活潑開朗，最愛幫花澆水！',img:'a/ch_fox.png',
   cheers:['好棒喔！','哇～連鎖！','花都開了！','太厲害了！','再來再來！'],tap:['嘻嘻，好癢！','一起種花吧！','今天天氣真好～']},
 panda:{name:'熊爺爺',full:'貓熊爺爺',line:'慢慢來、不著急，花自然會開。',img:'a/ch_panda.png',
   cheers:['不錯不錯～','好功夫！','呵呵，漂亮！','老夫佩服！','妙啊！'],tap:['慢慢來就好。','喝杯茶吧～','呵呵呵。']},
 bunny:{name:'白白',full:'冒險兔 白白',line:'愛冒險的小兔子，魔法水晶交給我！',img:'a/ch_bunny.png',
   cheers:['耶！衝啊！','魔法發動！','超級連鎖！','跳起來啦！','閃閃發亮！'],tap:['蹦蹦跳跳！','要去冒險嗎？','我的水晶法杖！']}
};
const IMG={};
function loadImg(k,src){return new Promise(r=>{const i=new Image();i.onload=()=>{IMG[k]=i;r()};i.onerror=()=>r();i.src=src;});}
const assetP=Promise.all([...[0,1,2,3,4,5].map(i=>loadImg('g'+i,'a/g'+i+'.png')),...[0,1,2,3,4,5].map(i=>loadImg('t'+i,'a/t'+i+'.png')),...['ice','ice_t','vine','crate','acorn','moss','stone'].map(k=>loadImg(k,'a/'+k+'.png'))]);

/* ---------- save (never wiped; merged with defaults) ---------- */
const SKEY='gbg_save_v1';
const DEF={v:2,coins:0,seeds:{wheat:3,carrot:1},inv:{egg:0,milk:0,wool:0},boost:{hammer:1,potion:1,moves:1},farm:{plots:[null,null,null,null],animals:[{k:'hen',t0:0}],decos:[]},daily:{last:'',streak:0},seenCh:{},ended:false,char:null,level:1,stars:{},garden:[{t:2,x:.3,y:.82},{t:1,x:.62,y:.9}],tray:[0,0,-1,-1,-1,-1],energy:0,fs:1.15,sfx:true,music:true,seenFountain:false};
let S;
try{S=Object.assign({},DEF,JSON.parse(localStorage.getItem(SKEY)||'{}'));}catch(e){S=Object.assign({},DEF);}
if(!Array.isArray(S.tray)||S.tray.length!==NSLOT)S.tray=DEF.tray.slice();
['seeds','inv','boost','farm','daily','seenCh'].forEach(k=>{if(!S[k]||typeof S[k]!=='object')S[k]=JSON.parse(JSON.stringify(DEF[k]));});
['coins'].forEach(k=>{if(typeof S[k]!=='number')S[k]=0;});
if(!S.farm.plots)S.farm.plots=[null,null,null,null];if(!S.farm.animals)S.farm.animals=[];if(!S.farm.decos)S.farm.decos=[];
S.migrated=S.migrated||null;
(function migrate(){ // v1 -> v2: endless levels -> 50 hand-made levels; nothing is deleted
 const raw=(()=>{try{return JSON.parse(localStorage.getItem('gbg_save_v1')||'{}')}catch(e){return{}}})();
 if(raw.level&&(raw.v||1)<2&&!S.migrated){const old=raw.level||1;
  const nl=Math.max(1,Math.min(50,Math.round((old-1)*0.8)+1));
  S.v1Level=old;S.level=nl;const st={};for(let i=1;i<nl;i++)st[i]=Math.max(1,(raw.stars||{})[i]||1);S.stars=st;
  S.coins+=100+20*(old-1);S.migrated={from:old,to:nl,at:Date.now()};S.v=2;
  try{localStorage.setItem('gbg_save_v1_backup',JSON.stringify(raw));}catch(e){}
 } else if(!S.migrated){S.migrated={fresh:true};S.v=2;}
})();
function save(){try{localStorage.setItem(SKEY,JSON.stringify(S));}catch(e){}}
function applyFs(){document.documentElement.style.setProperty('--fs',S.fs);}
applyFs();

/* ---------- audio (synth only) ---------- */
let AC=null,master,musicG,sfxG,delayIn;
function initAudio(){
 if(AC){if(AC.state!=='running')AC.resume();return;}
 const C=window.AudioContext||window.webkitAudioContext; if(!C)return;
 AC=new C(); master=AC.createGain();master.gain.value=.9;master.connect(AC.destination);
 sfxG=AC.createGain();sfxG.connect(master);musicG=AC.createGain();musicG.gain.value=.0;musicG.connect(master);
 // simple echo reverb
 const d=AC.createDelay();d.delayTime.value=.33;const fb=AC.createGain();fb.gain.value=.35;const lp=AC.createBiquadFilter();lp.frequency.value=2200;
 delayIn=AC.createGain();delayIn.gain.value=.5;delayIn.connect(d);d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(master);
 // unlock iOS
 const b=AC.createBuffer(1,1,22050),s=AC.createBufferSource();s.buffer=b;s.connect(AC.destination);s.start(0);
 setMusic();startBgm();
}
function setMusic(){if(!AC)return;const mv=S.musicVol==null?.7:S.musicVol,sv=S.sfxVol==null?.8:S.sfxVol;if(musicG)musicG.gain.setTargetAtTime(S.music?.24*mv:0,AC.currentTime,.3);if(sfxG)sfxG.gain.setTargetAtTime(sv*1.1,AC.currentTime,.05);}
function tone(f,dur,type='sine',vol=.2,when=0,slide=0,dest){
 if(!AC||!S.sfx&&!dest)return;const t=AC.currentTime+when;const o=AC.createOscillator(),g=AC.createGain();
 o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0005,t+dur);
 o.connect(g);g.connect(dest||sfxG);if(!dest&&delayIn)g.connect(delayIn);o.start(t);o.stop(t+dur+.05);
}
const PENTA=[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.5,1568,1760,2093];
const SFX={
 swap(){tone(420,.12,'sine',.12,0,700);},
 nope(){tone(330,.12,'triangle',.12);tone(262,.18,'triangle',.12,.1);},
 match(c){const i=Math.min(c-1,7);tone(PENTA[i],.5,'sine',.22);tone(PENTA[i+2],.45,'sine',.14,.07);tone(PENTA[i]*2,.3,'triangle',.05,.02);},
 special(){tone(180,.5,'sine',.3,0,50);tone(900,.35,'triangle',.08,0,2400);},
 seed(){tone(1318,.15,'sine',.12);tone(1760,.25,'sine',.1,.08);},
 merge(t){[0,2,4,7].forEach((k,j)=>tone(PENTA[Math.min(k+t,10)],.45,'sine',.18,j*.07));tone(2637,.6,'sine',.05,.3);},
 chirp(){for(let i=0;i<3;i++)tone(2600,.07,'sine',.15,i*.11,3800);},
 croak(){tone(140,.18,'sawtooth',.12,0,90);tone(150,.18,'sawtooth',.12,.25,95);},
 twinkle(){for(let i=0;i<5;i++)tone(PENTA[5+((Math.random()*6)|0)],.35,'sine',.08,i*.06);},
 chime(t){tone(PENTA[3+t],.8,'sine',.18);tone(PENTA[5+t]||2093,.6,'sine',.07,.05);},
 tap(){tone(880,.08,'sine',.1);},
 win(){[0,2,4,5,7,9].forEach((k,j)=>tone(PENTA[Math.min(k,10)],.7,'triangle',.16,j*.11));},
 crate(){tone(150,.18,'square',.12,0,80);tone(95,.25,'triangle',.18,.03,60);},
 ice(){tone(2400,.12,'sine',.12,0,3200);tone(3100,.18,'sine',.08,.05);},
 vine(){tone(600,.18,'sawtooth',.05,0,300);tone(900,.15,'triangle',.08,.06,1300);},
 coin(){tone(1568,.1,'square',.06);tone(2093,.25,'square',.06,.08);},
 cluck(){tone(800,.06,'square',.06,0,600);tone(900,.08,'square',.06,.1,650);},
 moo(){tone(180,.6,'sawtooth',.08,0,140);},
 baa(){for(let i=0;i<4;i++)tone(420,.07,'sawtooth',.06,i*.07,400);},
 voice(){const b=500+Math.random()*200;tone(b,.09,'triangle',.12,0,b*1.4);tone(b*1.2,.1,'triangle',.1,.1,b*.9);}
};
function sfx(n,a){try{SFX[n](a)}catch(e){}}
let bgmTimer=null,bgmTrack='home',bgmWant='home';
/* v2.1 music: self-synthesized WebAudio tracks (no audio files). Each track = fixed seeded 8-bar loop -> seamless repeat. */
const NOTE=m=>440*Math.pow(2,(m-69)/12);
const TRACKS={
 home:{key:60,bpm:72,prog:[0,9,5,7],mode:[0,2,4,7,9],lead:'sine',seed:1},
 farm:{key:62,bpm:84,prog:[0,5,7,5],mode:[0,2,4,7,9],lead:'triangle',seed:2},
 ch0:{key:60,bpm:76,prog:[0,5,9,7],mode:[0,2,4,7,9],lead:'sine',seed:3},
 ch1:{key:57,bpm:70,prog:[0,8,3,10],mode:[0,3,5,7,10],lead:'triangle',seed:4},
 ch2:{key:65,bpm:80,prog:[0,7,9,5],mode:[0,2,4,7,9],lead:'sine',seed:5},
 ch3:{key:64,bpm:66,prog:[0,9,5,7],mode:[0,2,4,7,11],lead:'sine',seed:6},
 ch4:{key:67,bpm:74,prog:[0,4,9,5],mode:[0,2,4,7,9],lead:'triangle',seed:7},
 ch5:{key:62,bpm:72,prog:[0,10,5,7],mode:[0,2,5,7,9],lead:'sine',seed:8},
 ch6:{key:59,bpm:82,prog:[0,5,7,0],mode:[0,2,4,7,9],lead:'triangle',seed:9},
 ch7:{key:57,bpm:64,prog:[0,8,5,7],mode:[0,3,5,7,10],lead:'sine',seed:10},
 ch8:{key:63,bpm:78,prog:[0,9,4,5],mode:[0,2,4,7,9],lead:'sine',seed:11},
 ch9:{key:65,bpm:70,prog:[0,4,9,7],mode:[0,2,4,7,9,11],lead:'triangle',seed:12}
};
function trackPattern(T){let x=T.seed*9301+49297;const rnd=()=>(x=(x*9301+49297)%233280)/233280;
 const mel=[];for(let b=0;b<64;b++){mel.push(b%2===0&&rnd()<.72?T.mode[(rnd()*T.mode.length)|0]+12*(rnd()<.3?1:0):null);}return mel;}
function startBgm(){
 if(bgmTimer)return;let beat=0,next=AC.currentTime+.2,T=TRACKS.home,mel=trackPattern(T);
 bgmTimer=setInterval(()=>{
  if(!AC||AC.state!=='running')return;
  while(next<AC.currentTime+.6){
   if(beat%64===0||(beat%16===0&&bgmWant!==bgmTrack)){if(bgmWant!==bgmTrack){bgmTrack=bgmWant;beat=0;}T=TRACKS[bgmTrack]||TRACKS.home;mel=trackPattern(T);}
   const bt=60/T.bpm/2,w=next-AC.currentTime,bar=Math.floor(beat/16)%4,root=T.key+T.prog[bar];
   const maj=[0,4,7],mi=[0,3,7],tri=(T.prog[bar]===9||T.prog[bar]===4)?mi:maj;
   if(beat%16===0)tri.forEach(k=>{tone(NOTE(root+k-12),bt*16,'sine',.11,w,0,musicG);tone(NOTE(root+k),bt*14,'triangle',.025,w,0,musicG);});
   if(beat%4===0)tone(NOTE(root-24),bt*3,'sine',.09,w,0,musicG);
   const m=mel[beat%64];if(m!=null)tone(NOTE(T.key+12+m),bt*3.2,T.lead,.06,w,0,musicG);
   if(beat%8===6)tone(NOTE(T.key+24+T.mode[(beat/8|0)%T.mode.length]),bt*2,'sine',.025,w,0,musicG);
   beat=(beat+1)%64;next+=bt;
  }},150);
}
setInterval(()=>{try{const farmOn=$('#farm')&&$('#farm').classList.contains('show');
 bgmWant=farmOn?'farm':(level&&hud&&hud.style.display!=='none'&&!$('#home').classList.contains('show'))?'ch'+level.ch:'home';}catch(e){}},1000);

/* ---------- layout ---------- */
const app=$('#app'),scene=$('#scene'),hud=$('#hud'),goalsEl=$('#goals'),bw=$('#boardWrap'),cv=$('#board'),tray=$('#tray'),mascot=$('#mascot'),boostEl=$('#boost');
const ctx=cv.getContext('2d');
const ofx=document.createElement('canvas');ofx.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:25';app.appendChild(ofx);
const octx=ofx.getContext('2d');
let W,H,B,cs,DPR,wide=false,gardenMode=false;
let tipZone=null,compact=false,tipCol=false,tipShownAt=0;function tipFont(){return Math.min(21*S.fs,Math.max(18,innerWidth*.062));}
function place(el,x,y,w,h){el.style.left=x+'px';el.style.top=y+'px';if(w!=null)el.style.width=w+'px';if(h!=null)el.style.height=h+'px';}
function safe(){const p=document.createElement('div');p.style.cssText='position:fixed;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom)';document.body.appendChild(p);const r=p.getBoundingClientRect();p.remove();return{t:r.top,b:innerHeight-r.bottom};}
function layout(){
 W=innerWidth;H=innerHeight;DPR=Math.min(window.devicePixelRatio||1,3);const sa=safe();const m=10,fs=S.fs;
 ofx.width=W*DPR;ofx.height=H*DPR;
 wide=W>H*1.02;
 const hudH=60*fs, goalH=58*fs;
 if(gardenMode){place(scene,0,0,W,H);scene.style.borderRadius='0';
  const mw=Math.min(W,H)*.32;place(mascot,m,H-mw*1.25-90*fs,mw);renderGarden();return;}
 scene.style.borderRadius='';
 tipZone=null;compact=!wide&&H<800;document.body.classList.toggle('compact',compact);
 if(compact){
  const mm=6,sw=W-2*mm;
  const rowH=Math.round(46*Math.min(fs,1.25));
  place(hud,mm,sa.t+mm,sw,rowH);
  const bsz=Math.round(rowH*.86);boostEl.style.flexDirection='row';boostEl.style.justifyContent='center';
  boostEl.style.setProperty('--bsz',bsz+'px');
  const mp=$('#movesPill').getBoundingClientRect(),gb=$('#btnMenu').getBoundingClientRect();
  const bx=mp.right+6,bw2=Math.max(0,gb.left-6-bx);const bs=Math.max(30,Math.min(bsz,(bw2-14)/3));boostEl.style.setProperty('--bsz',bs+'px');place(boostEl,bx,sa.t+mm+(rowH-bs)/2,bw2,bs);
  goalsEl.style.height='auto';goalsEl.style.width=sw+'px';const gH=Math.max(36,goalsEl.scrollHeight||0);
  place(goalsEl,mm,sa.t+mm+rowH+4,sw,gH);
  const top0=sa.t+mm+rowH+4+gH+6;
  const mascotW=Math.min(W*.2,110*fs);const trayW=W-mascotW-2*mm;
  const slot=(trayW-10-5*4)/NSLOT;const meterH=22*Math.min(fs,1.25);const trayH=meterH+4+slot+10;
  const tipMin=Math.ceil(tipFont()*1.3*2+8);
  B=Math.max(120,Math.min(sw,H-top0-trayH-tipMin-3*mm-sa.b));
  const rest=H-top0-B-trayH-2*mm-sa.b;
  place(scene,0,0,W,H);scene.style.borderRadius='0';
  place(bw,(W-B)/2,top0,B,B);
  tipZone={x:mm,y:top0+B+4,w:sw,h:rest-6,f:tipFont()};
  const ty=H-sa.b-mm-trayH;
  place(tray,mm,ty,trayW);tray.style.setProperty('--mh',meterH+'px');
  $('#slots').style.gridTemplateColumns='repeat(6,1fr)';
  place(mascot,W-mascotW-mm*.5,ty+trayH-mascotW*1.05,mascotW);
 }else if(!wide){
  boostEl.style.removeProperty('--bsz');tray.style.removeProperty('--mh');
  const mascotW=Math.min(W*.24,140*fs);const trayW=W-mascotW-2*m;
  const slot=(trayW-10-5*5)/NSLOT;const trayH=30*fs+6+slot+10;
  goalsEl.style.height='auto';goalsEl.style.width=(W-2*m)+'px';const gH=Math.max(goalH,goalsEl.scrollHeight||0);
  const tipF=tipFont();const tipH=Math.ceil(tipF*1.3*3+16);
  const bh=50*fs,bwid=62*fs;
  const top0=sa.t+m+hudH+6+gH+6;
  const bottomRes=tipH+trayH+3*m+sa.b;
  // board with boost row above it
  let Brow=Math.min(W-2*m,H-top0-bh-6-bottomRes);
  // board with boost as a side column (better on short/narrow screens)
  let Bcol=Math.min(W-3*m-bwid,H-top0-bottomRes);
  const side=Bcol>Brow+4;B=Math.max(120,side?Bcol:Brow);
  const used=top0+(side?0:bh+6)+B+bottomRes;const extra=Math.max(0,H-used);
  const sceneH=top0+(side?0:bh+6)+extra*.3-4;
  place(scene,0,0,W,H);scene.style.borderRadius='0';
  place(hud,m,sa.t+m,W-2*m,hudH);
  place(goalsEl,m,sa.t+m+hudH+6,W-2*m,gH);
  const by=top0+(side?0:bh+6)+extra*.3;
  if(side){const tot=B+m+bwid,x0=(W-tot)/2;place(bw,x0+bwid+m,by,B,B);place(boostEl,x0,by,bwid,B);boostEl.style.flexDirection='column';boostEl.style.justifyContent='center';}
  else{place(bw,(W-B)/2,by,B,B);place(boostEl,m,top0,W-2*m,bh);boostEl.style.flexDirection='';boostEl.style.justifyContent='';}
  tipZone={x:m,y:by+B+m*.5,w:W-2*m,h:tipH,f:tipF};
  const ty=by+B+m+tipH+m*.5;
  place(tray,m,ty,trayW);
  $('#slots').style.gridTemplateColumns='repeat(6,1fr)';
  place(mascot,W-mascotW-m*.5,ty+trayH-mascotW*1.05,mascotW);
 }else{
  boostEl.style.flexDirection='';boostEl.style.justifyContent='';goalsEl.style.height='';
  B=Math.min(H-2*m-sa.t-sa.b,W*.6);const LW=W-B-3*m;
  place(bw,W-B-m,(H-B)/2,B,B);
  place(scene,0,0,LW+1.5*m,H);
  place(hud,m,sa.t+m,LW,hudH);
  place(goalsEl,m,sa.t+m+hudH+8,LW,goalH);
  place(boostEl,m,sa.t+m+hudH+goalH*2+20,LW,50*fs);
  const trayW=LW*.62;$('#slots').style.gridTemplateColumns='repeat(3,1fr)';
  const slot=(trayW-10)/3;const trayH=30*fs+6+slot*2+5;
  place(tray,m,H-sa.b-m-trayH,trayW);
  const mw=LW-trayW-m;place(mascot,m+trayW+m*.5,H-sa.b-m-mw*1.05,mw);
 }
 goalsEl.style.flexWrap='wrap';
 const inner=B-12;cv.width=inner*DPR;cv.height=inner*DPR;cs=inner/N;
 renderGarden();
}
addEventListener('resize',()=>setTimeout(layout,50));
addEventListener('orientationchange',()=>setTimeout(layout,250));
document.addEventListener('touchmove',e=>{if(!e.target.closest('#select,.panel,#map,#farm,#ending'))e.preventDefault();},{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('dblclick',e=>e.preventDefault());

/* ---------- tween engine ---------- */
const tweens=[];const ease={out:p=>1-(1-p)*(1-p)*(1-p),inq:p=>p*p,lin:p=>p,
 bounce:p=>{const n=7.5625,d=2.75;if(p<1/d)return n*p*p;if(p<2/d)return n*(p-=1.5/d)*p+.75;if(p<2.5/d)return n*(p-=2.25/d)*p+.9375;return n*(p-=2.625/d)*p+.984375;},
 back:p=>{const c=1.70158,c3=c+1;return 1+c3*Math.pow(p-1,3)+c*Math.pow(p-1,2);}};
function tween(o,to,dur,e=ease.out){return new Promise(res=>{const from={};for(const k in to)from[k]=o[k];tweens.push({o,from,to,t:0,dur,e,res});});}
const wait=ms=>new Promise(r=>setTimeout(r,ms/(window.__SPD||1)));

/* ---------- board ---------- */
let moss=[],mossHit=false;
function mossSpread(){if(!level||!goalState.some(g=>g.k==='moss'&&g.left>0))return;if(mossHit){mossHit=false;return;}if(level.mossSlow&&(window.mossTick=(window.mossTick||0)+1)%2)return;
 const cand=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(moss[r]&&moss[r][c])[[0,1],[1,0],[0,-1],[-1,0]].forEach(([a,b])=>{const R2=r+a,C2=c+b;if(inB(R2,C2)&&!moss[R2][C2]&&grid[R2][C2]&&grid[R2][C2].c>=0)cand.push([R2,C2]);});
 if(!cand.length)return;const [R2,C2]=cand[(Math.random()*cand.length)|0];moss[R2][C2]=1;goalState.forEach(g=>{if(g.k==='moss')g.left++;});burst((C2+.5)*cs,(R2+.5)*cs,'#689f38',10);say('苔蘚蔓延了！在苔蘚上消除寶石就能清掉！');}
let grid=[],busy=true,level=null,movesLeft=0,extraUsed=false,goalState=[],nColors=5,idleT=0,hint=null,sel=null,gid=0,shakeT=0;
const parts=[],beams=[],oparts=[];
function rc(){return (Math.random()*nColors)|0;}
let ice=[],boostMode=null;
const matchable=g=>g&&g.c>=0&&!g.crate&&g.s!==4;
const movable=g=>g&&!g.crate&&!g.vine;
function acornNeed(){const g=goalState.find(x=>x.k==='acorn');if(!g)return 0;let on=0;grid.forEach(row=>row.forEach(t=>{if(t&&t.c===-2)on++;}));return g.left-on;}
function newTile(r,c,top){if(top&&acornNeed()>0&&Math.random()<.1){return mk(-2,r,c);}return mk(rc(),r,c);}
function mk(c,r,col,s=0){return{id:++gid,c,s,x:col,y:r,sc:1,a:1,rot:0};}
function newBoard(tries=0){
 const M=level.map;grid=[];ice=[];moss=[];
 for(let r=0;r<N;r++){grid.push([]);ice.push([]);for(let c=0;c<N;c++){const ch=M[r][c];ice[r].push(ch==='i'?1:ch==='I'?2:0);moss[r]=moss[r]||[];moss[r].push(ch==='m'?1:0);
  if(ch==='c'||ch==='C'||ch==='S'){const g=mk(-1,r,c);g.crate=ch==='S'?3:ch==='C'?2:1;if(ch==='S')g.stone=true;grid[r].push(g);continue;}
  if(ch==='a'){grid[r].push(mk(-2,r,c));continue;}
  const same=(a,b)=>a&&b&&a.c>=0&&a.c===b.c;let col;
  do{col=rc();}while((c>=2&&grid[r][c-1].c===col&&grid[r][c-2].c===col)||(r>=2&&grid[r-1][c].c===col&&grid[r-2][c].c===col));
  const g=mk(col,r,c);if(ch==='v')g.vine=true;grid[r].push(g);}}
 if(!findMove()&&tries<60)return newBoard(tries+1);
}
function dropIn(){const ps=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++){const g=grid[r][c];g.y=r-N-2;ps.push(wait(c*40+(N-r)*30).then(()=>tween(g,{y:r},520,ease.bounce)));}return Promise.all(ps);}
function inB(r,c){return r>=0&&c>=0&&r<N&&c<N;}
function findMatches(){
 const runs=[];
 for(let r=0;r<N;r++){let s=0;for(let c=1;c<=N;c++){if(c<N&&matchable(grid[r][c])&&matchable(grid[r][s])&&grid[r][c].c===grid[r][s].c)continue;if(c-s>=3&&matchable(grid[r][s]))runs.push({h:1,cells:Array.from({length:c-s},(_,i)=>[r,s+i])});s=c;}}
 for(let c=0;c<N;c++){let s=0;for(let r=1;r<=N;r++){if(r<N&&matchable(grid[r][c])&&matchable(grid[s][c])&&grid[r][c].c===grid[s][c].c)continue;if(r-s>=3&&matchable(grid[s][c]))runs.push({h:0,cells:Array.from({length:r-s},(_,i)=>[s+i,c])});s=r;}}
 // merge runs sharing cells
 const groups=[];
 runs.forEach(run=>{const keys=new Set(run.cells.map(([a,b])=>a*N+b));let tgt=groups.find(g=>run.cells.some(([a,b])=>g.keys.has(a*N+b)));
  if(tgt){run.cells.forEach(([a,b])=>tgt.keys.add(a*N+b));tgt.runs.push(run);}else groups.push({keys,runs:[run]});});
 return groups.map(g=>{const cells=[...g.keys].map(k=>[Math.floor(k/N),k%N]);const mx=Math.max(...g.runs.map(r=>r.cells.length));
  const hv=g.runs.some(r=>r.h)&&g.runs.some(r=>!r.h);let sp=0;if(mx>=5)sp=4;else if(hv)sp=3;else if(mx===4)sp=g.runs[0].h?1:2;return{cells,sp};});
}
function findMove(){
 for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(grid[r][c]&&grid[r][c].s===4&&movable(grid[r][c])){for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){const o=inB(r+dr,c+dc)&&grid[r+dr][c+dc];if(movable(o)&&o.c>=0)return[[r,c],[r+dr,c+dc]];}}
  for(const[dr,dc]of[[0,1],[1,0]]){const r2=r+dr,c2=c+dc;if(!inB(r2,c2)||!movable(grid[r][c])||!movable(grid[r2][c2]))continue;swapG(r,c,r2,c2);const ok=findMatches().length>0;swapG(r,c,r2,c2);if(ok)return[[r,c],[r2,c2]];}}
 return null;
}
function swapG(r1,c1,r2,c2){const t=grid[r1][c1];grid[r1][c1]=grid[r2][c2];grid[r2][c2]=t;}
async function trySwap(r1,c1,r2,c2){
 if(busy||!inB(r2,c2)||movesLeft<=0)return;
 try{await trySwap0(r1,c1,r2,c2);}catch(e){console.error(e);try{await safeRefill();}catch(e2){}busy=false;}
}
async function trySwap0(r1,c1,r2,c2){busy=true;hint=null;idleT=0;sel=null;
 const a=grid[r1][c1],b=grid[r2][c2];if(!a||!b){await safeRefill();busy=false;return;}
 if(!movable(a)||!movable(b)||((a.s===4||b.s===4)&&(a.c<0||b.c<0))){sfx('nope');const t=(a&&a.vine)?a:(b&&b.vine)?b:a;if(t){t.rot=.25;tween(t,{rot:0},300,ease.back);}if(a&&a.vine||b&&b.vine)say('被藤蔓纏住了，要在旁邊消除喔！');busy=false;return;}
 sfx('swap');swapG(r1,c1,r2,c2);
 await Promise.all([tween(a,{x:c2,y:r2},170),tween(b,{x:c1,y:r1},170)]);
 if(a.s===4||b.s===4){movesLeft--;updHud();await rainbowSwap(a,b,r1,c1,r2,c2);await gravity();await cascade(null);return endTurn();}
 const m=findMatches();
 if(!m.length){sfx('nope');swapG(r1,c1,r2,c2);await Promise.all([tween(a,{x:c1,y:r1},170),tween(b,{x:c2,y:r2},170)]);busy=false;return;}
 movesLeft--;updHud();await cascade(m,[[r2,c2],[r1,c1]]);endTurn();
}
async function rainbowSwap(a,b,r1,c1,r2,c2){
 const set=new Set();
 if(a.s===4&&b.s===4){for(let r=0;r<N;r++)for(let c=0;c<N;c++)set.add(r*N+c);}
 else{const rb=a.s===4?a:b,o=a.s===4?b:a;const col=o.c;set.add((rb===a?r2:r1)*N+(rb===a?c2:c1));
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(grid[r][c]&&grid[r][c].c===col){set.add(r*N+c);if(o.s&&o.s<4&&grid[r][c].s===0&&grid[r][c]!==o){/*spread*/}}}
 sfx('special');shakeT=.4;react(3);
 await clearSet(set,[],2);
}
async function cascade(m,swapCells){
 let combo=0;
 while(true){
  if(!m)m=findMatches();if(!m.length)break;combo++;
  const set=new Set(),creates=[];
  m.forEach(g=>{let pos=null;if(g.sp){if(swapCells)pos=swapCells.find(([r,c])=>g.cells.some(([a,b])=>a===r&&b===c));if(!pos)pos=g.cells[Math.floor(g.cells.length/2)];creates.push({pos,sp:g.sp,c:grid[pos[0]][pos[1]].c});}
   g.cells.forEach(([r,c])=>set.add(r*N+c));});
  sfx('match',combo);
  if(combo>=2){comboText(combo);react(combo);}
  await clearSet(set,creates,combo);
  await gravity();m=null;swapCells=null;
 }
}
function expand(set){
 const q=[...set];const done=new Set();
 while(q.length){const k=q.pop();if(done.has(k))continue;done.add(k);const r=Math.floor(k/N),c=k%N,g=grid[r][c];if(!g||!g.s)continue;
  const add=(rr,cc)=>{if(inB(rr,cc)&&!set.has(rr*N+cc)){set.add(rr*N+cc);q.push(rr*N+cc);}};
  if(g.s===1){for(let i=0;i<N;i++)add(r,i);beams.push({h:1,i:r,life:1});sfx('special');}
  if(g.s===2){for(let i=0;i<N;i++)add(i,c);beams.push({h:0,i:c,life:1});sfx('special');}
  if(g.s===3){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)add(r+dr,c+dc);beams.push({b:1,r,c,life:1});shakeT=.35;sfx('special');}
  if(g.s===4){const col=rc();for(let rr=0;rr<N;rr++)for(let cc=0;cc<N;cc++)if(grid[rr][cc]&&grid[rr][cc].c===col)add(rr,cc);sfx('special');}
 }
}
async function clearSet(set,creates,combo){
 const keep=new Set(creates.map(o=>o.pos[0]*N+o.pos[1]));
 expand(set);
 const anims=[];let counted=0;const hitC=new Set();
 const dmgCrate=(r,c)=>{const k=r*N+c;if(hitC.has(k))return;const g=grid[r][c];if(!g||!g.crate)return;hitC.add(k);g.crate--;burst((c+.5)*cs,(r+.5)*cs,'#c98a4a',14);sfx('crate');if(level&&level.layerGoals)countObs(g.stone?'stone':'crate');
  if(g.crate<=0){if(!(level&&level.layerGoals))countObs(g.stone?'stone':'crate');anims.push(tween(g,{sc:0,a:0,rot:.5},260,ease.inq).then(()=>{if(grid[r][c]===g)grid[r][c]=null;}));}else{g.sc=.75;anims.push(tween(g,{sc:1},280,ease.back));}};
 const hitIce=(r,c)=>{if(ice[r]&&ice[r][c]>0){ice[r][c]--;burst((c+.5)*cs,(r+.5)*cs,'#bfefff',12);sfx('ice');if(level&&level.layerGoals||!ice[r][c])countObs('ice');}};
 const around=(r,c)=>[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{if(inB(r+dr,c+dc))dmgCrate(r+dr,c+dc);});
 set.forEach(k=>{const r=Math.floor(k/N),c=k%N,g=grid[r][c];if(!g)return;
  if(g.crate){dmgCrate(r,c);return;}
  if(g.c<0)return;
  if(g.vine){g.vine=false;countObs('vine');burst((c+.5)*cs,(r+.5)*cs,'#5fd35f',16);sfx('vine');around(r,c);return;}
  hitIce(r,c);if(moss[r]&&moss[r][c]){moss[r][c]=0;mossHit=true;countObs('moss');burst((c+.5)*cs,(r+.5)*cs,'#8bc34a',14);sfx('vine');}around(r,c);
  if(keep.has(k)&&!g.s){return;}
  counted++;countGem(g.c);burst((c+.5)*cs,(r+.5)*cs,GEMC[g.c],g.s?18:9);
  anims.push(tween(g,{sc:0,a:0,rot:.6},220,ease.inq).then(()=>{if(grid[r][c]===g)grid[r][c]=null;}));});
 creates.forEach(o=>{const g=grid[o.pos[0]][o.pos[1]];if(!g||g.c<0||g.crate)return;const ng=g;ng.s=o.sp;ng.c=o.c;ng.sc=.4;anims.push(tween(ng,{sc:1},380,ease.back));sparkle((o.pos[1]+.5)*cs,(o.pos[0]+.5)*cs);});
 addEnergy(counted);updGoals();
 await Promise.all(anims);
 creates.forEach(o=>{if(!grid[o.pos[0]][o.pos[1]]){const g=mk(o.c,o.pos[0],o.pos[1],o.sp);g.sc=.3;grid[o.pos[0]][o.pos[1]]=g;tween(g,{sc:1},300,ease.back);}});
}
async function gravity(){
 const anims=[];
 for(let c=0;c<N;c++){let r=N-1;
  while(r>=0){while(r>=0&&grid[r][c]&&grid[r][c].crate)r--;if(r<0)break;
   const bot=r;while(r>=0&&!(grid[r][c]&&grid[r][c].crate))r--;const top=r+1;
   let w=bot;for(let k=bot;k>=top;k--){const g=grid[k][c];if(g){if(w!==k){grid[w][c]=g;grid[k][c]=null;anims.push(tween(g,{y:w},140+(w-k)*55,ease.bounce));}w--;}}
   let n=0;for(let k=w;k>=top;k--){const g=newTile(k,c,top===0);if(top===0){g.y=-1-n;n++;anims.push(tween(g,{y:k},160+(k+n)*55,ease.bounce));}else{g.y=k;g.sc=0;anims.push(tween(g,{sc:1},320,ease.back));}grid[k][c]=g;}
  }}
 await Promise.all(anims);
 if(await collectAcorns())await gravity();
}
async function collectAcorns(){
 let any=false;const anims=[];
 for(let c=0;c<N;c++)for(let r=N-1;r>=0;r--){const g=grid[r][c];if(!g||g.c!==-2)continue;let ok=true;for(let k=r+1;k<N;k++)if(!(grid[k][c]&&grid[k][c].crate)){ok=false;break;}
  if(ok){any=true;countObs('acorn');sfx('coin');sparkle((c+.5)*cs,(r+.5)*cs);anims.push(tween(g,{sc:1.6,a:0,y:r+.6},420,ease.out).then(()=>{if(grid[r][c]===g)grid[r][c]=null;}));}}
 if(any){floatText('收集橡果！',W/2,bw.getBoundingClientRect().top+B*.8);await Promise.all(anims);}
 return any;
}
async function safeRefill(){let holes=false;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(!grid[r][c])holes=true;if(holes){await gravity();await cascade(null);}}
async function endTurn(){
 try{await safeRefill();}catch(e){console.error(e);}
 try{mossSpread();}catch(e){}
 updGoals();
 if(goalsDone()){busy=true;await wait(500);return win();}
 if(movesLeft<=0){busy=true;await wait(400);return outOfMoves();}
 if(!findMove()){floatText('重新洗牌～',W/2,H/2);await wait(400);await shuffle();}
 busy=false;idleT=0;
}
async function shuffle(){const free=grid.flat().filter(g=>g&&g.c>=0&&!g.s&&!g.crate);let t=0;
 do{free.forEach(g=>g.c=rc());t++;}while((findMatches().length||!findMove())&&t<300);
 await Promise.all(free.map(g=>{g.sc=.3;return tween(g,{sc:1},450,ease.back);}));}

/* ---------- goals / energy ---------- */
function countGem(c){goalState.forEach(g=>{if(g.k==='gem'&&g.c===c&&g.left>0)g.left--;});}
function countTier(t){goalState.forEach(g=>{if(g.k==='tier'&&g.t===t&&g.left>0)g.left--;});updGoals();}
function countObs(k){goalState.forEach(g=>{if(g.k===k&&g.left>0)g.left--;});}
function goalsDone(){return goalState.every(g=>g.left<=0);}
let _gH=0;function updGoals(){
 const GL={gem:'消除',ice:'敲冰',crate:'開箱',vine:'解藤',acorn:'收集',moss:'清苔',stone:'敲石'};goalsEl.innerHTML=goalState.map(g=>g.k==='tier'?`<div class="goal tier ${g.left<=0?'done':''}"><img src="a/t${g.t}.png"><div class="gt"><b><i class="gx">合成 </i>${TIERNAME[g.t]} ×${Math.max(0,g.left)}${g.left<=0?' ✔':''}</b><small>點托盤裡兩個${TIERNAME[g.t-1]}</small></div></div>`:`<div class="goal ${g.left<=0?'done':''}"><small class="gl">${GL[g.k]}</small><img src="a/${g.k==='gem'?'g'+g.c:g.k}.png"><span>${g.left<=0?'✔':g.left}</span></div>`).join('');
 if(!wide&&!gardenMode){const h=goalsEl.scrollHeight;if(Math.abs(h-_gH)>2){_gH=h;layout();}}
}
function updHud(){$('#moves').textContent=movesLeft;$('#lvPill').textContent=(level.ch+1)+'-'+(((level.n-1)%10)+1);updBoost();}
function addEnergy(n){
 S.energy+=n;
 while(S.energy>=seedCost()){let i=S.tray.indexOf(-1);if(i<0){i=autoPlant();if(i<0){S.energy=seedCost();break;}}S.energy-=seedCost();S.tray[i]=0;flySeed(i);}
 updMeter();save();
}
function updMeter(){$('#meterFill').style.width=(S.energy/seedCost()*100)+'%';$('#meterTxt').textContent=S.tray.indexOf(-1)<0&&S.energy>=seedCost()?'托盤滿了：點一顆寶物種到花園':'能量 '+S.energy+' / '+seedCost();}
function flySeed(i){
 const br=bw.getBoundingClientRect();const f=document.createElement('img');f.src='a/t0.png';f.className='fly';
 f.style.left=(br.left+br.width/2-22)+'px';f.style.top=(br.top+br.height/2-22)+'px';f.style.transform='scale(1.6)';$('#floaters').appendChild(f);
 renderTray(i);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{const s=$('#slots').children[i].getBoundingClientRect();f.style.left=(s.left+s.width/2-22)+'px';f.style.top=(s.top+s.height/2-22)+'px';f.style.transform='scale(1)';}));
 setTimeout(()=>{f.remove();renderTray();const s=$('#slots').children[i];if(s){s.classList.remove('pop');void s.offsetWidth;s.classList.add('pop');const r=s.getBoundingClientRect();oburst(r.left+r.width/2,r.top+r.height/2,'#9cff57',14);}sfx('seed');},620);
}
function renderTray(hideIdx){
 const el=$('#slots');el.innerHTML='';
 const cnt={};S.tray.forEach(t=>{if(t>=0)cnt[t]=(cnt[t]||0)+1;});
 S.tray.forEach((t,i)=>{const d=document.createElement('div');const mp=mergePair()||[];d.className='slot'+(t>=0&&t<5&&cnt[t]>=2?' can':'')+(mp.includes(i)?' need':'');
  if(t>=0&&i!==hideIdx)d.innerHTML=`<img src="a/t${t}.png"><span class="tl">${t+1}</span>`;
  d.onpointerup=()=>tapSlot(i);el.appendChild(d);});
 updMeter();
}
async function tapSlot(i){
 initAudio();const t=S.tray[i];if(t<0)return;
 const j=S.tray.findIndex((x,k)=>k!==i&&x===t);
 const el=$('#slots').children[i];
 if(t>=5||j<0){sfx('tap');el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');trayMenu(i);return;}
 // fly j -> i
 const a=$('#slots').children[j].getBoundingClientRect(),b=el.getBoundingClientRect();
 const f=document.createElement('img');f.src='a/t'+t+'.png';f.className='fly';f.style.width=a.width+'px';f.style.height=a.height+'px';f.style.left=a.left+'px';f.style.top=a.top+'px';$('#floaters').appendChild(f);
 S.tray[j]=-1;renderTray();
 requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.left=b.left+'px';f.style.top=b.top+'px';f.style.transform='scale(.6) rotate(20deg)';}));
 await wait(600);f.remove();
 S.tray[i]=t+1;renderTray();const s=$('#slots').children[i];s.classList.add('pop');
 oburst(b.left+b.width/2,b.top+b.height/2,'#ffe066',26);ostar(b.left+b.width/2,b.top+b.height/2);sfx('merge',t+1);
 countTier(t+1);addEnergy(0);save();
 floatText(TIERNAME[t+1]+'！',b.left+b.width/2,b.top-10);if(!S.tutMerge){S.tutMerge=true;save();}countTierFix(t+1);
 if(t+1>=4)react(4);
 if(t+1===5){busy=true;await playVideo('merge','水晶噴泉 誕生！',true);busy=false;S.seenFountain=true;save();}
 if(goalsDone()&&!busy&&level){busy=true;await wait(400);win();}
}

/* ---------- FX ---------- */
function burst(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=(1+Math.random()*3)*cs*.04;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-cs*.03,life:1,col,sz:cs*(.05+Math.random()*.07),star:Math.random()<.3});}}
function sparkle(x,y){for(let i=0;i<14;i++){const a=i/14*6.283;parts.push({x,y,vx:Math.cos(a)*cs*.08,vy:Math.sin(a)*cs*.08,life:1,col:'#fff7b0',sz:cs*.06,star:true});}}
function oburst(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=1+Math.random()*4;oparts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1.5,life:1,col,sz:4+Math.random()*7,star:Math.random()<.5,g:.08});}}
function ostar(x,y){for(let i=0;i<10;i++){const a=i/10*6.283;oparts.push({x,y,vx:Math.cos(a)*5,vy:Math.sin(a)*5,life:1.2,col:'#fff',sz:9,star:true,g:0});}}
function floatText(t,x,y){const d=document.createElement('div');d.className='combo';d.innerHTML=t;d.style.left=x+'px';d.style.top=y+'px';d.style.fontSize='calc(34px*var(--fs))';$('#floaters').appendChild(d);setTimeout(()=>d.remove(),1300);}
const COMBOW=['','','讚！','太棒了！','超級棒！','完美！','無敵！'];
function comboText(c){const br=bw.getBoundingClientRect();const d=document.createElement('div');d.className='combo';d.textContent=(COMBOW[Math.min(c,6)])+' x'+c;d.style.left=(br.left+br.width/2)+'px';d.style.top=(br.top+br.height*.4)+'px';$('#floaters').appendChild(d);setTimeout(()=>d.remove(),1300);}
function drawStar(c,x,y,r){c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.35:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();}

/* ---------- mascot ---------- */
let bubbleT=null;
let bubbleOn=false;
function say(t){const b=$('#bubble');if(b.parentNode!==document.body)document.body.appendChild(b);b.innerHTML=t;
 const z=tipZone&&!wide&&!gardenMode&&level?tipZone:null;
 if(z){b.style.fontSize=z.f+'px';b.style.width=z.w+'px';b.style.maxWidth='';b.style.left=z.x+'px';bubbleOn=true;$('#mergeTip').style.display='none';
  b.style.top='0px';b.classList.add('show');b.style.padding='4px 10px';let f=z.f;while(b.offsetHeight>z.h&&f>16){f-=1;b.style.fontSize=f+'px';}b.style.top=(z.y+Math.max(0,(z.h-b.offsetHeight)/2))+'px';}
 else{b.style.padding='';const r=mascot.getBoundingClientRect(),mw=Math.min(innerWidth-16,360);b.style.fontSize='';b.style.width='auto';b.style.maxWidth=mw+'px';b.classList.add('show');
  const bw=b.offsetWidth,bh=b.offsetHeight;b.style.left=Math.max(8,Math.min(innerWidth-8-bw,r.left+r.width/2-bw*.75))+'px';b.style.top=Math.max(8,Math.min(innerHeight-8-bh,r.top-bh-6))+'px';}
 clearTimeout(bubbleT);bubbleT=setTimeout(()=>{b.classList.remove('show');bubbleOn=false;},2200);}
function cheer(){const m=$('#mascotImg');m.classList.remove('cheer');void m.offsetWidth;m.classList.add('cheer');}
function react(c){const ch=CHARS[S.char||'fox'];cheer();say(ch.cheers[(Math.random()*ch.cheers.length)|0]);sfx('voice');const r=mascot.getBoundingClientRect();oburst(r.left+r.width/2,r.top+r.height*.3,'#ffd54a',8+c*3);}
mascot.onpointerup=()=>{initAudio();const ch=CHARS[S.char||'fox'];cheer();say(ch.tap[(Math.random()*ch.tap.length)|0]);sfx('voice');const r=mascot.getBoundingClientRect();oburst(r.left+r.width/2,r.top+r.height*.4,'#ff80ab',14);};

/* ---------- garden (interactive scene) ---------- */
const critters=[];
function renderGarden(){
 const box=$('#sceneItems');box.innerHTML='';const sh=scene.clientHeight||1,sw=scene.clientWidth||1;
 const unit=Math.min(sh*.5,sw*.35)*(gardenMode?1.3:1);
 S.garden.filter(d=>!d.st).sort((a,b)=>a.y-b.y).forEach(d=>{const e=document.createElement('div');e.className='deco idle';e._d=d;const sz=unit*(.35+.12*d.t)*(.55+.6*d.y);
  e.style.width=sz+'px';e.style.left=(d.x*sw-sz/2)+'px';e.style.top=(d.y*sh-sz)+'px';e.style.animationDelay=(-Math.random()*4)+'s';e.innerHTML=`<img src="a/t${d.t}.png">`;
  e.onpointerup=ev=>{if(window.decoEdit)return;initAudio();e.classList.remove('boing');void e.offsetWidth;e.classList.add('boing');sfx('chime',d.t);oburst(ev.clientX,ev.clientY,['#ffe066','#ff80ab','#80d8ff'][d.t%3],18);ostar(ev.clientX,ev.clientY);setTimeout(()=>e.classList.remove('boing'),650);if(typeof gardenMenu==='function')setTimeout(()=>gardenMenu(d),250);};
  box.appendChild(e);});
 critters.length=0;
 const mkC=(src,x,y,size,kind)=>{const e=document.createElement('div');e.className='critter'+(kind==='fly'?' flap':'');e.innerHTML=`<img src="${src}">`;e.style.width=size+'px';box.appendChild(e);
  const o={e,x,y,tx:x,ty:y,kind,size,sp:.002};critters.push(o);e.onpointerup=ev=>tapCritter(o,ev);posC(o);};
 mkC('a/butterfly.png',.3,.35,unit*.22,'fly');mkC('a/butterfly.png',.75,.5,unit*.16,'fly');
 mkC('a/bird.png',.18,.66,unit*.22,'bird');mkC('a/frog.png',.78,.78,unit*.26,'frog');
}
function posC(o){const sh=scene.clientHeight,sw=scene.clientWidth;o.e.style.left=(o.x*sw-o.size/2)+'px';o.e.style.top=(o.y*sh-o.size/2)+'px';}
function tapCritter(o,ev){initAudio();ostar(ev.clientX,ev.clientY);oburst(ev.clientX,ev.clientY,o.kind==='frog'?'#9cff57':o.kind==='bird'?'#ffe066':'#80d8ff',16);
 if(o.kind==='fly'){sfx('twinkle');o.tx=.1+Math.random()*.8;o.ty=.15+Math.random()*.5;o.sp=.03;}
 else{sfx(o.kind==='bird'?'chirp':'croak');o.e.classList.remove('hop');void o.e.offsetWidth;o.e.classList.add('hop');if(o.kind==='bird'){o.tx=.1+Math.random()*.4;o.sp=.02;}}
 const ch=CHARS[S.char||'fox'];if(Math.random()<.5)say(o.kind==='frog'?'呱呱！':o.kind==='bird'?'啾啾～':'好漂亮的蝴蝶！');}
function stepCritters(){critters.forEach(o=>{if(o.kind==='fly'){if(Math.hypot(o.tx-o.x,o.ty-o.y)<.02||Math.random()<.003){o.tx=.08+Math.random()*.84;o.ty=.12+Math.random()*.5;o.sp=.004;}
  o.x+=(o.tx-o.x)*o.sp*3;o.y+=(o.ty-o.y)*o.sp*3+Math.sin(performance.now()/300+o.size)*.0015;posC(o);}
 else if(o.kind==='bird'){o.x+=(o.tx-o.x)*o.sp;if(Math.random()<.002){o.e.classList.remove('hop');void o.e.offsetWidth;o.e.classList.add('hop');}posC(o);}});}

/* ---------- input ---------- */
let down=null;
function cellAt(e){const r=cv.getBoundingClientRect();return[Math.floor((e.clientY-r.top)/(r.height/N)),Math.floor((e.clientX-r.left)/(r.width/N)),e.clientX,e.clientY];}
cv.addEventListener('pointerdown',e=>{initAudio();e.preventDefault();idleT=0;hint=null;if(busy)return;const[r,c,x,y]=cellAt(e);if(!inB(r,c))return;if(boostMode){useBoostAt(r,c);return;}down={r,c,x,y,moved:false};try{cv.setPointerCapture(e.pointerId);}catch(_){}});
cv.addEventListener('pointermove',e=>{if(!down||down.moved||busy)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;const th=cv.getBoundingClientRect().width/N*.28;
 if(Math.max(Math.abs(dx),Math.abs(dy))>th){down.moved=true;const[dr,dc]=Math.abs(dx)>Math.abs(dy)?[0,Math.sign(dx)]:[Math.sign(dy),0];sel=null;trySwap(down.r,down.c,down.r+dr,down.c+dc);}});
cv.addEventListener('pointerup',e=>{if(!down)return;const d=down;down=null;if(d.moved||busy)return;
 if(sel&&Math.abs(sel[0]-d.r)+Math.abs(sel[1]-d.c)===1){const s=sel;sel=null;trySwap(s[0],s[1],d.r,d.c);}else{sel=(sel&&sel[0]===d.r&&sel[1]===d.c)?null:[d.r,d.c];sfx('tap');}});
cv.addEventListener('pointercancel',()=>{down=null;});

/* ---------- render loop ---------- */
let last=performance.now();
function frame(now){
 const dt=Math.min(50,now-last);last=now;
 for(let i=tweens.length-1;i>=0;i--){const t=tweens[i];t.t+=dt*(window.__SPD||1);const p=Math.min(1,t.t/t.dur),e=t.e(p);for(const k in t.to)t.o[k]=t.from[k]+(t.to[k]-t.from[k])*e;if(p>=1){tweens.splice(i,1);t.res();}}
 if(level&&!busy&&!$('#modal').classList.contains('show')){idleT+=dt;if(idleT>5000&&!hint){hint=findMove();if(hint&&Math.random()<.5)say('試試這裡？');}}
 drawBoard(now,dt);drawO(dt);stepCritters();
 requestAnimationFrame(frame);
}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function drawBoard(now,dt){
 if(!cs)return;const c=ctx;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,cv.width,cv.height);
 if(shakeT>0){shakeT-=dt/1000;c.translate((Math.random()-.5)*8*shakeT,(Math.random()-.5)*8*shakeT);}
 for(let r=0;r<N;r++)for(let k=0;k<N;k++){c.fillStyle=(r+k)%2?'rgba(190,170,255,.20)':'rgba(235,225,255,.34)';rr(c,k*cs+2,r*cs+2,cs-4,cs-4,cs*.18);c.fill();}
 if(sel){c.strokeStyle='#ffe066';c.lineWidth=4;c.shadowColor='#ffe066';c.shadowBlur=14;rr(c,sel[1]*cs+3,sel[0]*cs+3,cs-6,cs-6,cs*.18);c.stroke();c.shadowBlur=0;}
 // beams
 for(let i=beams.length-1;i>=0;i--){const b=beams[i];b.life-=dt/450;if(b.life<=0){beams.splice(i,1);continue;}c.save();c.globalCompositeOperation='lighter';c.globalAlpha=b.life;
  const gr=b.b?null:null;c.fillStyle='rgba(255,250,200,.9)';c.shadowColor='#fff59d';c.shadowBlur=30;
  if(b.b){c.beginPath();c.arc((b.c+.5)*cs,(b.r+.5)*cs,cs*1.8*(1.2-b.life),0,7);c.lineWidth=cs*.3*b.life;c.strokeStyle='#ffcc80';c.stroke();}
  else if(b.h)c.fillRect(0,(b.i+.5)*cs-cs*.22*b.life,N*cs,cs*.44*b.life);else c.fillRect((b.i+.5)*cs-cs*.22*b.life,0,cs*.44*b.life,N*cs);c.restore();}
 const hp=hint?(Math.sin(now/180)+1)/2:0;
 for(let r=0;r<N;r++)for(let k=0;k<N;k++){const g=grid[r]&&grid[r][k];if(!g)continue;
  let s=g.sc;const isH=hint&&hint.some(([a,b])=>a===r&&b===k);if(isH)s*=1+.1*hp;
  const x=(g.x+.5)*cs,y=(g.y+.5)*cs,sz=cs*.86*s;if(y<-cs)continue;
  c.save();c.globalAlpha=g.a;c.translate(x,y);c.rotate(g.rot+(isH?Math.sin(now/90)*.08:0));
  if(isH){c.shadowColor='#fff';c.shadowBlur=20*hp;}
  if(g.s===4){const t=now/600;for(let i=0;i<6;i++){c.fillStyle=GEMC[i];c.beginPath();c.arc(Math.cos(t+i)*sz*.28,Math.sin(t+i)*sz*.28,sz*.16,0,7);c.fill();}
   const rg=c.createRadialGradient(0,0,0,0,0,sz*.32);rg.addColorStop(0,'#fff');rg.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=rg;c.beginPath();c.arc(0,0,sz*.34,0,7);c.fill();c.fillStyle='#fff';drawStar(c,0,0,sz*.22);}
  else{
   if(g.s===3){const p=(Math.sin(now/200)+1)/2;const rg=c.createRadialGradient(0,0,sz*.2,0,0,sz*.62);rg.addColorStop(0,'rgba(255,200,80,.9)');rg.addColorStop(1,'rgba(255,120,0,0)');c.fillStyle=rg;c.beginPath();c.arc(0,0,sz*(.55+.07*p),0,7);c.fill();}
   if(g.crate){const im=g.stone?(IMG.stone||IMG.crate):IMG.crate;const z=cs*.96*g.sc;if(im)c.drawImage(im,-z/2,-z/2,z,z);if(g.crate>1){c.fillStyle='#ffe082';c.strokeStyle='#5a2d00';c.lineWidth=3;c.font='900 '+(cs*.3)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.strokeText(String(g.crate),z*.3,z*.3);c.fillText(String(g.crate),z*.3,z*.3);}c.restore();continue;}
  if(g.c===-2){const im=IMG.acorn;const b=Math.sin(now/260+k)*cs*.04;if(im)c.drawImage(im,-sz/2,-sz/2+b,sz,sz);c.restore();continue;}
  const im2=IMG['g'+g.c];if(im2)c.drawImage(im2,-sz/2,-sz/2,sz,sz);
  if(g.vine&&IMG.vine){c.globalAlpha=.92*g.a;c.drawImage(IMG.vine,-cs*.5,-cs*.5,cs,cs);}
   if(g.s===1||g.s===2){c.save();if(g.s===2)c.rotate(Math.PI/2);c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,255,255,.55)';c.fillRect(-sz*.5,-sz*.09,sz,sz*.18);c.fillStyle='#fff';
    const o=(now/300%1)*sz*.08;[[-1],[1]].forEach(([d])=>{c.beginPath();c.moveTo(d*sz*.52+d*o,0);c.lineTo(d*sz*.3+d*o,-sz*.16);c.lineTo(d*sz*.3+d*o,sz*.16);c.fill();});c.restore();}
   if(g.s===3){c.fillStyle='#fff';drawStar(c,sz*.28,-sz*.28,sz*.14);}
  }
  c.restore();}
 if(moss.length&&IMG.moss){for(let r=0;r<N;r++)for(let k=0;k<N;k++){if(moss[r]&&moss[r][k]){c.globalAlpha=.8;c.drawImage(IMG.moss,k*cs+1,r*cs+1,cs-2,cs-2);}}c.globalAlpha=1;}
 if(ice.length&&IMG.ice_t){for(let r=0;r<N;r++)for(let k=0;k<N;k++){const v=ice[r][k];if(v){c.globalAlpha=1;c.drawImage(IMG.ice_t,k*cs+1,r*cs+1,cs-2,cs-2);if(v>1){c.globalAlpha=.25;c.drawImage(IMG.ice_t,k*cs+1,r*cs+1,cs-2,cs-2);c.globalAlpha=.8;c.strokeStyle='#fff';c.lineWidth=Math.max(2,cs*.05);c.strokeRect(k*cs+3,r*cs+3,cs-6,cs-6);}}}c.globalAlpha=1;}
 // glints
 if(Math.random()<.04&&grid.length){const r=(Math.random()*N)|0,k=(Math.random()*N)|0;parts.push({x:(k+.3)*cs,y:(r+.3)*cs,vx:0,vy:0,life:1,col:'#fff',sz:cs*.1,star:true,glint:1});}
 c.globalCompositeOperation='lighter';
 for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt/(p.glint?500:700);if(p.life<=0){parts.splice(i,1);continue;}p.x+=p.vx;p.y+=p.vy;if(!p.glint)p.vy+=cs*.004;c.globalAlpha=p.life;c.fillStyle=p.col;
  if(p.star)drawStar(c,p.x,p.y,p.sz*(p.glint?Math.sin(p.life*3.14):1));else{c.beginPath();c.arc(p.x,p.y,p.sz,0,7);c.fill();}}
 c.globalAlpha=1;c.globalCompositeOperation='source-over';
}
function drawO(dt){const c=octx;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);if(!oparts.length)return;c.globalCompositeOperation='lighter';
 for(let i=oparts.length-1;i>=0;i--){const p=oparts[i];p.life-=dt/900;if(p.life<=0){oparts.splice(i,1);continue;}p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;c.globalAlpha=Math.min(1,p.life);c.fillStyle=p.col;if(p.star)drawStar(c,p.x,p.y,p.sz);else{c.beginPath();c.arc(p.x,p.y,p.sz/2,0,7);c.fill();}}
 c.globalAlpha=1;c.globalCompositeOperation='source-over';}

/* ---------- screens ---------- */
function show(id){if(id==='modal'){$('#modal').classList.add('show');return;}document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('show',s.id===id));}
function setChar(){const ch=CHARS[S.char||'fox'];$('#mascotImg').src=ch.img;$('#homeChar').src=ch.img;$('#homeName').textContent=ch.full;}
function buildSelect(){
 const el=$('#cards');el.innerHTML='';
 Object.entries(CHARS).forEach(([k,ch],i)=>{const d=document.createElement('div');d.className='card'+(S.char===k?' sel':'');
  d.innerHTML=`<div class="pf"><video muted loop playsinline webkit-playsinline autoplay preload="auto" poster="${ch.img}" src="a/win_${k}.mp4" style="width:100%;height:100%;object-fit:cover;object-position:50% 35%"></video></div><div class="txt"><div class="nm">${ch.full}</div><div class="ln">「${ch.line}」</div><button class="big green">就選你了！</button></div>`;
  d.querySelector('button').onclick=()=>{initAudio();S.char=k;save();setChar();sfx('win');el.querySelectorAll('video').forEach(v=>v.pause());goHome();};
  d.querySelector('.pf').onpointerup=()=>{initAudio();sfx('voice');const v=d.querySelector('video');v.play().catch(()=>{});};
  el.appendChild(d);setTimeout(()=>{const v=d.querySelector('video');v.play().catch(()=>{});},100+i*200);});
}
function totalStars(){return Object.values(S.stars).reduce((a,b)=>a+b,0);}
function setSceneBg(ch){$('#sceneBg').style.backgroundImage='url('+CHAPTERS[ch].bg+')';}
function goHome(){level=null;gardenMode=false;boostMode=null;$('#gardenBar').classList.add('hidden');show('home');
 $('#btnPlay').textContent=S.level>NLEV?'🗺️ 重玩關卡':'開始 第 '+S.level+' 關';$('#starPill').textContent='⭐ '+totalStars();$('#coinPill').innerHTML='<img class="ci" src="a/coin.png" alt="">'+S.coins;
 $('#homeCh').textContent=S.level>NLEV?'全部通關！🎉':'第 '+(chapterOf(S.level)+1)+' 章・'+CHAPTERS[chapterOf(S.level)].name;
 setSceneBg(chapterOf(Math.min(S.level,NLEV)));$('#home').style.backgroundImage='url('+CHAPTERS[chapterOf(Math.min(S.level,NLEV))].bg+')';setChar();$('#btnFarm').classList.toggle('badge',farmReady()>0);
 setTimeout(checkDaily,400);}
async function startLevel(n){mossHit=false;
 if(typeof n!=='number')n=S.level;if(n>NLEV){openMap();return;}n=Math.min(n,S.level);
 const ch=chapterOf(n);if(!S.seenCh[ch]){await chapterIntro(ch);}
 show(null);setGameVisible(true);boostMode=null;setSceneBg(ch);level=levelDef(n);nColors=level.colors;movesLeft=level.moves;extraUsed=false;
 goalState=level.goals.map(g=>Object.assign({left:g.n},g));updGoals();updHud();renderTray();layout();
 busy=true;newBoard();await dropIn();busy=false;idleT=0;giftSeeds();
 const chr=CHARS[S.char];say(level.n===1?'用手指滑動寶石，三個連線就消除！':level.n%10===1&&level.n>1?CHAPTERS[level.ch].name+'，出發！':chr.cheers[0]);
}
function setGameVisible(v){[hud,goalsEl,bw,tray,boostEl].forEach(e=>e.style.display=v?'':'none');}
function modal(html){$('#panel').innerHTML=html;show('modal');}
function outOfMoves(){
 modal(`<h2>步數用完了</h2><p>沒關係，慢慢來！<br>送你 5 步，繼續玩吧～</p><div class="row"><button class="big green" id="mMore">+5 步 繼續（免費）</button></div><div class="row"><button class="big alt" id="mRetry">重新開始這關</button></div>`);
 $('#mMore').onclick=()=>{movesLeft+=5;extraUsed=true;updHud();show(null);busy=false;};
 $('#mRetry').onclick=()=>{startLevel();};
}
async function win(){
 busy=true;boostMode=null;sfx('win');react(5);
 const stars=extraUsed?1:(movesLeft>=level.moves*.3?3:movesLeft>=level.moves*.12?2:1);
 const n=level.n,first=!S.stars[n];
 S.stars[n]=Math.max(S.stars[n]||0,stars);
 let planted=0;S.tray.forEach((t,i)=>{if(t>=2){S.garden.push({t,x:.08+Math.random()*.84,y:.58+Math.random()*.38});S.tray[i]=-1;planted++;}});
 if(S.garden.length<3+n){S.garden.push({t:Math.min(1+(n%4),4),x:.1+Math.random()*.8,y:.6+Math.random()*.35});planted++;}
 if(S.garden.length>40)S.garden.sort((a,b)=>b.t-a.t).length=40;
 // rewards: coins + seeds
 const coins=(first?40:15)+stars*10+level.ch*10;S.coins+=coins;
 const sk=seedReward(n);const sn=stars>=3?2:1;S.seeds[sk]=(S.seeds[sk]||0)+sn;
 if(n>=S.level)S.level=n+1;save();renderGarden();
 const chEnd=n%10===0;
 if(chEnd){await chapterStory(level.ch,coins);if(n===NLEV){await playVideo('end','全部完成！花園永遠美麗！');S.ended=true;save();showEnding();return;}
  busy=false;return startLevel(n+1);}
 if(n===NLEV){await playVideo('end','全部完成！花園永遠美麗！');S.ended=true;save();showEnding();return;}
 await playVideo(chEnd?'chap':'win',chEnd?'第 '+(level.ch+1)+' 章 完成！':'過關！');
 const st=[1,2,3].map(i=>`<span class="${i<=stars?'':'off'}" style="animation-delay:${i*.2}s">⭐</span>`).join('');
 modal(`<h2>第 ${n} 關 完成！</h2><div class="stars">${st}</div><div class="reward"><span><img class="ci" src="a/coin.png" alt="">+${coins}</span><span><img src="a/${CROPS[sk].img}.png">${CROPS[sk].name}種子 ×${sn}</span></div>${chEnd?`<p class="unlock">🎉 新章節解鎖：${CHAPTERS[level.ch+1].name}</p>`:''}<div class="row"><button class="big glow" id="mNext">下一關 ▶</button></div><div class="row"><button class="big alt" id="mMap">🗺️ 地圖</button><button class="big alt" id="mFarm">🐔 農場</button><button class="big alt" id="mHome">回首頁</button></div>`);
 const pr=$('#panel').getBoundingClientRect();setTimeout(()=>{for(let i=0;i<3;i++)setTimeout(()=>{oburst(pr.left+pr.width/2,pr.top+80,'#ffd54a',30);sfx('coin');},i*200);},100);
 $('#mNext').onclick=()=>startLevel(n+1);$('#mHome').onclick=()=>{setGameVisible(false);goHome();};
 $('#mMap').onclick=()=>{setGameVisible(false);level=null;openMap();};$('#mFarm').onclick=()=>{setGameVisible(false);level=null;openFarm();};
}
function playVideo(kind,text,skippable){
 return new Promise(res=>{const v=$('#vid');v.src='a/'+kind+'_'+(S.char||'fox')+'.mp4';v.currentTime=0;$('#vidText').innerHTML=text;show('video');
  const btn=$('#vidBtn');btn.style.visibility='hidden';let done=false;const fin=()=>{if(done)return;done=true;v.pause();show(null);res();};
  setTimeout(()=>btn.style.visibility='visible',900);btn.onclick=fin;v.onended=()=>{btn.classList.add('glow');};
  v.play().catch(()=>{btn.style.visibility='visible';});
  const r=innerWidth/2;setTimeout(()=>{for(let i=0;i<4;i++)setTimeout(()=>oburst(r,innerHeight*.3,['#ffd54a','#ff80ab','#80d8ff','#b9f6ca'][i],30),i*250);},300);
 });
}
function openGarden(){gardenMode=true;show(null);setGameVisible(false);$('#gardenBar').classList.remove('hidden');layout();say('點點看花園裡的東西！');}
function settings(){
 const inGame=!!level;const fsOpt=[[1,'標準'],[1.15,'大'],[1.35,'特大']];
 modal(`<h2>設定</h2><div class="lbl">字體大小</div><div class="row">${fsOpt.map(([v,t])=>`<button class="opt ${Math.abs(S.fs-v)<.01?'on':''}" data-fs="${v}">${t}</button>`).join('')}</div>
 <div class="lbl">音效 / 音樂</div><div class="row"><button class="opt ${S.sfx?'on':''}" id="oS">音效 ${S.sfx?'開':'關'}</button><button class="opt ${S.music?'on':''}" id="oM">音樂 ${S.music?'開':'關'}</button></div><div class="row vol"><label>🎵 音樂音量 <input type="range" id="vM" min="0" max="100" value="${Math.round((S.musicVol==null?.7:S.musicVol)*100)}"></label></div><div class="row vol"><label>🔔 音效音量 <input type="range" id="vS" min="0" max="100" value="${Math.round((S.sfxVol==null?.8:S.sfxVol)*100)}"></label></div>
 <div class="lbl">夥伴：${CHARS[S.char||'fox'].full}</div><div class="row"><button class="opt" id="oC">更換夥伴</button></div>
 <p style="font-size:calc(18px*var(--fs))">玩法：用一根手指把寶石往旁邊滑，三個一樣就消除。<br>消除會累積能量變成種子，點兩個一樣的植物就能合成升級！</p>
 <div class="row"><button class="big glow" id="oX">繼續</button>${inGame?'<button class="big alt" id="oH">回首頁</button>':''}</div>`);
 document.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>{S.fs=+b.dataset.fs;save();applyFs();layout();renderTray();settings();});
 $('#oS').onclick=()=>{S.sfx=!S.sfx;save();settings();};$('#oM').onclick=()=>{S.music=!S.music;save();setMusic();settings();};$('#vM').oninput=e=>{S.musicVol=e.target.value/100;setMusic();};$('#vM').onchange=save;$('#vS').oninput=e=>{S.sfxVol=e.target.value/100;setMusic();};$('#vS').onchange=()=>{save();initAudio();sfx('tap');};
 $('#oC').onclick=()=>{const wasLevel=level;buildSelect();show('select');if(wasLevel){setGameVisible(false);level=null;}};
 $('#oX').onclick=()=>{show(inGame?null:'home');};
 if(inGame)$('#oH').onclick=()=>{setGameVisible(false);goHome();};
}

/* ---------- wire up ---------- */
$('#btnStart').onclick=()=>{initAudio();sfx('win');if(!S.char){buildSelect();show('select');}else goHome();};
$('#btnPlay').onclick=()=>{initAudio();startLevel();};
$('#btnMap').onclick=()=>{initAudio();openMap();};$('#btnFarm').onclick=()=>{initAudio();openFarm();};
$('#btnGarden').onclick=()=>{initAudio();openGarden();};
$('#btnGardenBack').onclick=()=>{gardenMode=false;$('#gardenBar').classList.add('hidden');layout();goHome();};
$('#btnMenu').onclick=()=>{initAudio();settings();};$('#btnSet2').onclick=()=>{initAudio();settings();};
document.addEventListener('pointerdown',()=>{if(AC&&AC.state!=='running')AC.resume();},true);
document.addEventListener('visibilitychange',()=>{if(!AC)return;if(document.hidden)AC.suspend();else AC.resume();});
setChar();setGameVisible(false);renderTray();layout();
assetP.then(()=>requestAnimationFrame(frame));
// expose for automated tests
let wdT=0;setInterval(()=>{const scr=document.querySelector('.screen.show');if(level&&busy&&!scr&&!tweens.length){wdT+=1;if(wdT>=4){wdT=0;console.warn('watchdog unstick');safeRefill().catch(()=>{}).finally(()=>{busy=false;});}}else wdT=0;},1000);
/* ---------- merge tutorial / helpers ---------- */
function seedCost(){return level&&level.n<=10?8:SEED_COST;}
function countTierFix(t){}
function tierNeed(){return goalState.find(g=>g.k==='tier'&&g.left>0);}
function mergePair(){if(!level)return null;const need=tierNeed();if(!need)return null;for(let t=need.t-1;t>=0;t--){const idx=[];S.tray.forEach((x,i)=>{if(x===t)idx.push(i);});if(idx.length>=2)return idx.slice(0,2);}return null;}
function giftSeeds(){const need=tierNeed();if(!need||level.n>10)return;const t=need.t-1;let have=S.tray.filter(x=>x===t).length;
 if(have>=2)return;let given=0;for(let i=0;i<NSLOT&&have<2;i++){if(S.tray[i]===-1){S.tray[i]=t;have++;given++;}}
 if(given){renderTray();save();say('送你'+TIERNAME[t]+'！點一下托盤合成看看～');}}
function updFinger(){const f=$('#finger'),tip=$('#mergeTip');if(!f)return;const p=(level&&!busy&&!document.querySelector('.screen.show'))?mergePair():null;
 const on=p&&(!S.tutMerge||idleT>4000)&&!bubbleOn;
 if(!on){f.style.display='none';tip.style.display='none';tipShownAt=0;return;}
 const sl=$('#slots').children;if(!sl[p[1]])return;const a=sl[p[0]].getBoundingClientRect(),b=sl[p[1]].getBoundingClientRect();
 f.style.setProperty('--ax',(a.left+a.width*.35)+'px');f.style.setProperty('--ay',(a.top+a.height*.45)+'px');f.style.setProperty('--bx',(b.left+b.width*.35)+'px');f.style.setProperty('--by',(b.top+b.height*.45)+'px');f.style.display='block';
 const t=S.tray[p[0]];tip.innerHTML='👆 點一下發光的'+TIERNAME[t]+'<br>兩個一樣就會合成「'+TIERNAME[t+1]+'」！';tip.style.display='block';
 if(tipZone&&compact){const z=tipZone;if(!tipShownAt)tipShownAt=Date.now();if(Date.now()-tipShownAt>7000)tipCol=true;
  tip.classList.toggle('col',tipCol);tip.style.pointerEvents='auto';if(!tip.onclick)tip.onclick=()=>{tipCol=!tipCol;tipShownAt=Date.now();updFinger();};
  if(tipCol){tip.innerHTML='❓ 提示';tip.style.fontSize=z.f+'px';tip.style.width='auto';tip.style.left=z.x+'px';tip.style.maxHeight='';tip.style.top=z.y+'px';return;}
  tip.innerHTML='👆 點兩個發光的'+TIERNAME[t]+'<br>合成「'+TIERNAME[t+1]+'」！<small> ✕</small>';}
 else{tip.classList.remove('col');tip.style.pointerEvents='';}
 if(tipZone){const z=tipZone;tip.style.fontSize=z.f+'px';tip.style.padding='6px 10px';tip.style.width=z.w+'px';tip.style.left=z.x+'px';tip.style.maxHeight=z.h+'px';tip.style.top=(z.y+Math.max(0,(z.h-tip.offsetHeight)/2))+'px';return;}
 tip.style.fontSize='';tip.style.padding='';tip.style.maxHeight='';
 const tw=Math.min(innerWidth-20,420);tip.style.width=tw+'px';tip.style.left=Math.max(10,Math.min(innerWidth-tw-10,(a.left+b.right)/2-tw/2))+'px';tip.style.top=Math.max(10,a.top-tip.offsetHeight-14)+'px';}
setInterval(updFinger,250);
window.__G={mergePair,tapSlot,swapG:(...a)=>swapG(...a),findMatches:()=>findMatches(),movable:g=>movable(g),get moss(){return moss},get N(){return N},mk,get level(){return level},startLevel,openMap:()=>openMap(),openFarm:()=>openFarm(),farmTick:()=>renderFarm(),win:()=>win(),get ice(){return ice},get grid(){return grid},get busy(){return busy},findMove,trySwap,get S(){return S},get goalState(){return goalState},get movesLeft(){return movesLeft},set movesLeft(v){movesLeft=v}};

/* ---- tray deadlock fix: plant / sell a single item; auto-plant when full ---- */
function plantItem(i){const t=S.tray[i];if(t<0)return;S.garden.push({t:Math.max(1,t),x:.08+Math.random()*.84,y:.58+Math.random()*.38});if(S.garden.length>40)S.garden.sort((a,b)=>b.t-a.t).length=40;S.tray[i]=-1;try{renderGarden();}catch(e){}}
function sellVal(t){return (t+1)*15;}
function autoPlant(){let lo=-1;S.tray.forEach((t,i)=>{if(t>=0&&(lo<0||t<S.tray[lo]))lo=i;});if(lo<0)return -1;
 const t=S.tray[lo];plantItem(lo);try{floatText(TIERNAME[t]+' 種到花園了！',innerWidth/2,innerHeight*.5);}catch(e){}return lo;}
function trayMenu(i){const t=S.tray[i];if(t<0)return;const v=sellVal(t);const wasBusy=busy;
 modal(`<h2><img src="a/t${t}.png" style="height:1.6em;vertical-align:middle"> ${TIERNAME[t]}</h2><p>${t<5?'再找一個一樣的「'+TIERNAME[t]+'」就能合成。<br>':''}托盤卡住了嗎？可以：</p>
 <div class="row"><button class="big green" id="tPlant">🌷 種到花園</button></div>
 <div class="row"><button class="big glow" id="tSell">收成換 <img class="ci" src="a/coin.png" alt="">+${v}</button></div>
 <div class="row"><button class="big alt" id="tKeep">留著</button></div>`);
 const close=()=>{show(null);busy=wasBusy;renderTray();save();if(typeof updMeter==='function')updMeter();};
 $('#tPlant').onclick=()=>{plantItem(i);sfx('seed');close();say('種好了！托盤空出一格');addEnergy(0);};
 $('#tSell').onclick=()=>{S.tray[i]=-1;S.coins=(S.coins||0)+v;sfx('coin');close();say('收成了！');addEnergy(0);};
 $('#tKeep').onclick=close;}

/* v2.1: chapter-end cheer animation (selected character) + next-chapter story, skippable, auto-continue */
function chapterStory(ch,coins){return new Promise(res=>{
 const k=S.char||'fox',chr=CHARS[k]||{},st=STORY[ch]||STORY[0],nx=CHAPTERS[ch+1];
 const vsrc='a/'+(ch%2?'chap_':'cheer_')+k+'.mp4';
 let d=$('#story');if(!d){d=document.createElement('div');d.id='story';document.body.appendChild(d);}
 d.innerHTML=`<div class="sp sp1"><video src="${vsrc}" poster="a/cheerimg_${k}.jpg" muted playsinline webkit-playsinline autoplay preload="auto"></video>
  <div class="sLine"><b>第 ${ch+1} 章 完成！</b><span>${st.cheer}</span>${coins?`<i><img class="ci" src="a/coin.png" alt="">+${coins}</i>`:''}</div></div>
  <div class="sp sp2"><div class="sBg" style="background-image:url(${nx?nx.bg:CHAPTERS[ch].bg})"></div><div class="sPet"></div>
  <img class="sChar" src="a/ch_${k}.png"><div class="sTxt"><b>${nx?'第 '+(ch+2)+' 章・'+nx.name:'最終章 完結'}</b><span>${st.next}</span></div></div>
  <button id="sSkip">跳過 ⏭</button><button id="sGo" class="big glow">繼續 ▶</button>`;
 if(nx){S.seenCh[ch+1]=true;save();}
 d.className='show';const v=d.querySelector('video');v.play().catch(()=>{});sfx('win');
 let step=0,done=false,T;
 const fin=()=>{if(done)return;done=true;clearTimeout(T);v.pause();d.className='';d.innerHTML='';res();};
 const two=()=>{if(step>=1)return;step=1;clearTimeout(T);v.pause();d.classList.add('p2');try{sfx('chime',3);}catch(e){}if(typeof say==='function'&&ch<9){}T=setTimeout(fin,9000);};
 v.onended=()=>{T=setTimeout(two,600);};T=setTimeout(two,7000);
 const r=innerWidth/2;for(let i=0;i<4;i++)setTimeout(()=>oburst(r,innerHeight*.3,['#ffd54a','#ff80ab','#80d8ff','#b9f6ca'][i],reducedMotion()?8:30),300+i*250);
 $('#sSkip').onclick=fin;$('#sGo').onclick=()=>step?fin():two();
});}
function reducedMotion(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
/* v2.1 combo FX: escalating shake/flash/particles/shards/shockwave + bouncing COMBO xN + praise + rising arpeggio */
const PRAISE=['','','Great!','Amazing!','Fantastic!','Incredible!','Unstoppable!','LEGENDARY!'];
function comboText(c){
 const rm=reducedMotion(),lv=Math.min(c,7),br=bw.getBoundingClientRect(),cx=br.left+br.width/2,cy=br.top+br.height*.42;
 const d=document.createElement('div');d.className='combo2 lv'+lv;d.innerHTML=`<b>COMBO x${c}!</b><span>${PRAISE[lv]}<br><small>${COMBOW[Math.min(c,6)]||'無敵！'}</small></span>`;
 d.style.left=cx+'px';d.style.top=cy+'px';$('#floaters').appendChild(d);setTimeout(()=>d.remove(),1500);
 // rising arpeggio
 try{for(let i=0;i<Math.min(c+1,7);i++)tone(PENTA[Math.min(i+c-1,10)],.3,'triangle',.08,i*.045);if(c>=4)tone(PENTA[10],.7,'sine',.07,.3);}catch(e){}
 if(rm){oburst(cx,cy,'#ffd54a',6+c);return;}
 shakeT=Math.max(shakeT,.15+.08*lv);
 document.body.classList.remove('shk');void document.body.offsetWidth;document.body.style.setProperty('--shk',(2+lv*1.5)+'px');document.body.classList.add('shk');
 const f=document.createElement('div');f.className='cflash';f.style.opacity=Math.min(.18+.08*lv,.6);document.body.appendChild(f);setTimeout(()=>f.remove(),450);
 const ring=document.createElement('div');ring.className='cring';ring.style.left=cx+'px';ring.style.top=cy+'px';ring.style.setProperty('--rs',(1.5+lv*.6));document.body.appendChild(ring);setTimeout(()=>ring.remove(),700);
 const cols=['#ffd54a','#ff80ab','#80d8ff','#b9f6ca','#e1bee7','#fff'];
 for(let i=0;i<Math.min(2+lv,8);i++)oburst(cx+(Math.random()-.5)*br.width*.7,cy+(Math.random()-.5)*br.height*.5,cols[i%cols.length],10+lv*4);
 for(let i=0;i<4+lv*3;i++){const s=document.createElement('i');s.className='cshard';const a=Math.random()*6.28,dist=80+Math.random()*(120+lv*40);
  s.style.left=cx+'px';s.style.top=cy+'px';s.style.setProperty('--dx',Math.cos(a)*dist+'px');s.style.setProperty('--dy',Math.sin(a)*dist+'px');s.style.setProperty('--r',(a*57)+'deg');s.style.background=cols[i%cols.length];document.body.appendChild(s);setTimeout(()=>s.remove(),800);}
 if(c>=4){const m=$('#mascotImg');m.classList.remove('excite');void m.offsetWidth;m.classList.add('excite');setTimeout(()=>m.classList.remove('excite'),1600);
  const ch=CHARS[S.char||'fox'];say(['哇！連鎖'+c+'次！你太強了！','好厲害好厲害！停不下來！','天啊！'+c+'連擊！'][c%3]);}
}
