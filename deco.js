/* v2.1.1: decorate mode — drag garden items & farm decorations, storage box */
window.decoEdit=false;
const YARD_EDIT={on:false};
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
/* generic drag: el inside box; cb.move(nx,ny), cb.drop(nx,ny,overStore) ; tap -> cb.tap */
function dragify(el,box,store,cb){
 el.style.touchAction='none';
 el.onpointerdown=ev=>{if(!cb.enabled())return;ev.preventDefault();ev.stopPropagation();
  const br=box.getBoundingClientRect(),er=el.getBoundingClientRect();
  const ox=ev.clientX-er.left,oy=ev.clientY-er.top;let moved=false;const sx=ev.clientX,sy=ev.clientY;
  try{el.setPointerCapture(ev.pointerId);}catch(e){}
  el.classList.add('dragging');try{sfx('tap');}catch(e){}
  const over=e=>{if(!store||store.classList.contains('hidden'))return false;const r=store.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top-10&&e.clientY<=r.bottom+10;};
  el.onpointermove=e=>{if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)>6)moved=true;if(!moved)return;
   el.style.left=(e.clientX-br.left-ox)+'px';el.style.top=(e.clientY-br.top-oy)+'px';
   if(store)store.classList.toggle('hot',over(e));};
  const end=e=>{el.onpointermove=el.onpointerup=el.onpointercancel=null;el.classList.remove('dragging');if(store)store.classList.remove('hot');
   if(!moved){cb.tap&&cb.tap(e);return;}
   const r=el.getBoundingClientRect();const nx=clamp((r.left+r.width/2-br.left)/br.width,.04,.96),ny=clamp((r.bottom-br.top)/br.height,.08,1);
   cb.drop(nx,ny,over(e));};
  el.onpointerup=end;el.onpointercancel=end;};
}
function storeHTML(items){return items.length?items.map((it,i)=>`<button class="sItem" data-si="${i}"><img src="${it.src}"><span>${it.name}</span></button>`).join(''):'<div class="sEmpty">（空的）</div>';}
/* ---------- garden ---------- */
function gardenNames(t){return ['','小嫩芽','小花','花叢','開花樹','大花樹'][t]||'植物';}
function setGardenEdit(on){window.decoEdit=on;const b=$('#btnGEdit'),st=$('#gStore');
 b.textContent=on?'✓ 完成佈置':'✋ 佈置花園';b.classList.toggle('glow',!on);
 $('#gTip').textContent=on?'👆 按住拖曳移動，拖到收納箱就收起來':'點一下花園裡的東西就能賣掉！';$('#gTip').classList.toggle('edit',on);
 st.classList.toggle('hidden',!on);document.body.classList.toggle('decoEdit',on);if(!on)save();renderGarden();}
function renderGStore(){const st=$('#gStore');const items=S.garden.map((d,i)=>({d,i})).filter(o=>o.d.st);
 st.innerHTML='<div class="sHead">📦 收納箱（點一下拿出來）</div><div class="sRow">'+storeHTML(items.map(o=>({src:'a/t'+o.d.t+'.png',name:gardenNames(o.d.t)})))+'</div>';
 st.querySelectorAll('.sItem').forEach(b=>b.onclick=()=>{const d=items[+b.dataset.si].d;d.st=0;d.x=.3+Math.random()*.4;d.y=.8;save();sfx('chime',d.t);renderGarden();});}
const _rg=renderGarden;
renderGarden=function(){if(gardenMode&&window.decoEdit)renderGStore();_rg();if(!gardenMode)return;const box=$('#sceneItems'),st=$('#gStore');
 box.querySelectorAll('.deco').forEach(e=>{const d=e._d;if(!d)return;e.classList.toggle('editable',window.decoEdit);
  dragify(e,box,st,{enabled:()=>window.decoEdit,
   drop:(nx,ny,toStore)=>{if(toStore){d.st=1;sfx('pop');}else{const br=box.getBoundingClientRect();gardenDrop(d,nx*br.width,ny*br.height,e.offsetWidth);}save();renderGarden();}});});
 };
$('#btnGEdit').onclick=()=>{initAudio();setGardenEdit(!window.decoEdit);};
{const bb=$('#btnGardenBack'),o=bb.onclick;bb.onclick=e=>{if(window.decoEdit)setGardenEdit(false);o&&o(e);};}
/* ---------- farm yard ---------- */
function yardPos(){if(!S.farm.dpos)S.farm.dpos={};const P=S.farm.dpos;let i=0;
 S.farm.decos.forEach(k=>{if(!P[k])P[k]={x:.15+((i*.23)%0.75),y:.55+(i%2)*.35,st:0};i++;});
 S.farm.animals.forEach((a,j)=>{if(a.x==null){a.x=.2+((j*.3)%0.7);a.y=.75+(j%2)*.2;}});return P;}
function renderYard(){const box=$('#fYard'),st=$('#fStore');if(!box)return;const P=yardPos();const ed=YARD_EDIT.on;
 const H=box.clientHeight||260,W=box.clientWidth||340,u=Math.min(H*.42,W*.3);const list=[];
 S.farm.decos.forEach((k,i)=>{const p=P[k];if(!p.st)list.push({kind:'deco',k,i,p,src:'a/'+DECOS[k].img+'.png',sz:u});});
 S.farm.animals.forEach((a,i)=>list.push({kind:'animal',i,p:a,src:'a/'+ANIMALS[a.k].img+'.png',sz:u*.8}));
 list.sort((a,b)=>a.p.y-b.p.y);box.innerHTML=list.length?'':'<div class="hint">在商店買裝飾，農場會更漂亮！</div>';
 list.forEach(o=>{const e=document.createElement('div');e.className='yi '+o.kind+(ed?' editable':'');const sz=o.sz*(.7+.4*o.p.y);
  const s2=Math.min(sz,H*.95,W*.6);e.style.width=s2+'px';e.style.left=clamp(o.p.x*W-s2/2,0,W-s2)+'px';e.style.top=clamp(o.p.y*H-s2,0,H-s2)+'px';e.innerHTML=`<img src="${o.src}" draggable="false">`;box.appendChild(e);
  dragify(e,box,o.kind==='deco'?st:null,{enabled:()=>YARD_EDIT.on,
   drop:(nx,ny,toStore)=>{if(toStore&&o.kind==='deco'){o.p.st=1;sfx('pop');}else{o.p.x=nx;o.p.y=clamp(ny,.3,1);}save();renderYard();}});
  e.onclick=()=>{if(YARD_EDIT.on)return;initAudio();e.classList.remove('wig');void e.offsetWidth;e.classList.add('wig');
   if(o.kind==='deco'){sfx('voice');farmSellMenu('deco',o.i,null,e);}else{sfx('voice');farmAct('animal',o.i,e);}};});
 if(ed){const items=S.farm.decos.filter(k=>P[k].st);
  st.innerHTML='<div class="sHead">📦 收納箱（點一下拿出來）</div><div class="sRow">'+storeHTML(items.map(k=>({src:'a/'+DECOS[k].img+'.png',name:DECOS[k].name})))+'</div>';
  st.querySelectorAll('.sItem').forEach(b=>b.onclick=()=>{const p=P[items[+b.dataset.si]];p.st=0;p.x=.5;p.y=.8;save();sfx('chime',2);renderYard();});}}
function setYardEdit(on){YARD_EDIT.on=on;$('#fEdit').textContent=on?'✓ 完成':'✋ 佈置';$('#fEdit').classList.toggle('glow',on);
 $('#fStore').classList.toggle('hidden',!on);$('#fTip').classList.toggle('hidden',!on);if(on)setTimeout(()=>scrollWithin($('#fYardSec'),'start'),30);if(!on)save();renderYard();}
$('#fEdit').onclick=()=>{initAudio();setYardEdit(!YARD_EDIT.on);};
{const fb=$('#fBack'),o=fb.onclick;fb.onclick=e=>{if(YARD_EDIT.on)setYardEdit(false);o&&o(e);};}
