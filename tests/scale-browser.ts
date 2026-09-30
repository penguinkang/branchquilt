import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {renderHtml} from '../packages/generator/src/index.js';
import type {Atlas} from '../packages/schema/src/index.js';
const atlas:Atlas={schemaVersion:'0.1.0',repository:'Scale fixture',generatedAt:'2020-01-01T00:00:00Z',staleAfterMinutes:60,refs:[],diagnostics:[],excluded:0,comparisons:{},snapshots:[{id:'main:fixture',ref:'main',oid:'a'.repeat(40),commits:[],historyTruncated:false,files:Array.from({length:10000},(_,i)=>({path:`file-${String(i).padStart(5,'0')}.txt`,oid:'b'.repeat(40),bytes:i+1,mode:'100644',kind:'file'}))}]};
atlas.github={repo:'fixture/scale',fetchedAt:atlas.generatedAt,status:'complete',pullRequests:Array.from({length:50},(_,i)=>({number:i+1,title:`Review ${i+1}`,url:`https://github.com/fixture/scale/pull/${i+1}`,author:`Reviewer ${i%10}`,authorId:(i%10).toString(16).padStart(16,'0'),state:'open',draft:false,baseRef:'main',headRef:`team/${i}`,baseOid:'a'.repeat(40),headOid:'b'.repeat(40),createdAt:atlas.generatedAt,updatedAt:atlas.generatedAt,labels:['fixture'],requested:['riley'],contributors:[`Reviewer ${i%10}`],files:[{path:`file-${String(i).padStart(5,'0')}.txt`,status:'modified',additions:1,deletions:1}],reviews:[],events:Array.from({length:300},(_,j)=>({id:`${i}-${j}`,kind:'labeled',actor:'riley',date:new Date(Date.parse(atlas.generatedAt)+j*60000).toISOString()})),completeness:'complete',diagnostics:[]}))};
mkdirSync('work',{recursive:true});const path=resolve('work/scale.html');writeFileSync(path,renderHtml(atlas,resolve('dist')));
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'}),errors:string[]=[],requests:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 const start=performance.now();await page.goto(pathToFileURL(path).href);await page.waitForSelector('.map-limit',{state:'attached'});const loadMs=Math.round(performance.now()-start);
 assert(loadMs<10000,'10k-file initial load exceeded 10s budget');assert(await page.locator('.tile').count()>0&&await page.locator('.tile').count()<=500);assert((await page.locator('#freshness').textContent())?.includes('Stale report'));
 await page.mouse.move(700,450);await page.waitForFunction(()=>getComputedStyle(document.querySelector('.topbar')!).opacity==='0');
 await page.keyboard.press('Tab');assert.equal(await page.locator('.topbar').evaluate(e=>getComputedStyle(e).opacity),'1');
 const searchStart=performance.now();for(let i=0;i<5;i++)await page.keyboard.press('Tab');await page.keyboard.press('Enter');await page.locator('#search').fill('file-00000.txt');await page.locator('#file-list').getByRole('button',{name:'file-00000.txt',exact:true}).click();const searchMs=Math.round(performance.now()-searchStart);
 assert(searchMs<5000,'10k-file search exceeded 5s budget');assert((await page.locator('#details').innerText()).includes('file-00000.txt'));
 await page.keyboard.press('Escape');assert(await page.locator('#inspector').isHidden());await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));
 assert.equal(await page.locator('.pr-row').count(),50);assert.equal(await page.locator('.time-track button').count(),2000);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 const result={files:10000,prs:50,eventsPerPR:300,loadMs,searchMs,tiles:await page.locator('.tile').count(),browser:'Chromium',platform:process.platform};writeFileSync('work/scale-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
