import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import type { Atlas, Commit, Config, Entry } from '../../schema/src/index.js';
export function git(root:string,args:string[]):Buffer {
  try{return execFileSync('git',['-c','core.quotepath=false','-c','core.fsmonitor=false','-c','core.hooksPath=/dev/null',...args],{cwd:root,env:{...process.env,GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1'},timeout:30000,maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});}
  catch{throw new Error(`Git ${args[0]} failed. Check repository, refs, available history, and Git installation.`);}
}
export const text=(root:string,args:string[])=>git(root,args).toString('utf8').trim();
export const repositoryRoot=(path:string)=>text(path,['rev-parse','--show-toplevel']);
function resolveRef(root:string,ref:string):string{
  if(ref.startsWith('-')||/[\x00-\x20]/.test(ref))throw new Error('Invalid branch reference');
  return text(root,['rev-parse','--verify','--end-of-options',`${ref}^{commit}`]);
}
function excluded(path:string,output:string,patterns:string[]):boolean{
  const segments=path.split('/');
  if(segments.some(x=>['.git','.branchquilt-tool','node_modules','vendor','dist','build','.next','.cache'].includes(x)||/^\.env(?:\.|$)/.test(x)||/^(id_rsa|id_ed25519|credentials\.json)$/.test(x))||/\.(pem|key|p12|pfx)$/.test(path))return true;
  if(path===output||path.startsWith(output+'/'))return true;
  return patterns.some(pattern=>{
    const escaped=pattern.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*\*/g,'\u0001').replace(/\*/g,'[^/]*').replace(/\?/g,'[^/]').replace(/\u0001\//g,'(?:.*/)?').replace(/\u0001/g,'.*');
    return new RegExp('^'+escaped+'$').test(path);
  });
}
export function collect(root:string,config:Config,outputRelative:string):Atlas{
  const diagnostics=['Phase 1: local committed files and commit activity only. Symbols, blame, GitHub PRs, and scheduled refresh are not implemented.'];
  if(text(root,['status','--porcelain']).length)diagnostics.push('Working tree changes and untracked files are excluded.');
  if(text(root,['rev-parse','--is-shallow-repository'])==='true')diagnostics.push('Shallow repository: history and change scopes may be incomplete.');
  const atlas:Atlas={schemaVersion:'0.1.0',repository:basename(root),generatedAt:new Date().toISOString(),snapshots:[],refs:[],diagnostics,excluded:0,comparisons:{}};
  const refs=text(root,['for-each-ref','--format=%(refname:short)%09%(objectname)','refs/heads','refs/remotes']).split('\n').filter(Boolean);
  if(refs.length>500)diagnostics.push('Branch catalog limited to 500 refs.');
  atlas.refs=refs.slice(0,500).map(x=>{const [ref,oid]=x.split('\t');return{ref,oid};});
  const resolved=[...new Set(config.branches)].map(ref=>({ref,oid:resolveRef(root,ref)}));
  for(const {ref,oid} of resolved){
    const files:Entry[]=[];
    for(const record of git(root,['ls-tree','-r','-l','-z',oid]).toString('utf8').split('\0').filter(Boolean)){
      const tab=record.indexOf('\t'),path=record.slice(tab+1),[mode,type,blob,size]=record.slice(0,tab).trim().split(/\s+/);
      if(excluded(path,outputRelative,config.exclude)){atlas.excluded++;continue;}
      files.push({path,oid:blob,mode,bytes:type==='blob'?Number(size):0,kind:mode==='120000'?'symlink':mode==='160000'?'submodule':'file'});
    }
    const raw=git(root,['log','--topo-order',`--since=${config.history.days} days ago`,`--max-count=${config.history.maxCommits+1}`,'--format=%H%x00%P%x00%an%x00%ae%x00%cI%x00%s%x00',oid]).toString('utf8').split('\0');
    const commits:Commit[]=[];
    for(let i=0;i+5<raw.length;i+=6){
      const hash=raw[i].trim();if(!hash)continue;
      const parents=raw[i+1].split(' ').filter(Boolean);let paths:string[]=[],scopeComplete=true;
      try{paths=git(root,['diff-tree','--root','--no-commit-id','--name-only','-r','-z','--no-ext-diff','--no-textconv',...(parents.length?[parents[0],hash]:[hash])]).toString('utf8').split('\0').filter(x=>x&&!excluded(x,outputRelative,config.exclude));}catch{scopeComplete=false;}
      commits.push({oid:hash,parents,author:raw[i+2],authorId:createHash('sha256').update(raw[i+3].toLowerCase()).digest('hex').slice(0,16),date:raw[i+4],subject:raw[i+5],paths,scopeComplete,merge:parents.length>1});
    }
    atlas.snapshots.push({id:ref+':'+oid,ref,oid,files,commits:commits.slice(0,config.history.maxCommits),historyTruncated:commits.length>config.history.maxCommits});
  }
  for(let a=0;a<atlas.snapshots.length;a++)for(let b=a+1;b<atlas.snapshots.length;b++){
    const A=atlas.snapshots[a],B=atlas.snapshots[b];
    const items=git(root,['diff','--name-status','-z','--find-renames=50%','--no-ext-diff','--no-textconv',A.oid,B.oid,'--']).toString('utf8').split('\0');
    const renames:{oldPath:string;newPath:string}[]=[];
    for(let i=0;i<items.length&&items[i];){const status=items[i++],oldPath=items[i++];if(status.startsWith('R')||status.startsWith('C')){const newPath=items[i++];if(!excluded(oldPath,outputRelative,config.exclude)&&!excluded(newPath,outputRelative,config.exclude))renames.push({oldPath,newPath});}}
    atlas.comparisons[`${a}:${b}`]=renames;
  }
  return atlas;
}
