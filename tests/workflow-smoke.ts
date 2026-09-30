import {fixture} from './fixture.js';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,cpSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const {root}=fixture(),runner=mkdtempSync(join(tmpdir(),'branchquilt-runner-')),version=JSON.parse(readFileSync('package.json','utf8')).version;
try{
 const tool=join(root,'.branchquilt-tool');mkdirSync(tool);copyFileSync(resolve(`work/branchquilt-${version}.tgz`),join(tool,`branchquilt-${version}.tgz`));
 writeFileSync(join(tool,'package.json'),JSON.stringify({name:'branchquilt-automation-tool',private:true,packageManager:'pnpm@9.15.4',dependencies:{branchquilt:`file:./branchquilt-${version}.tgz`}}));
 execFileSync('pnpm',['--dir',tool,'install','--lockfile-only','--ignore-scripts','--ignore-workspace'],{stdio:'pipe'});
 const installed=join(runner,'branchquilt-tool');cpSync(tool,installed,{recursive:true});
 execFileSync('pnpm',['--dir',installed,'install','--frozen-lockfile','--ignore-scripts'],{stdio:'pipe'});
 const result=JSON.parse(execFileSync('pnpm',['--dir',installed,'exec','branchquilt','refresh',root,'--timeout','60','--json'],{stdio:'pipe'}).toString());
 assert.equal(result.status,'success');assert.equal(result.phase,4);assert(readFileSync(result.output,'utf8').includes('BranchQuilt'));
 console.log('Workflow tool smoke passed: vendored tarball, portable frozen lockfile, isolated install, scheduled refresh command.');
}finally{rmSync(root,{recursive:true,force:true});rmSync(runner,{recursive:true,force:true});}
