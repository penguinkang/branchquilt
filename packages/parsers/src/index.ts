import {Worker} from 'node:worker_threads';
import {join,extname} from 'node:path';
import type {SymbolNode} from '../../schema/src/index.js';
export const extensions:Record<string,string>={'.js':'javascript','.jsx':'javascript','.mjs':'javascript','.cjs':'javascript','.ts':'typescript','.tsx':'tsx','.py':'python','.go':'go','.rs':'rust','.java':'java','.cs':'c_sharp','.c':'c','.h':'c','.cpp':'cpp','.cc':'cpp','.cxx':'cpp','.hpp':'cpp'};
export const languageFor=(path:string)=>extensions[extname(path).toLowerCase()];
export interface ParseResult {symbols:SymbolNode[];status:'complete'|'partial'|'failed'|'timeout';}
export class ParserWorker {
 private worker?:Worker;
 constructor(private assets:string,private timeoutMs=2000){}
 async parse(source:string,language:string):Promise<ParseResult>{
  this.worker??=new Worker(join(this.assets,'parser-worker.mjs'),{workerData:{grammars:join(this.assets,'grammars')}});
  const worker=this.worker;
  return new Promise(resolve=>{
   const done=(result:ParseResult)=>{clearTimeout(timer);worker.removeAllListeners('message');worker.removeAllListeners('error');resolve(result);};
   const timer=setTimeout(()=>{void worker.terminate();this.worker=undefined;done({symbols:[],status:'timeout'});},this.timeoutMs);
   worker.once('message',done);worker.once('error',()=>{void worker.terminate();this.worker=undefined;done({symbols:[],status:'failed'});});worker.postMessage({source,language,id:1});
  });
 }
 async close(){await this.worker?.terminate();this.worker=undefined;}
}
export function partition(symbols:SymbolNode[],size:number):boolean{
 const ids=new Map(symbols.map(s=>[s.id,s]));
 for(const s of symbols){if(s.startByte<0||s.endByte>size||s.endByte<s.startByte)return false;s.exclusiveBytes=s.endByte-s.startByte;}
 const groups=new Map<string,SymbolNode[]>();
 for(const s of symbols){const key=s.parentId??'';const group=groups.get(key)??[];group.push(s);groups.set(key,group);}
 for(const [id,children] of groups){children.sort((a,b)=>a.startByte-b.startByte);let end=id?ids.get(id)?.startByte??0:0;
  const parent=id?ids.get(id):undefined;if(id&&!parent)return false;
  for(const child of children){if(child.startByte<end||(parent&&child.endByte>parent.endByte))return false;end=child.endByte;if(parent)parent.exclusiveBytes!-=child.endByte-child.startByte;}
 }
 return true;
}
