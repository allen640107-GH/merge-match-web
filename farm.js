'use strict';
/* 花語寶石園 v2 — 開心農場 / 地圖 / 每日獎勵 / 道具 / 結局 */
const CROPS={
 wheat:{name:'小麥',img:'c_wheat',t:120,cost:5,gain:15,lv:1},
 carrot:{name:'紅蘿蔔',img:'c_carrot',t:300,cost:10,gain:30,lv:1},
 straw:{name:'草莓',img:'c_straw',t:900,cost:20,gain:70,lv:6},
 corn:{name:'玉米',img:'c_corn',t:1800,cost:30,gain:110,lv:11},
 pump:{name:'南瓜',img:'c_pump',t:3600,cost:50,gain:200,lv:21},
 sun:{name:'向日葵',img:'c_sun',t:7200,cost:80,gain:350,lv:31}};
const ANIMALS={
 hen:{name:'母雞',img:'a_hen',prod:'egg',t:600,cost:100,snd:'cluck'},
 cow:{name:'乳牛',img:'a_cow',prod:'milk',t:1800,cost:300,snd:'moo'},
 sheep:{name:'綿羊',img:'a_sheep',prod:'wool',t:3600,cost:500,snd:'baa'}};
const PROD={egg:{name:'雞蛋',img:'p_egg'},milk:{name:'牛奶',img:'p_milk'},wool:{name:'羊毛',img:'p_wool'}};
const DECOS={scare:{name:'稻草人',img:'d_scare',cost:150},bench:{name:'木長椅',img:'d_bench',cost:200},lamp:{name:'小路燈',img:'d_lamp',cost:250},cart:{name:'花車',img:'d_cart',cost:300},mail:{name:'郵筒',img:'d_mail',cost:180},lantern:{name:'燈籠',img:'d_lantern',cost:220},well:{name:'水井',img:'d_well',cost:320},bridge:{name:'小木橋',img:'d_bridge',cost:350},arch:{name:'花架',img:'d_arch',cost:380},swing:{name:'秋千',img:'d_swing',cost:420},windmill:{name:'風車',img:'d_windmill',cost:500}};
const BOOSTS={
 hammer:{name:'魔法鎚',img:'b_hammer',desc:'敲掉任一格（木箱也行）',need:{egg:3}},
 potion:{name:'彩虹藥水',img:'b_potion',desc:'把一顆寶石變成彩虹寶石',need:{wool:2}},
 moves:{name:'+5 步',img:'p_milk',desc:'馬上多 5 步',need:{milk:2}}};
const MAXPLOT=12,MAXANIMAL=6;
const DAILY=[{coins:50},{coins:80,seeds:{wheat:2}},{coins:100,boost:{hammer:1}},{coins:120,seeds:{carrot:2}},{coins:150,boost:{potion:1}},{coins:180,seeds:{straw:2}},{coins:300,boost:{moves:1,hammer:1}}];
const nowS=()=>Date.now();
function fmt(ms){const s=Math.max(0,Math.ceil(ms/1000));if(s>=3600)return Math.floor(s/3600)+'時'+String(Math.floor(s%3600/60)).padStart(2,'0')+'分';if(s>=60)return Math.floor(s/60)+'分'+String(s%60).padStart(2,'0')+'秒';return s+'秒';}
function maxLv(){return Math.min(S.level,NLEV);}
function seedReward(n){const ks=Object.keys(CROPS).filter(k=>CROPS[k].lv<=n);return Math.random()<.5?ks[ks.length-1]:ks[(Math.random()*ks.length)|0];}
function plotLeft(p){return p.t0+CROPS[p.k].t*1000-nowS();}
function animLeft(a){return a.t0+ANIMALS[a.k].t*1000-nowS();}
function farmReady(){return S.farm.plots.filter(p=>p&&plotLeft(p)<=0).length+S.farm.animals.filter(a=>animLeft(a)<=0).length;}
function floatAt(t,el){const r=el.getBoundingClientRect();floatText(t,r.left+r.width/2,r.top+r.height*.3);}

/* ---------- farm screen ---------- */
let farmSig='',farmIv=null;
function openFarm(){gardenMode=false;level=null;setGameVisible(false);show('farm');renderFarm(true);clearInterval(farmIv);farmIv=setInterval(()=>{if($('#farm').classList.contains('show'))renderFarm();},1000);
 if(!S.farmTut){S.farmTut=true;save();setTimeout(()=>farmSay('歡迎來到開心農場！點空地種菜，熟了點一下收成換金幣<img class="ci" src="a/coin.png" alt="">'),500);}}
function farmSay(t){const b=$('#fSay');b.innerHTML=t;b.classList.add('show');clearTimeout(farmSay.t);farmSay.t=setTimeout(()=>b.classList.remove('show'),3200);}
function sig(){return S.farm.plots.map(p=>p?p.k+(plotLeft(p)<=0?'R':'g'):'_').join()+'|'+S.farm.animals.map(a=>a.k+(animLeft(a)<=0?'R':'g')).join()+'|'+S.farm.decos.join()+'|'+S.coins+JSON.stringify(S.inv)+JSON.stringify(S.seeds)+JSON.stringify(S.boost);}
function renderFarm(force){
 const g=sig();
 if(!force&&g===farmSig){document.querySelectorAll('#farm [data-end]').forEach(e=>e.textContent=fmt(+e.dataset.end-nowS()));return;}
 farmSig=g;$('#fCoins').innerHTML='<img class="ci" src="a/coin.png" alt="">'+S.coins;
 $('#fChar').src=CHARS[S.char||'fox'].img;
 $('#fAnimals').innerHTML=S.farm.animals.map((a,i)=>{const A=ANIMALS[a.k],P=PROD[A.prod],L=animLeft(a);
  return `<div class="fa ${L<=0?'ready':''}" data-act="animal" data-i="${i}"><img class="an" src="a/${A.img}.png">${L<=0?`<img class="prod" src="a/${P.img}.png">`:`<div class="cd"><img src="a/${P.img}.png"><span data-end="${a.t0+A.t*1000}">${fmt(L)}</span></div>`}<div class="nm">${A.name}</div></div>`;}).join('')+
  (S.farm.animals.length<MAXANIMAL?`<div class="fa add" data-act="shop" data-tab="animal"><span>＋<br>買動物</span></div>`:'');
 $('#fPlots').innerHTML=S.farm.plots.map((p,i)=>{if(!p)return `<div class="fp empty" data-act="plot" data-i="${i}"><span class="plus">＋<br>種植</span></div>`;
  const C=CROPS[p.k],L=plotLeft(p);
  return L<=0?`<div class="fp ready" data-act="plot" data-i="${i}"><img class="crop" src="a/${C.img}.png"><span class="lab">收成！</span></div>`
   :`<div class="fp grow" data-act="plot" data-i="${i}"><img class="sp" src="a/sprout.png"><span class="lab" data-end="${p.t0+C.t*1000}">${fmt(L)}</span><span class="cn">${C.name}</span></div>`;}).join('')+
  (S.farm.plots.length<MAXPLOT?`<div class="fp buy" data-act="land"><span>＋擴地<br><img class="ci" src="a/coin.png" alt="">${landCost()}</span></div>`:'');
 if(typeof renderYard==='function'){renderYard();}else $('#fDecos').innerHTML=S.farm.decos.length?S.farm.decos.map((k,i)=>`<img data-act="deco" data-i="${i}" src="a/${DECOS[k].img}.png">`).join(''):'<div class="hint">在商店買裝飾，農場會更漂亮！</div>';
 $('#fInv').innerHTML=Object.keys(PROD).map(k=>`<span><img src="a/${PROD[k].img}.png">${S.inv[k]||0}</span>`).join('')+
  Object.keys(BOOSTS).map(k=>`<span class="bo"><img src="a/${BOOSTS[k].img}.png">${k==='moves'?'+5':''}×${S.boost[k]||0}</span>`).join('');
}
function landCost(){return 100*(S.farm.plots.length-3);}
document.addEventListener('pointerup',e=>{const t=e.target.closest('#farm [data-act]');if(!t)return;initAudio();farmAct(t.dataset.act,+t.dataset.i,t);});
function farmAct(act,i,el){
 if(act==='plot'){const p=S.farm.plots[i];
  if(!p)return seedPicker(i);
  if(plotLeft(p)<=0){const C=CROPS[p.k];S.coins+=C.gain;S.farm.plots[i]=null;save();sfx('coin');floatAt('+'+C.gain+'<img class="ci" src="a/coin.png" alt="">',el);const r=el.getBoundingClientRect();oburst(r.left+r.width/2,r.top+r.height/2,'#ffd54a',22);renderFarm(true);return;}
  sfx('tap');farmSay(CROPS[p.k].name+'還要 '+fmt(plotLeft(p))+' 才會熟喔～關掉遊戲也會繼續長！');return;}
 if(act==='animal'){const a=S.farm.animals[i],A=ANIMALS[a.k];sfx(A.snd);
  if(animLeft(a)<=0){S.inv[A.prod]=(S.inv[A.prod]||0)+1;a.t0=nowS();save();floatAt('+1 '+PROD[A.prod].name,el);const r=el.getBoundingClientRect();oburst(r.left+r.width/2,r.top,'#fff59d',16);renderFarm(true);}
  else{el.classList.remove('wig');void el.offsetWidth;el.classList.add('wig');farmSellMenu('animal',i,A.name+'：再等 '+fmt(animLeft(a))+' 就有'+PROD[A.prod].name+'！');}return;}
 if(act==='land'){const c=landCost();if(S.coins<c){sfx('nope');farmSay('金幣不夠，再收成或過關賺金幣吧！');return;}S.coins-=c;S.farm.plots.push(null);save();sfx('seed');renderFarm(true);farmSay('農地變大了！');return;}
 if(act==='deco'){sfx('voice');el.classList.remove('wig');void el.offsetWidth;el.classList.add('wig');return farmSellMenu('deco',i);}
 if(act==='shop')return openShop(el.dataset.tab);
}
function seedPicker(i){
 const rows=Object.entries(CROPS).map(([k,C])=>{const lock=C.lv>maxLv();const have=S.seeds[k]||0;
  return `<button class="shopRow ${lock?'lock':''}" data-k="${k}"><img src="a/${C.img}.png"><span class="t"><b>${C.name}</b><small>${fmt(C.t*1000)} 成熟・賣 <img class="ci" src="a/coin.png" alt="">${C.gain}</small></span><span class="p">${lock?'🔒 第'+C.lv+'關':have?'種子 ×'+have:'<img class="ci" src="a/coin.png" alt="">'+C.cost}</span></button>`;}).join('');
 modal(`<h2>種什麼呢？</h2><div class="shopList">${rows}</div><div class="row"><button class="big alt" id="spX">關閉</button></div>`);
 $('#spX').onclick=()=>show('farm');
 document.querySelectorAll('.shopRow').forEach(b=>b.onclick=()=>{const k=b.dataset.k,C=CROPS[k];if(C.lv>maxLv()){sfx('nope');return;}
  if((S.seeds[k]||0)>0)S.seeds[k]--;else if(S.coins>=C.cost)S.coins-=C.cost;else{sfx('nope');b.classList.add('shake');setTimeout(()=>b.classList.remove('shake'),400);return;}
  S.farm.plots[i]={k,t0:nowS()};save();sfx('seed');show('farm');renderFarm(true);farmSay('種下'+C.name+'了！'+fmt(C.t*1000)+'後回來收成～');});
}
function openShop(tab){
 const sec=(t,h)=>`<div class="lbl">${t}</div>${h}`;
 const seeds=Object.entries(CROPS).map(([k,C])=>{const lock=C.lv>maxLv();return `<button class="shopRow ${lock?'lock':''}" data-buy="seed" data-k="${k}"><img src="a/${C.img}.png"><span class="t"><b>${C.name}種子</b><small>有 ${S.seeds[k]||0} 包</small></span><span class="p">${lock?'🔒 第'+C.lv+'關':'<img class="ci" src="a/coin.png" alt="">'+C.cost}</span></button>`;}).join('');
 const an=Object.entries(ANIMALS).map(([k,A])=>`<button class="shopRow" data-buy="animal" data-k="${k}"><img src="a/${A.img}.png"><span class="t"><b>${A.name}</b><small>每 ${fmt(A.t*1000)} 產${PROD[A.prod].name}</small></span><span class="p"><img class="ci" src="a/coin.png" alt="">${A.cost}</span></button>`).join('');
 const de=Object.entries(DECOS).map(([k,D])=>{const own=S.farm.decos.includes(k);return `<button class="shopRow ${own?'lock':''}" data-buy="deco" data-k="${k}"><img src="a/${D.img}.png"><span class="t"><b>${D.name}</b><small>農場裝飾</small></span><span class="p">${own?'已擁有':'<img class="ci" src="a/coin.png" alt="">'+D.cost}</span></button>`;}).join('');
 const land=S.farm.plots.length<MAXPLOT?`<button class="shopRow" data-buy="land"><img src="a/plot.png"><span class="t"><b>擴充農地</b><small>目前 ${S.farm.plots.length} / ${MAXPLOT} 塊</small></span><span class="p"><img class="ci" src="a/coin.png" alt="">${landCost()}</span></button>`:'';
 const ex=Object.entries(BOOSTS).map(([k,B])=>{const [pk,pn]=Object.entries(B.need)[0];return `<button class="shopRow" data-buy="boost" data-k="${k}"><img src="a/${B.img}.png"><span class="t"><b>${B.name}</b><small>${B.desc}・有 ${S.boost[k]||0}</small></span><span class="p"><img class="pi" src="a/${PROD[pk].img}.png">×${pn}<br><small>有 ${S.inv[pk]||0}</small></span></button>`;}).join('');
 modal(`<h2>🛒 農場商店</h2><div class="pill coinP"><img class="ci" src="a/coin.png" alt="">${S.coins}</div><div class="shopList" id="shopList">${sec('用農產品換道具',ex)}${sec('種子',seeds)}${sec('動物',an)}${sec('裝飾',de)}${sec('土地',land)}</div><div class="row"><button class="big glow" id="shX">回農場</button></div>`);
 $('#shX').onclick=()=>{show('farm');renderFarm(true);};
 if(tab==='animal'){const e=document.querySelector('[data-buy=animal]');e&&e.scrollIntoView({block:'center'});}
 if(openShop.sc!=null&&!tab){$('#shopList').scrollTop=openShop.sc;}
 document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const ok=buy(b.dataset.buy,b.dataset.k);if(ok){sfx('coin');openShop.sc=$('#shopList').scrollTop;openShop();floatAt(ok,$('#shopList'));}else{sfx('nope');b.classList.add('shake');setTimeout(()=>b.classList.remove('shake'),400);}});
}
function buy(kind,k){
 const pay=c=>{if(S.coins<c)return false;S.coins-=c;return true;};let msg=null;
 if(kind==='seed'){const C=CROPS[k];if(C.lv>maxLv()||!pay(C.cost))return null;S.seeds[k]=(S.seeds[k]||0)+1;msg='+1 '+C.name+'種子';}
 if(kind==='animal'){if(S.farm.animals.length>=MAXANIMAL||!pay(ANIMALS[k].cost))return null;S.farm.animals.push({k,t0:nowS()});msg=ANIMALS[k].name+'來了！';}
 if(kind==='deco'){if(S.farm.decos.includes(k)||!pay(DECOS[k].cost))return null;S.farm.decos.push(k);msg=DECOS[k].name+'！';}
 if(kind==='land'){if(S.farm.plots.length>=MAXPLOT||!pay(landCost()))return null;S.farm.plots.push(null);msg='農地 +1';}
 if(kind==='boost'){const [pk,pn]=Object.entries(BOOSTS[k].need)[0];if((S.inv[pk]||0)<pn)return null;S.inv[pk]-=pn;S.boost[k]=(S.boost[k]||0)+1;msg='+1 '+BOOSTS[k].name;}
 save();return msg;
}

/* ---------- daily login reward ---------- */
function checkDaily(force){
 if(!$('#home').classList.contains('show')&&!force)return;
 const today=new Date().toDateString();if(S.daily.last===today)return;
 const y=new Date(Date.now()-864e5).toDateString();const day=S.daily.last===y?(S.daily.streak%7)+1:1;
 const desc=r=>[r.coins?'<img class="ci" src="a/coin.png" alt="">'+r.coins:'',...Object.entries(r.seeds||{}).map(([k,n])=>`<img src="a/${CROPS[k].img}.png">×${n}`),...Object.entries(r.boost||{}).map(([k,n])=>`<img src="a/${BOOSTS[k].img}.png">×${n}`)].join(' ');
 modal(`<h2>🎁 每日登入獎勵</h2><p>連續第 ${day} 天！</p><div class="daily">${DAILY.map((r,i)=>`<div class="dd ${i+1<day?'got':i+1===day?'now':''}"><b>第${i+1}天</b><div>${desc(r)}</div></div>`).join('')}</div><div class="row"><button class="big glow" id="dClaim">領取！</button></div>`);
 $('#dClaim').onclick=()=>{const r=DAILY[day-1];S.coins+=r.coins||0;for(const[k,n]of Object.entries(r.seeds||{}))S.seeds[k]=(S.seeds[k]||0)+n;for(const[k,n]of Object.entries(r.boost||{}))S.boost[k]=(S.boost[k]||0)+n;
  S.daily={last:today,streak:day};save();sfx('win');const pr=$('#panel').getBoundingClientRect();oburst(pr.left+pr.width/2,pr.top+pr.height/2,'#ffd54a',40);setTimeout(()=>goHome(),500);};
}

/* ---------- map ---------- */
function openMap(){level=null;setGameVisible(false);show('map');$('#mapStars').textContent='⭐ '+totalStars();
 const L=Math.min(S.level,NLEV+1);
 $('#mapList').innerHTML=CHAPTERS.map((C,ch)=>{const first=ch*10+1,open=first<=L;const got=[...Array(10)].reduce((a,_,i)=>a+(S.stars[first+i]||0),0);
  const nodes=[...Array(10)].map((_,i)=>{const n=first+i,st=S.stars[n]||0,un=n<=L&&n<=NLEV;
   return `<button class="node ${!un?'locked':n===S.level?'cur':st?'done':''}" data-n="${n}"><b>${un?n:'🔒'}</b><i>${st?'⭐'.repeat(st):''}</i></button>`;}).join('');
  return `<div class="chap ${open?'':'lockc'}" id="chap${ch}"><div class="cban" style="background-image:url(${C.bg})"><div class="ct"><b>第 ${ch+1} 章</b>${C.name}</div><div class="cs">⭐ ${got}/30</div></div><div class="nodes">${nodes}</div>${open?'':`<div class="lockMsg">🔒 完成第 ${ch} 章就能解鎖</div>`}</div>`;}).join('')
  +(S.ended?`<div class="chap"><button class="big glow" id="mapEnd">🎬 重看結局</button></div>`:'');
 document.querySelectorAll('#mapList .node').forEach(b=>b.onclick=()=>{initAudio();const n=+b.dataset.n;if(n>Math.min(S.level,NLEV)){sfx('nope');return;}sfx('tap');startLevel(n);});
 if($('#mapEnd'))$('#mapEnd').onclick=async()=>{await playVideo('end','花園永遠美麗！');showEnding();};
 const cur=$('#chap'+chapterOf(Math.min(S.level,NLEV)));setTimeout(()=>cur&&cur.scrollIntoView({block:'start'}),50);
}

/* ---------- chapter intro & ending ---------- */
function chapterIntro(ch){return new Promise(res=>{const C=CHAPTERS[ch];
 const mi={ice:['ice'],crate:['crate','acorn'],vine:['vine'],all:['ice','crate','vine','acorn']}[C.mech]||['g0','t1'];
 modal(`<div class="cban big" style="background-image:url(${C.bg})"><div class="ct"><b>第 ${ch+1} 章</b>${C.name}</div></div><div class="mech">${mi.map(k=>`<img src="a/${k}.png">`).join('')}</div><p>${C.intro}</p><div class="row"><button class="big glow" id="ciGo">出發！</button></div>`);
 sfx('win');$('#ciGo').onclick=()=>{S.seenCh[ch]=true;save();res();};});}
function showEnding(){level=null;setGameVisible(false);show('ending');sfx('win');
 $('#endStars').textContent='⭐ '+totalStars()+' / '+NLEV*3;
 const r=innerWidth/2;for(let i=0;i<6;i++)setTimeout(()=>oburst(r*(.4+Math.random()*1.2),innerHeight*.3,['#ffd54a','#ff80ab','#80d8ff','#b9f6ca'][i%4],34),i*300);}

/* ---------- boosters (in-level) ---------- */
function updBoost(){const el=$('#boost');if(!el)return;
 el.innerHTML=Object.entries(BOOSTS).map(([k,B])=>`<button class="bst ${boostMode===k?'on':''} ${(S.boost[k]||0)?'':'zero'}" data-b="${k}"><img src="a/${B.img}.png">${k==='moves'?'<em>+5</em>':''}<span>${S.boost[k]||0}</span></button>`).join('');
 el.querySelectorAll('.bst').forEach(b=>b.onclick=()=>{initAudio();const k=b.dataset.b;if(busy&&!boostMode)return;
  if(!(S.boost[k]>0)){sfx('nope');say('去農場用'+PROD[Object.keys(BOOSTS[k].need)[0]].name+'兌換'+BOOSTS[k].name+'！');return;}
  if(k==='moves'){S.boost.moves--;movesLeft+=5;save();sfx('seed');floatText('+5 步！',W/2,H*.3);updHud();return;}
  boostMode=boostMode===k?null:k;sfx('tap');if(boostMode)say(k==='hammer'?'點一個格子，用魔法鎚敲掉它！':'點一顆寶石，把它變成彩虹寶石！');updBoost();});
}
async function useBoostAt(r,c){const k=boostMode,g=grid[r][c];
 if(!g||g.c===-2||(k==='potion'&&(g.c<0||g.crate||g.s===4))){sfx('nope');return;}
 busy=true;boostMode=null;S.boost[k]--;save();updBoost();
 try{
  if(k==='hammer'){sfx('special');shakeT=.3;await clearSet(new Set([r*N+c]),[],1);await gravity();await cascade(null);}
  else{g.vine=false;g.s=4;g.sc=.4;sparkle((c+.5)*cs,(r+.5)*cs);sfx('special');await tween(g,{sc:1},380,ease.back);}
 }catch(e){console.error(e);}
 await endTurn();
}

/* ---- v2.0.5: sell garden items, animals, decorations ---- */
function sellMenu(img,name,info,v,onSell){const wasBusy=typeof busy!=='undefined'?busy:false;try{busy=true;}catch(e){}
 modal(`<h2><img src="${img}" style="height:1.6em;vertical-align:middle"> ${name}</h2>${info?'<p>'+info+'</p>':''}
 <div class="row"><button class="big glow" id="sSell">賣掉 <img class="ci" src="a/coin.png" alt="">+${v}</button></div>
 <div class="row"><button class="big alt" id="sCancel">取消</button></div>`);
 const close=()=>{$('#modal').classList.remove('show');try{busy=wasBusy;}catch(e){}};
 $('#sSell').onclick=()=>{onSell();S.coins=(S.coins||0)+v;save();sfx('coin');close();floatText('+'+v+' <img class="ci" src="a/coin.png" alt="">',innerWidth/2,innerHeight*.45);};
 $('#sCancel').onclick=close;}
function gardenMenu(d){const idx=S.garden.indexOf(d);if(idx<0||document.querySelector('#modal.show'))return;
 const g=(level&&typeof tierNeed==='function')?tierNeed():null;
 let info='花園裡的植物可以賣掉換金幣。';
 if(g)info+=`<br>⚠️ 這關目標要在托盤合成「${TIERNAME[g.t]}」，花園裡的植物不能拿來合成，賣掉不影響目標。`;
 sellMenu('a/t'+d.t+'.png',TIERNAME[d.t],info,sellVal(d.t),()=>{const j=S.garden.indexOf(d);if(j>=0)S.garden.splice(j,1);renderGarden();});}
function farmSellMenu(kind,i,info){
 if(kind==='animal'){const a=S.farm.animals[i];if(!a)return;const A=ANIMALS[a.k];const v=Math.floor(A.cost/2);
  sellMenu('a/'+A.img+'.png',A.name,(info?info+'<br>':'')+'賣掉可拿回一半價錢。',v,()=>{S.farm.animals.splice(i,1);renderFarm(true);});}
 else{const k=S.farm.decos[i];if(!k)return;const D=DECOS[k];const v=Math.floor(D.cost/2);
  sellMenu('a/'+D.img+'.png',D.name,'賣掉可拿回一半價錢。',v,()=>{S.farm.decos.splice(i,1);renderFarm(true);});}}
