import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.js';
import {collect} from '../packages/git/src/index.js';
import {enrich} from '../packages/analysis/src/enrich.js';
import {configSchema} from '../packages/schema/src/index.js';
import {writeFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
test('snapshot mailmap controls attribution; dirty mappings are ignored and warm parse cache is reused',async()=>{
 const {root,run}=fixture();try{
 writeFileSync(join(root,'.mailmap'),'Alex Canonical <canonical@example.invalid> <alex-private@example.invalid>\n');run('add','.mailmap');run('commit','-m','Canonical identity');
 writeFileSync(join(root,'.mailmap'),'WRONG <wrong@example.invalid> <alex-private@example.invalid>\n');
 const cfg=configSchema.parse({branches:['team/integration'],history:{days:3650,maxCommits:100}});
 const a=collect(root,cfg,'branchquilt');await enrich(root,a,cfg,resolve('dist'));
 assert(a.snapshots[0].commits.some(c=>c.author==='Alex Canonical'));
 const readme=a.snapshots[0].files.find(f=>f.path==='README.md')!;
 assert.equal(readme.owners?.[0].name,'Alex Canonical');assert.equal(readme.owners?.reduce((n,o)=>n+o.lines,0),readme.lines);assert.equal(readme.ownershipStatus,'complete');
 assert(!JSON.stringify(a).includes('canonical@example.invalid'));assert(!JSON.stringify(a).includes('WRONG'));
 const ts=a.snapshots[0].files.find(f=>f.path==='src/auth.ts')!;assert(ts.symbols?.some(s=>s.name==='login'));assert(ts.symbols?.[0].owners?.length);
 const b=collect(root,cfg,'branchquilt');await enrich(root,b,cfg,resolve('dist'));assert(b.diagnostics.some(d=>d.includes('Parsed 0 blobs')));
 assert.equal(JSON.stringify(a.snapshots[0].files),JSON.stringify(b.snapshots[0].files));
 }finally{rmSync(root,{recursive:true,force:true});}
});
