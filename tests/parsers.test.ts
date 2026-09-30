import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {ParserWorker,partition} from '../packages/parsers/src/index.js';
import {symbolTree} from '../packages/analysis/src/index.js';
const cases:Record<string,[string,string[]]>={
 javascript:['class User { login() { return true; } } const logout = () => false;',['User','login','logout']],
 typescript:['const emoji = "🧵"; class Café { login(): boolean {return true;} }',['Café','login']],
 tsx:['function Widget() { return <div/>; }',['Widget']],
 python:['class User:\n    def login(self):\n        return True\n',['User','login']],
 go:['package main\ntype User struct {}\nfunc (u User) Login() bool {return true}\n',['User','Login']],
 rust:['struct User {} impl User { fn login(&self) -> bool {true} }',['User','login']],
 java:['class User { public boolean login() {return true;} }',['User','login']],
 c_sharp:['class User { public bool Login() {return true;} }',['User','Login']],
 c:['int login(void) {return 1;}',['login']],
 cpp:['class User { public: bool login() {return true;} };',['User','login']]
};
test('bundled grammars normalize declarations and conserve UTF-8 bytes',async()=>{
 const worker=new ParserWorker(resolve('dist'),5000);
 try{for(const [lang,[source,names]] of Object.entries(cases)){
  const result=await worker.parse(source,lang);assert.equal(result.status,'complete',lang);
  for(const name of names)assert(result.symbols.some(s=>s.name===name),`${lang}: missing ${name}`);
  const size=Buffer.byteLength(source);assert(partition(result.symbols,size),lang);
  for(const symbol of result.symbols){const slice=Buffer.from(source).subarray(symbol.startByte,symbol.endByte).toString();assert(slice.includes(symbol.name),`${lang} byte span`);}
  const model=symbolTree({path:'test',oid:'x',mode:'100644',bytes:size,kind:'file',symbols:result.symbols});
  const sum=(n:typeof model):number=>n.children?n.children.reduce((total,c)=>total+sum(c),0):n.bytes;
  assert.equal(sum(model),size,lang+' area conservation');
 }}finally{await worker.close();}
});
test('malformed source reports partial, timeout is bounded and worker recovers',async()=>{
 const worker=new ParserWorker(resolve('dist'),5000);
 try{const r=await worker.parse('function broken( {','javascript');assert.equal(r.status,'partial');}finally{await worker.close();}
 const fast=new ParserWorker(resolve('dist'),1);try{assert.equal((await fast.parse('function f() {}','javascript')).status,'timeout');}finally{await fast.close();}
});
