import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boxWeight,tree,symbolTree} from '../packages/analysis/src/index.js';
import type {Entry} from '../packages/schema/src/index.js';
test('child weights count immediate contents, keep leaves visible and compress variation with log scale',()=>{
 const files:Entry[]=[{path:'a/one.ts',oid:'a',mode:'100644',bytes:100,kind:'file',symbols:[{id:'class',name:'LargeClass',kind:'class',startByte:0,endByte:100,startLine:1,endLine:3},{id:'method',parentId:'class',name:'method',kind:'method',startByte:20,endByte:50,startLine:2,endLine:2}]},{path:'a/two',oid:'b',mode:'100644',bytes:0,kind:'file'}];
 const dir=tree(files).children![0];assert.equal(boxWeight(dir,files,'children','linear'),2);
 assert.equal(boxWeight(dir.children![1],files,'children','linear'),1);
 const cls=symbolTree(files[0]).children![0];assert.equal(boxWeight(cls,files,'children','linear'),1,'residual code does not count as a declaration');
 const large={name:'large',path:'large',bytes:100,children:Array.from({length:100},(_,i)=>({name:String(i),path:'large/'+i,bytes:1}))};
 assert.equal(boxWeight(large,files,'children','linear'),100);
 assert(boxWeight(large,files,'children','log')/boxWeight(dir,files,'children','log')<100/2);
 assert.equal(boxWeight(dir,files,'bytes','linear'),100);
});
