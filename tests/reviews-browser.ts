import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(pathToFileURL(resolve('work/demo/index.html')).href);
 await page.getByRole('button',{name:'Close tips'}).click();
 assert.equal(await page.locator('#pr-scope option').count(),4);const src=page.locator('.tile[data-path="src"]');const contributorColor=await src.evaluate(e=>getComputedStyle(e).backgroundColor);await page.locator('#pr-scope').selectOption('42');assert((await src.getAttribute('class'))!.includes('pr-covered'));assert.equal(await src.evaluate(e=>getComputedStyle(e).backgroundColor),contributorColor);const texture=await src.evaluate(e=>getComputedStyle(e,'::after'));assert(texture.backgroundImage.includes('repeating-linear-gradient'));assert.notEqual(texture.animationName,'none');assert((await src.locator('.pr-badge').innerText()).includes('#42'));
 await page.getByRole('button',{name:'Reviews',exact:true}).click();assert.equal(await page.locator('.pr-row').count(),3);
 await page.getByRole('checkbox',{name:'Highlight PR 42',exact:true}).check();await page.getByRole('checkbox',{name:'Highlight PR 43',exact:true}).check();assert(await page.locator('.tile.dim').count()>0);assert(await page.locator('.tile.pr-overlap').count()>0);assert((await page.locator('#pr-scope option:checked').innerText()).includes('2 selected'));
 await page.getByRole('button',{name:'#42 Improve session validation',exact:true}).first().click();assert((await page.locator('#details').innerText()).includes('older head'));
 await page.getByRole('button',{name:'Mark seen locally',exact:true}).click();assert((await page.locator('#details').innerText()).includes('browser only')||(await page.locator('#details').innerText()).includes('session only'));
 await page.keyboard.press('Escape');await page.locator('#review-search').fill('docs');assert.equal(await page.locator('.pr-row').count(),1);
 await page.locator('#review-search').fill('');await page.getByRole('button',{name:'Activity',exact:true}).click();assert.equal(await page.locator('.pr-history').count(),3);
 await page.locator('.time-track button').first().click();assert((await page.locator('#details').innerText()).includes('Lifecycle/review event'));await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.tile.pr-covered').first().evaluate(e=>getComputedStyle(e,'::after').animationName),'none');await page.locator('#branch').selectOption({label:'main'});assert(await page.locator('#pr-scope').isDisabled());assert.equal(await page.locator('.tile.pr-covered').count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await page.screenshot({path:'work/phase3-reviews.png'});
 console.log('Review UI passed: overlapping scopes, queue filtering, old-head approval, local checkpoint, lifecycle selection, offline execution.');
}finally{await browser.close();}
