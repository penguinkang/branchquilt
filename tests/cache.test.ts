import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync,utimesSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {JsonCache,pruneCache} from '../packages/cache/src/index.js';
import {GitHubApi} from '../packages/github/src/index.js';
test('ETags revalidate with auth, preserve pagination, omit private response fields and isolate tokens',async()=>{
 const root=mkdtempSync(join(tmpdir(),'branchquilt-cache-'));
 try{
  const cache=new JsonCache(root,1048576,30),path='/repos/team/project/pulls/1/files?per_page=100&page=1';let count=0;
  const transport:typeof fetch=async(url,options)=>{count++;const h=options?.headers as Record<string,string>;assert.equal(h.Authorization,'Bearer TOKEN_CANARY');
   if(count===1){assert(!h['If-None-Match']);return new Response(JSON.stringify([{filename:'src/a.ts',status:'modified',patch:'PRIVATE_PATCH',body:'PRIVATE_BODY',email:'PRIVATE_EMAIL'}]),{headers:{etag:'"revision-1"',link:'<https://evil.test>; rel="next"'}});}
   assert.equal(h['If-None-Match'],'"revision-1"');return new Response(null,{status:304});
  };
  const api=new GitHubApi('TOKEN_CANARY',transport,cache),first=await api.get(path),second=await api.get(path);
  assert.deepEqual(second,first);assert.equal(second.more,true);assert.equal(api.stats.revalidated,1);
  const saved=readdirSync(root).map(f=>readFileSync(join(root,f),'utf8')).join('');for(const secret of ['TOKEN_CANARY','PRIVATE_PATCH','PRIVATE_BODY','PRIVATE_EMAIL'])assert(!saved.includes(secret));
  await new GitHubApi('OTHER_TOKEN',async(_,options)=>{assert(!(options?.headers as any)['If-None-Match']);return new Response('[]');},cache).get(path);
  await assert.rejects(()=>new GitHubApi('TOKEN_CANARY',async()=>new Response('',{status:401}),cache).get(path),/HTTP 401/);
  const updated=await new GitHubApi('TOKEN_CANARY',async()=>new Response(JSON.stringify([{filename:'src/b.ts',status:'added'}]),{headers:{etag:'"revision-2"'}}),cache).get(path);assert.equal(updated.data[0].filename,'src/b.ts');
  if(process.platform!=='win32')for(const name of readdirSync(root))assert.equal(statSync(join(root,name)).mode&0o777,0o600);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('cache eviction bounds bytes and age without touching unrelated files',()=>{
 const root=mkdtempSync(join(tmpdir(),'branchquilt-prune-'));
 try{writeFileSync(join(root,'keep.txt'),'keep');for(let i=0;i<3;i++){const path=join(root,String(i).repeat(64)+'.json');writeFileSync(path,'x'.repeat(100));utimesSync(path,new Date(1000+i),new Date(1000+i));}pruneCache(root,100,365);assert.deepEqual(readdirSync(root),['keep.txt']);
 const cache=new JsonCache(root,120,30);cache.set('a'.repeat(64),{x:'a'.repeat(60)});cache.set('b'.repeat(64),{x:'b'.repeat(60)});assert.equal(readdirSync(root).filter(f=>f.endsWith('.json')).length,1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
