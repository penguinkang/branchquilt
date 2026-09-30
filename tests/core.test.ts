import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fixture} from './fixture.js';
import {collect} from '../packages/git/src/index.js';
import {configSchema,validateAtlas} from '../packages/schema/src/index.js';
import {tree,unionFiles,change} from '../packages/analysis/src/index.js';
import {safeOutput,renderHtml,writeArtifact} from '../packages/generator/src/index.js';
const config=configSchema.parse({branches:['main','team/integration'],history:{days:3650,maxCommits:50}});
test('reads immutable refs, exclusions, hostile paths and bounded history without checkout mutations',()=>{
 const {root,run}=fixture();try{
 const before=[run('rev-parse','HEAD'),run('status','--porcelain'),run('config','--local','--list')];
 const a=collect(root,config,'branchquilt');validateAtlas(a);
 assert.equal(a.snapshots.length,2);assert.equal(a.snapshots[0].files.find(f=>f.path==='src/auth.ts')!.bytes,492);
 assert(a.snapshots[0].files.some(f=>f.path==='line\nbreak.txt'));
 assert(!a.snapshots[1].files.some(f=>f.path==='.env'||f.path==='untracked.txt'));
 assert.equal(a.comparisons['0:1'][0].newPath,'src/query.ts');
 assert.equal(a.snapshots[1].commits[0].author,'Morgan');assert(a.snapshots[1].commits[0].paths.includes('src/review.ts'));
 assert.deepEqual([run('rev-parse','HEAD'),run('status','--porcelain'),run('config','--local','--list')],before);
 const html=renderHtml(a,resolve('dist'));assert(!html.includes('alex-private@example.invalid'));assert(!html.includes('SECRET_CANARY'));assert(!html.includes('</script><script>alert'));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('union capacity conserves bytes and mode changes are visible',()=>{
 const file={path:'src/a',oid:'x',mode:'100644',bytes:100,kind:'file' as const};
 const union=unionFiles([file],[{...file,bytes:200},{...file,path:'src/b',bytes:50}]);
 assert.equal(tree(union).bytes,250);assert.equal(change(file,{...file,mode:'100755'}),'modified');assert.equal(change(file,undefined),'removed');
});
test('output refuses traversal, symlink paths and unrelated index; failed generation preserves output',()=>{
 const root=mkdtempSync(join(tmpdir(),'branchquilt-safety-'));try{
 assert.throws(()=>safeOutput(root,'../escape'));assert.throws(()=>safeOutput(root,'.'));assert.throws(()=>safeOutput(root,'.git/report'));
 if(process.platform!=='win32'){symlinkSync(tmpdir(),join(root,'link'));assert.throws(()=>safeOutput(root,'link/report'));}
 const out=safeOutput(root,'report');writeArtifact(out,'good');assert.equal(readFileSync(join(out,'index.html'),'utf8'),'good');
 writeFileSync(join(out,'.branchquilt-output'),'other');assert.throws(()=>writeArtifact(out,'bad'));assert.equal(readFileSync(join(out,'index.html'),'utf8'),'good');
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('CLI generates a real standalone artifact and rejects invalid required capability',()=>{
 const {root}=fixture();try{
 const args=[resolve('dist/cli.cjs'),'build',root,'--branch','main','--branch','team/integration','--history-days','3650','--json'];
 const result=JSON.parse(execFileSync(process.execPath,args).toString());assert.equal(result.status,'success');assert.equal(result.snapshots,2);
 assert(readFileSync(result.output,'utf8').includes('BranchQuilt'));
 assert.throws(()=>execFileSync(process.execPath,[...args,'--github','required'],{stdio:'pipe'}));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('config rejects unknown keys and invalid limits',()=>{assert.throws(()=>configSchema.parse({secretToken:'no'}));assert.throws(()=>configSchema.parse({history:{maxCommits:0}}));});
