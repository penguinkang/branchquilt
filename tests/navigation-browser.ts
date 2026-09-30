import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(resolve('work/demo/index.html')).href);
 await page.getByRole('button',{name:'src/',exact:true}).click();assert((await page.locator('#breadcrumbs').innerText()).includes('src'));
 await page.getByRole('button',{name:'auth.ts',exact:true}).click();assert(await page.getByRole('button',{name:'Session',exact:true}).isVisible());
 await page.getByRole('button',{name:'Session',exact:true}).hover();assert((await page.locator('#object-tooltip').innerText()).includes('src/auth.ts → Session'));
 await page.getByRole('button',{name:'Session',exact:true}).click();assert(await page.getByRole('button',{name:'login',exact:true}).isVisible());
 await page.getByRole('button',{name:'login',exact:true}).hover();assert((await page.locator('#object-tooltip').innerText()).includes('Session → login'));
 await page.getByRole('button',{name:'login',exact:true}).click();assert(await page.getByRole('button',{name:'normalize',exact:true}).isVisible());
 await page.locator('#breadcrumbs').getByRole('button',{name:'Session',exact:true}).click();assert(await page.getByRole('button',{name:'logout',exact:true}).isVisible());
 const linear=await page.locator('.tile').evaluateAll(es=>es.map(e=>Number((e as HTMLElement).dataset.weight)));
 await page.locator('#size-scale').selectOption('log');const log=await page.locator('.tile').evaluateAll(es=>es.map(e=>Number((e as HTMLElement).dataset.weight)));assert.notDeepEqual(log,linear);
 await page.locator('#size-mode').selectOption('bytes');assert((await page.locator('#legend').innerText()).includes('log(1 + value) bytes'));
 await page.locator('#breadcrumbs').getByRole('button',{name:'Repository',exact:true}).click();await page.locator('#compare').selectOption('1');
 await page.locator('.pane').first().getByRole('button',{name:'src/',exact:true}).click();await page.locator('.pane').first().getByRole('button',{name:'auth.ts',exact:true}).click();assert.equal(await page.locator('.pane').count(),1);assert(await page.getByRole('button',{name:'Session',exact:true}).isVisible());
 await page.getByRole('button',{name:'Session',exact:true}).click();await page.getByRole('button',{name:'login',exact:true}).hover();await page.screenshot({path:'work/navigation-preview.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('Navigation passed: click drilldown, nested breadcrumbs, full-name hover, count/log/byte weights, comparison handoff and mobile width.');
}finally{await browser.close();}
