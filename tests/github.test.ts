import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ingest,inferRepo,GitHubApi} from '../packages/github/src/index.js';
import {configSchema} from '../packages/schema/src/index.js';
import {githubFixture} from './github-fixture.js';
const cfg=configSchema.parse({github:{mode:'required',repo:'team/project',reviewer:'riley'}}).github;
test('normalizes PRs, authors, review SHAs, labels, deletions and lifecycle events',async()=>{
 const g=await ingest(githubFixture(),'team/project',cfg);assert.equal(g.status,'complete');assert.equal(g.pullRequests.length,3);
 const p=g.pullRequests[0];assert.equal(p.author,'alex');assert.deepEqual(p.contributors,['alex','morgan']);assert.notEqual(p.reviews[0].commitOid,p.headOid);assert(p.requested.includes('team:platform'));assert.equal(p.files[1].status,'removed');assert.equal(p.events.length,2);
});
test('caps PR selection and preserves unavailable review state as partial',async()=>{
 const api=githubFixture();const g=await ingest({async get(path){if(path.includes('/reviews?'))throw new Error('denied');return api.get(path);}},'team/project',{...cfg,maxPRs:1});assert.equal(g.status,'partial');assert.equal(g.pullRequests.length,1);assert(g.pullRequests[0].diagnostics.some(d=>d.includes('Reviews unavailable')));
});
test('paginates collections without trusting remote next-link URLs',async()=>{
 const api=githubFixture();let calls=0;
 const g=await ingest({async get(path){if(path.includes('/files?')){calls++;return{data:[{filename:'file-'+calls,status:'modified',additions:1,deletions:0}],more:calls%2===1};}return api.get(path);}},'team/project',{...cfg,maxPRs:1});assert.equal(calls,2);assert.equal(g.pullRequests[0].files.length,2);
});
test('credentials stay host-bound, errors never expose response bodies, and remotes are restricted',async()=>{
 assert.equal(inferRepo('git@github.com:team/project.git'),'team/project');assert.throws(()=>inferRepo('https://other.test/team/project'));
 let url='',headers:any;const api=new GitHubApi('CANARY',async(u,opts)=>{url=String(u);headers=opts?.headers;assert.equal(opts?.redirect,'error');return new Response('PRIVATE RESPONSE',{status:401});});
 await assert.rejects(()=>api.get('/repos/team/project/pulls'),/HTTP 401/);assert.equal(url,'https://api.github.com/repos/team/project/pulls');assert.equal(headers.Authorization,'Bearer CANARY');await assert.rejects(()=>api.get('https://evil.test'),/Invalid/);
 const limited=new GitHubApi(undefined,async()=>new Response('',{status:429,headers:{'retry-after':'60'}}));await assert.rejects(()=>limited.get('/repos/team/project/pulls'),/rate limit/);
});
