// validates every level's goals are achievable: gem colors < colors, tiers <=3/4, obstacles exist in map
const fs=require('fs'),vm=require('vm');const dir=process.argv[2],max=+process.argv[3]||200;
const src=fs.readFileSync(dir+'/game.js','utf8');const lv=fs.existsSync(dir+'/levels.js')?fs.readFileSync(dir+'/levels.js','utf8'):'';
const m=src.match(/function levelDef\(n\)\{[\s\S]*?\n\}/);const ctx={};vm.createContext(ctx);
vm.runInContext(lv?lv:m[0],ctx);let bad=0;
for(let n=1;n<=max;n++){const L=ctx.levelDef(n);for(const g of L.goals){
 let ok=true;if(g.k==='gem')ok=g.c>=0&&g.c<L.colors&&g.n>0;
 else if(g.k==='tier')ok=g.t>=1&&g.t<=4&&g.n>0;
 else if(L.map){const f=L.map.flat();const cnt=s=>f.filter(x=>s.includes(x)).length;const have={ice:cnt('iI'),crate:cnt('cC'),vine:cnt('v'),acorn:cnt('a')}[g.k];ok=g.n>0&&(have===undefined||(g.k==='acorn'?true:have>=g.n));}
 if(!ok){bad++;console.log('BAD',n,JSON.stringify(g),'colors',L.colors);}}}
console.log(bad?'FAIL '+bad:'PASS all '+max+' levels');process.exit(bad?1:0);
