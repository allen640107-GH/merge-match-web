/* v2.1.5: daily unique web visitor count via Abacus (free). APK (file:) skipped. Failures never break game. */
(function(){
  const NS='gbg-play';
  const OWNER_KEY='gbg_owner';
  const DAY_KEY='gbg_hit_day';
  const BASE='https://abacus.jasoncameron.dev';

  function twYmd(){
    try{
      return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replace(/-/g,'');
    }catch(e){
      const d=new Date(Date.now()+8*3600*1000);
      return d.toISOString().slice(0,10).replace(/-/g,'');
    }
  }
  function isApk(){
    try{return location.protocol==='file:'||/android_asset/i.test(location.href||'');}catch(e){return false;}
  }
  function markOwnerFromUrl(){
    try{
      const q=new URLSearchParams(location.search||'');
      if(q.get('me')==='1'){localStorage.setItem(OWNER_KEY,'1');}
    }catch(e){}
  }
  function isOwner(){
    try{return localStorage.getItem(OWNER_KEY)==='1';}catch(e){return false;}
  }
  function setOwner(on){
    try{if(on)localStorage.setItem(OWNER_KEY,'1');else localStorage.removeItem(OWNER_KEY);}catch(e){}
  }
  function counterKey(ymd){return 'gbg-'+ymd;}

  function trackVisit(){
    try{
      markOwnerFromUrl();
      if((window.GBGStats&&GBGStats.isApk?GBGStats.isApk:isApk)())return;
      if(isOwner())return;
      const ymd=twYmd();
      if(localStorage.getItem(DAY_KEY)===ymd)return;
      localStorage.setItem(DAY_KEY,ymd);
      const url=BASE+'/hit/'+encodeURIComponent(NS)+'/'+encodeURIComponent(counterKey(ymd));
      fetch(url,{mode:'cors',cache:'no-store'}).catch(function(){});
    }catch(e){}
  }

  function dayKeys(n){
    const out=[];
    const now=Date.now();
    for(let i=0;i<n;i++){
      const d=new Date(now-i*86400000);
      // format each instant in Taipei
      let ymd;
      try{
        ymd=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/-/g,'');
      }catch(e){
        const t=new Date(d.getTime()+8*3600*1000);
        ymd=t.toISOString().slice(0,10).replace(/-/g,'');
      }
      out.push(ymd);
    }
    return out;
  }

  async function fetchDay(ymd){
    const url=BASE+'/get/'+encodeURIComponent(NS)+'/'+encodeURIComponent(counterKey(ymd));
    try{
      const r=await fetch(url,{mode:'cors',cache:'no-store'});
      if(!r.ok)return 0;
      const j=await r.json();
      return (j&&typeof j.value==='number')?j.value:0;
    }catch(e){return 0;}
  }

  async function loadStats(n){
    n=n||30;
    const keys=dayKeys(n);
    const vals=await Promise.all(keys.map(fetchDay));
    const days=keys.map((ymd,i)=>({ymd,count:vals[i]|0}));
    const total=days.reduce((a,d)=>a+d.count,0);
    return {days,total};
  }

  window.GBGStats={
    trackVisit,loadStats,isOwner,setOwner,markOwnerFromUrl,isApk,twYmd,counterKey,NS,OWNER_KEY,DAY_KEY
  };
})();
