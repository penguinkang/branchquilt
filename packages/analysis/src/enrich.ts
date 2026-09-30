import {createHash,randomUUID} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdirSync,renameSync,rmSync,mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {ParserWorker,languageFor,partition,type ParseResult} from '../../parsers/src/index.js';
import {pruneCache} from '../../cache/src/index.js';
import {git,text} from '../../git/src/index.js';
import type {Atlas,Config,Owner} from '../../schema/src/index.js';
const digest=(input:string|Buffer)=>createHash('sha256').update(input).digest('hex');
export async function enrich(root:string,atlas:Atlas,config:Config,assets:string){
 const common=resolve(root,text(root,['rev-parse','--git-common-dir']));
 const cache=join(common,'branchquilt','analysis-v2');if(config.cache.enabled){mkdirSync(cache,{recursive:true,mode:0o700});pruneCache(cache,Math.floor(config.cache.maxBytes/2),config.cache.maxAgeDays);}
 const empty=mkdtempSync(join(tmpdir(),'branchquilt-mailmap-'));writeFileSync(join(empty,'empty'),'');
 const worker=new ParserWorker(assets,config.parsing.timeoutMs);let parsed=0,hits=0,blamed=0;
 const isShallow=text(root,['rev-parse','--is-shallow-repository'])==='true';
 const workerHash=digest(readFileSync(join(assets,'parser-worker.mjs')));
 function cached<T>(key:string):T|undefined{if(!config.cache.enabled)return;try{return JSON.parse(readFileSync(join(cache,key+'.json'),'utf8')) as T;}catch{return;}}
 function save(key:string,value:unknown){if(!config.cache.enabled)return;const path=join(cache,key+'.json'),temp=path+'.'+randomUUID();writeFileSync(temp,JSON.stringify(value),{mode:0o600});renameSync(temp,path);}
 try{for(const snap of atlas.snapshots){
  let mailmap='';try{mailmap=git(root,['show',`${snap.oid}:.mailmap`]).toString();}catch{}
  const mapArgs=['--git-dir='+common,'--work-tree='+empty,'-c','mailmap.file='+join(empty,'empty'),'-c','mailmap.blob='+snap.oid+':.mailmap'];
  const explicit=(name:string,email:string)=>{const rule=config.ownership.identityMappings.find(r=>r.fromEmail.toLowerCase()===email.toLowerCase());return{name:rule?.name??name,email:rule?.toEmail??email};};
  const identityCache=new Map<string,{name:string;id:string}>();
  const identity=(name:string,email:string)=>{
   const key=JSON.stringify([name,email]);const cached=identityCache.get(key);if(cached)return cached;
   let mapped=`${name} <${email}>`;
   try{mapped=execFileSync('git',[...mapArgs,'check-mailmap','--stdin'],{cwd:empty,input:mapped+'\n',encoding:'utf8',stdio:['pipe','pipe','ignore'],timeout:5000}).trim();}catch{}
   const match=mapped.match(/^(.*) <([^<>]+)>$/);const resolved=explicit(match?.[1]??name,match?.[2]??email);const result={name:resolved.name,id:digest(resolved.email.toLowerCase()).slice(0,16)};identityCache.set(key,result);return result;
  };
  const raw=git(root,['log','--format=%H%x00%an%x00%ae%x00',`--max-count=${config.history.maxCommits}`,snap.oid]).toString().split('\0');
  const identities=new Map<string,{name:string;id:string}>();
  for(let i=0;i+2<raw.length;i+=3){const author=identity(raw[i+1],raw[i+2]);identities.set(raw[i].trim(),author);}
  for(const commit of snap.commits){const author=identities.get(commit.oid);if(author){commit.author=author.name;commit.authorId=author.id;}}
  for(const file of snap.files){
   if(file.kind!=='file'||file.bytes>config.parsing.maxFileBytes){file.parseStatus='skipped';file.ownershipStatus='unavailable';continue;}
   const blob=git(root,['cat-file','blob',file.oid]);
   if(blob.includes(0)||blob.subarray(0,120).toString().startsWith('version https://git-lfs.github.com/spec/v1')){file.parseStatus='skipped';file.ownershipStatus='unavailable';continue;}
   let source:string;try{source=new TextDecoder('utf-8',{fatal:true}).decode(blob);}catch{file.parseStatus='skipped';file.ownershipStatus='unavailable';continue;}
   file.lines=source?source.split('\n').length-(source.endsWith('\n')?1:0):0;
   const language=languageFor(file.path);file.language=language;
   if(language){
    const grammarHash=digest(readFileSync(join(assets,'grammars',`tree-sitter-${language}.wasm`)));
    const key=digest(`parse-v2:${file.oid}:${language}:${workerHash}:${grammarHash}:web-tree-sitter-0.25.10`);
    let result=cached<ParseResult>(key);
    if(result&&Array.isArray(result.symbols)&&partition(result.symbols,file.bytes)){hits++;}else{result=await worker.parse(source,language);parsed++;if(result.status==='complete'||result.status==='partial')save(key,result);}
    if(!partition(result.symbols,file.bytes))result={symbols:[],status:'failed'};
    file.symbols=result.symbols;file.parseStatus=result.status;
   }else file.parseStatus='unsupported';
   if(config.ownership.mode==='off'){file.ownershipStatus='unavailable';continue;}
   const key=digest(`blame-v3:${snap.oid}:${file.path}:${mailmap}:${JSON.stringify(config.ownership.identityMappings)}`);
   let lines=cached<{id:string;name:string;line:number;boundary:boolean}[]>(key);
   if(lines&&!Array.isArray(lines))lines=undefined;
   if(!lines){try{
    const output=git(root,[...mapArgs,'blame','--line-porcelain',snap.oid,'--',file.path]).toString();
    lines=[];let author='',email='',line=0,boundary=false;
    for(const row of output.split('\n')){
     if(/^[0-9a-f]{40,64} \d+ \d+/.test(row)){line=Number(row.split(' ')[2]);boundary=false;}
     else if(row.startsWith('author '))author=row.slice(7);
     else if(row.startsWith('author-mail '))email=row.slice(12).replace(/^<|>$/g,'');
     else if(row==='boundary')boundary=true;
     else if(row.startsWith('\t')){const who=explicit(author,email);lines.push({id:digest(who.email.toLowerCase()).slice(0,16),name:who.name,line,boundary});}
    }
    save(key,lines);blamed++;
   }catch{file.ownershipStatus='unavailable';continue;}}
   const known=lines.filter(l=>!(isShallow&&l.boundary));
   const aggregate=(rows:typeof known):Owner[]=>{const map=new Map<string,Owner>();for(const l of rows){const owner=map.get(l.id)??{id:l.id,name:l.name,lines:0};owner.lines++;map.set(l.id,owner);}return [...map.values()].sort((a,b)=>b.lines-a.lines||a.id.localeCompare(b.id));};
   file.owners=aggregate(known);file.ownershipStatus=known.length===file.lines?'complete':'partial';
   for(const symbol of file.symbols??[])symbol.owners=aggregate(known.filter(l=>l.line>=symbol.startLine&&l.line<=symbol.endLine));
  }
 }}finally{await worker.close();rmSync(empty,{recursive:true,force:true});if(config.cache.enabled)pruneCache(cache,Math.floor(config.cache.maxBytes/2),config.cache.maxAgeDays);}
 atlas.diagnostics=atlas.diagnostics.filter(d=>!d.startsWith('Phase 1:'));
 atlas.diagnostics.push(`Phase 4: committed snapshots with optional GitHub review data. Parsed ${parsed} blobs; reused ${hits}; blamed ${blamed} files.`);
}
