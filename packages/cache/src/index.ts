import {readdirSync,lstatSync,unlinkSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
export function pruneCache(directory:string,maxBytes:number,maxAgeDays:number){
 try{
  const files=readdirSync(directory).filter(name=>/^[a-f0-9]{64}\.json$/.test(name)).flatMap(name=>{const path=join(directory,name);try{const s=lstatSync(path);return s.isFile()?[{path,bytes:s.size,date:s.mtimeMs}]:[];}catch{return[];}}).sort((a,b)=>b.date-a.date);
  let total=0;for(const file of files){if(Date.now()-file.date>maxAgeDays*86400000||total+file.bytes>maxBytes)unlinkSync(file.path);else total+=file.bytes;}
 }catch{/* Caches are optional; a failed cleanup must not replace a usable report with failure. */}
}
export class JsonCache {
 constructor(private directory:string,private maxBytes:number,private maxAgeDays:number){mkdirSync(directory,{recursive:true,mode:0o700});pruneCache(directory,maxBytes,maxAgeDays);}
 get<T>(key:string):T|undefined{try{const path=join(this.directory,key+'.json'),s=lstatSync(path);if(!s.isFile()||s.size>Math.min(this.maxBytes,5242880)||Date.now()-s.mtimeMs>this.maxAgeDays*86400000)return;return JSON.parse(readFileSync(path,'utf8'));}catch{return;}}
 set(key:string,data:unknown){
  const path=join(this.directory,key+'.json'),temp=path+'.'+randomUUID();
  try{const value=JSON.stringify(data);if(Buffer.byteLength(value)>Math.min(this.maxBytes,5242880))return;writeFileSync(temp,value,{flag:'wx',mode:0o600});renameSync(temp,path);pruneCache(this.directory,this.maxBytes,this.maxAgeDays);}catch{try{unlinkSync(temp);}catch{}}
 }
}
