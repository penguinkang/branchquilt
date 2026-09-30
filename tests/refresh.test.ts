import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir,hostname} from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {lock,LockBusyError,writeArtifact} from '../packages/generator/src/index.js';
import {runJob} from '../packages/runner/src/index.js';
import {configSchema} from '../packages/schema/src/index.js';
import {fixture} from './fixture.js';
test('refresh skips overlap, rejects live/foreign locks, and only recovers a verified dead local owner',async()=>{
 const root=mkdtempSync(join(tmpdir(),'branchquilt-lock-'));
 try{
  const release=lock(root);assert.throws(()=>lock(root,true),LockBusyError);
  assert.equal((await runJob(root,root,join(root,'output'),configSchema.parse({}),'unused',{skipBusy:true})).status,'skipped');release();
  const path=join(root,'branchquilt/build.lock'),dead=spawnSync(process.execPath,['-e','process.exit(0)']).pid;
  writeFileSync(path,JSON.stringify({pid:dead,host:hostname()}));assert.throws(()=>lock(root),/Abandoned/);lock(root,true)();
  writeFileSync(path,JSON.stringify({pid:dead,host:'another-host'}));assert.throws(()=>lock(root,true),/cannot be verified/);assert(existsSync(path));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('deadline and interruption kill worker process trees and preserve the last report',async()=>{
 const root=mkdtempSync(join(tmpdir(),'branchquilt-deadline-')),assets=join(root,'assets'),out=join(root,'output');mkdirSync(assets);
 try{
  writeArtifact(out,'LAST GOOD');
  writeFileSync(join(assets,'build-worker.cjs'),`const {spawn}=require('node:child_process');const fs=require('node:fs');process.on('message', input=>{fs.writeFileSync(input.staging,'UNPUBLISHED');spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});setInterval(()=>{},1000);});`);
  const config=configSchema.parse({runtime:{timeoutSeconds:1}}),start=Date.now();
  await assert.rejects(()=>runJob(root,root,out,config,assets),/deadline/);assert(Date.now()-start<6000);
  const pending=runJob(root,root,out,configSchema.parse({}),assets);setTimeout(()=>process.emit('SIGTERM'),200);
  await assert.rejects(()=>pending,/interrupted/);
  assert.equal(readFileSync(join(out,'index.html'),'utf8'),'LAST GOOD');assert(!existsSync(join(root,'branchquilt/build.lock')));assert(!readdirSync(join(root,'branchquilt')).some(x=>x.startsWith('run-')));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('refresh republishes freshness, reports stable content digests, and rejects oversized artifacts before publishing',()=>{
 const {root,run}=fixture();
 try{
  const args=[resolve('dist/cli.cjs'),'refresh',root,'--branch','main','--history-days','3650','--json'];
  const first=JSON.parse(execFileSync(process.execPath,args).toString()),second=JSON.parse(execFileSync(process.execPath,args).toString());
  assert(first.changed);assert.equal(second.changed,false);assert.equal(first.contentDigest,second.contentDigest);assert(second.timingsMs.analysis>=0);
  const before=readFileSync(first.output,'utf8');writeFileSync(join(root,'tiny.json'),JSON.stringify({runtime:{maxOutputBytes:1024}}));
  assert.throws(()=>execFileSync(process.execPath,[...args,'--config','tiny.json'],{stdio:'pipe'}));assert.equal(readFileSync(first.output,'utf8'),before);
  run('checkout','main');run('commit','--allow-empty','-m','Metadata-only update');
  assert.equal(JSON.parse(execFileSync(process.execPath,args).toString()).changed,true);
 }finally{rmSync(root,{recursive:true,force:true});}
});
