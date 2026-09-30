import {fixture} from './fixture.js';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {writeFileSync,rmSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {root}=fixture();
try{
 writeFileSync(join(root,'package.json'),JSON.stringify({name:'branchquilt-consumer',private:true}));
 execFileSync('pnpm',['add','--ignore-scripts','-D',resolve('work/branchquilt-0.4.0-alpha.1.tgz')],{cwd:root,stdio:'pipe'});
 const result=JSON.parse(execFileSync('pnpm',['exec','branchquilt','refresh','.','--branch','main','--branch','team/integration','--history-days','3650','--json'],{cwd:root,stdio:'pipe'}).toString());
 assert.equal(result.snapshots,2);const html=readFileSync(result.output,'utf8');const data=JSON.parse(html.split('<script id="atlas-data" type="application/json">')[1].split('</script>')[0]);assert(data.snapshots[0].files.some((f:any)=>f.parseStatus==='complete'&&f.symbols?.length));assert(data.snapshots[0].files.some((f:any)=>f.ownershipStatus==='complete'));
 console.log('Packed install passed: clean pnpm consumer, executable bin, bundled offline viewer, two snapshots.');
}finally{rmSync(root,{recursive:true,force:true});}
