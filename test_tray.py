import asyncio,sys,json
from playwright.async_api import async_playwright
from test import DEV,tap
URL=sys.argv[1];OUT=sys.argv[2];TAG=sys.argv[3]
async def run(p,name,eng,w,h,dpr):
    br=await p.chromium.launch(executable_path='/opt/google/chrome/chrome')
    ctx=await br.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,is_mobile=True,has_touch=True)
    pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));cdp=await ctx.new_cdp_session(pg)
    await pg.goto(URL);await pg.evaluate('''()=>{const s=JSON.parse(localStorage.getItem("gbg_save_v1")||"{}");Object.assign(s,{char:"fox",level:2,tray:[0,1,2,3,4,5],energy:0,tutMerge:true,daily:{last:new Date().toDateString(),streak:1}});localStorage.setItem("gbg_save_v1",JSON.stringify(s))}''')
    await pg.reload();await pg.wait_for_timeout(1200)
    await tap(pg,cdp,'#btnStart');await pg.wait_for_timeout(1200)
    if await pg.locator('#select.show').count(): await tap(pg,cdp,'.card:nth-child(1) button');await pg.wait_for_timeout(800)
    await tap(pg,cdp,'#btnPlay');await pg.wait_for_timeout(2500)
    if await pg.locator('#ciGo').count(): await tap(pg,cdp,'#ciGo');await pg.wait_for_timeout(1500)
    await pg.evaluate('()=>{__G.S.tray.splice(0,6,0,1,2,3,4,5);renderTray()}')
    g0=await pg.evaluate('__G.S.garden.length')
    await pg.evaluate('addEnergy(seedCost())');await pg.wait_for_timeout(900)
    R={'autoplant_tray':await pg.evaluate('__G.S.tray.slice()'),'garden+':await pg.evaluate('__G.S.garden.length')-g0}
    await tap(pg,cdp,'#slots > div:nth-child(4)');await pg.wait_for_timeout(500);await pg.screenshot(path=f'{OUT}{TAG}_{name}_traymenu.png')
    await tap(pg,cdp,'#tPlant');await pg.wait_for_timeout(500);R['after_plant']=await pg.evaluate('__G.S.tray.slice()')
    await tap(pg,cdp,'#slots > div:nth-child(5)');await pg.wait_for_timeout(400);await tap(pg,cdp,'#tSell');await pg.wait_for_timeout(400)
    R['after_sell']=await pg.evaluate('__G.S.tray.slice()');R['modalClosed']=await pg.locator('#modal.show').count()==0
    mv=await pg.evaluate('__G.findMove()');R['canPlay']=bool(mv) and not await pg.evaluate('__G.busy')
    await pg.screenshot(path=f'{OUT}{TAG}_{name}_trayfreed.png');R['errs']=errs
    ok=R['autoplant_tray'].count(-1)==0 and R['autoplant_tray'][0]==0 and R['garden+']>=1 and R['after_plant'][3]==-1 and R['after_sell'][4]==-1 and R['modalClosed'] and R['canPlay'] and not errs
    print(('PASS ' if ok else 'FAIL ')+name,json.dumps(R));await br.close()
async def main():
    async with async_playwright() as p:
        for d in DEV: await run(p,*d)
asyncio.run(main())
