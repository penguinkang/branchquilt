import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {JsonCache} from '../../cache/src/index.js';
import {text} from '../../git/src/index.js';
import type {Atlas,Config,PullRequest} from '../../schema/src/index.js';
export interface Api {get(path:string):Promise<{data:any;more:boolean}>;}
export class GitHubApi implements Api {
 readonly stats={requests:0,revalidated:0};
 constructor(private token:string|undefined,private transport:typeof fetch=fetch,private cache?:JsonCache){}
 async get(path:string){
  if(!path.startsWith('/repos/')||path.includes('://'))throw new Error('Invalid GitHub API path');
  const key=createHash('sha256').update('github-v1:'+String(this.token??'public')+':'+path).digest('hex');
  const cached=this.cache?.get<{etag:string;data:any;more:boolean}>(key);
  for(let attempt=0;attempt<3;attempt++){
   let response:Response;
   this.stats.requests++;
   try{response=await this.transport('https://api.github.com'+path,{method:'GET',redirect:'error',headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'BranchQuilt',...(cached?.etag?{'If-None-Match':cached.etag}:{}),...(this.token?{Authorization:`Bearer ${this.token}`}:{})},signal:AbortSignal.timeout(20000)});}catch{throw new Error('GitHub connection failed or timed out.');}
   if(response.status===429||response.status>=500||(response.status===403&&(response.headers.has('retry-after')||response.headers.get('x-ratelimit-remaining')==='0'))){
    const seconds=Number(response.headers.get('retry-after')??2**attempt);
    if(attempt===2||seconds>10)throw new Error('GitHub rate limit or temporary failure; retry later.');
    await new Promise(r=>setTimeout(r,(Math.max(1,seconds)+Math.random())*1000));continue;
   }
   if(response.status===304&&cached){this.stats.revalidated++;return {data:cached.data,more:cached.more};}
   if(!response.ok)throw new Error(`GitHub returned HTTP ${response.status}. Check repository access and read permissions.`);
   const data=sanitize(path,await response.json()),more=/rel="next"/.test(response.headers.get('link')??'');
   const etag=response.headers.get('etag');if(etag)this.cache?.set(key,{etag,data,more});return{data,more};
  }
  throw new Error('GitHub request failed.');
 }
}
export function inferRepo(remote:string):string{
 const match=remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
 if(!match)throw new Error('Set --github-repo owner/repo or use an origin remote on github.com.');return match[1];
}
async function pages(api:Api,path:string,limit:number){
 const all:any[]=[];let more=true,page=1;
 while(more&&all.length<limit){const r=await api.get(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page++}`);if(!Array.isArray(r.data))throw new Error('Unexpected GitHub collection response.');all.push(...r.data);more=r.more;}
 return {data:all.slice(0,limit),truncated:more||all.length>limit};
}
export async function ingest(api:Api,repo:string,config:Config['github']):Promise<NonNullable<Atlas['github']>>{
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error('Invalid repository name');
 const base='/repos/'+repo;
 const listing=await pages(api,`${base}/pulls?state=${config.state}&sort=updated&direction=desc`,config.maxPRs);
 const prs:PullRequest[]=[];let partial=listing.truncated;
 for(const summary of listing.data){
  if(!Number.isInteger(summary.number)||summary.number<1)throw new Error('Invalid PR number in GitHub response');
  const route=`${base}/pulls/${summary.number}`,p=(await api.get(route)).data;
  const pr:PullRequest={number:summary.number,title:String(p.title??''),url:`https://github.com/${repo}/pull/${summary.number}`,author:String(p.user?.login??'Deleted user'),authorId:createHash('sha256').update('github:'+String(p.user?.id??'unknown')).digest('hex').slice(0,16),state:p.merged_at?'merged':String(p.state),draft:!!p.draft,baseRef:String(p.base?.ref??''),headRef:String(p.head?.ref??''),baseOid:String(p.base?.sha??''),headOid:String(p.head?.sha??''),createdAt:String(p.created_at??''),updatedAt:String(p.updated_at??''),labels:(p.labels??[]).map((x:any)=>String(x.name)),requested:[],contributors:[],files:[],reviews:[],events:[],completeness:'complete',diagnostics:[]};
  async function optional(label:string,fn:()=>Promise<void>){try{await fn();}catch{pr.completeness='partial';pr.diagnostics.push(`${label} unavailable; check access or API limits.`);}}
  await optional('Changed files',async()=>{const r=await pages(api,route+'/files',3000);pr.files=r.data.map(f=>({path:String(f.filename),oldPath:f.previous_filename?String(f.previous_filename):undefined,status:String(f.status),additions:Number(f.additions??0),deletions:Number(f.deletions??0)}));if(r.truncated||pr.files.length!==p.changed_files){pr.completeness='partial';pr.diagnostics.push('Changed-file coverage is incomplete.');}});
  await optional('Reviews',async()=>{const r=await pages(api,route+'/reviews',1000);pr.reviews=r.data.filter(r=>r.submitted_at).map(r=>({author:String(r.user?.login??'Deleted user'),state:String(r.state),commitOid:String(r.commit_id??''),date:String(r.submitted_at)}));if(r.truncated){pr.completeness='partial';pr.diagnostics.push('Reviews capped at 1000.');}});
  await optional('Review requests',async()=>{const r=(await api.get(route+'/requested_reviewers')).data;pr.requested=[...(r.users??[]).map((u:any)=>String(u.login)),...(r.teams??[]).map((t:any)=>'team:'+String(t.slug))];});
  await optional('Contributors',async()=>{const r=await pages(api,route+'/commits',250);pr.contributors=[...new Set<string>(r.data.map(c=>String(c.author?.login??c.commit?.author?.name??'Unknown')))];if(r.truncated||r.data.length!==p.commits){pr.completeness='partial';pr.diagnostics.push('Commit contributor list may be incomplete.');}});
  await optional('Timeline',async()=>{const r=await pages(api,`${base}/issues/${pr.number}/timeline`,1000);const allowed=new Set(['review_requested','review_request_removed','review_dismissed','merged','closed','reopened','ready_for_review','convert_to_draft','head_ref_force_pushed','labeled','unlabeled']);pr.events=r.data.filter(e=>allowed.has(e.event)).map(e=>({id:String(e.id),kind:String(e.event),actor:String(e.actor?.login??'Unknown'),date:String(e.created_at??'')}));if(r.truncated){pr.completeness='partial';pr.diagnostics.push('Timeline capped at 1000 events.');}});
  if(pr.completeness==='partial')partial=true;prs.push(pr);
 }
 return {repo,fetchedAt:new Date().toISOString(),status:partial?'partial':'complete',truncated:listing.truncated,reviewer:config.reviewer,pullRequests:prs};
}
export async function enrichGitHub(root:string,atlas:Atlas,config:Config){
 if(config.github.mode==='off')return;
 const token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
 if(config.github.mode==='auto'&&!token){atlas.diagnostics.push('GitHub skipped: no token available in auto mode.');return;}
 let repo=config.github.repo??'';
 try{repo||=inferRepo(text(root,['remote','get-url','origin']));const common=resolve(root,text(root,['rev-parse','--git-common-dir']));const cache=config.cache.enabled?new JsonCache(join(common,'branchquilt','github-v1'),Math.floor(config.cache.maxBytes/2),config.cache.maxAgeDays):undefined;const api=new GitHubApi(token,fetch,cache);atlas.github=await ingest(api,repo,config.github);atlas.diagnostics.push(`GitHub: ${api.stats.requests} requests; ${api.stats.revalidated} unchanged responses reused.`);if(atlas.github.status==='partial')atlas.diagnostics.push('GitHub data is partial; inspect PR diagnostics.');}
 catch(e){if(config.github.mode==='required')throw e;atlas.github={repo,fetchedAt:new Date().toISOString(),status:'unavailable',pullRequests:[]};atlas.diagnostics.push('GitHub enrichment unavailable; no empty-review conclusion can be drawn.');}
}

// Only fields consumed by ingestion enter the cache. Never persist bodies, patches or emails.
function sanitize(path:string,data:any):any {
 const pick=(value:any,keys:string[])=>Object.fromEntries(keys.filter(k=>value?.[k]!==undefined).map(k=>[k,value[k]]));
 const user=(u:any)=>pick(u,['id','login']);
 const clean=(p:any)=>({...pick(p,['number','title','state','draft','merged_at','created_at','updated_at','changed_files','commits']),user:user(p.user),base:pick(p.base,['ref','sha']),head:pick(p.head,['ref','sha']),labels:(p.labels??[]).map((l:any)=>pick(l,['name']))});
 const route=path.split('?')[0];
 if(route.endsWith('/files'))return data.map((f:any)=>pick(f,['filename','previous_filename','status','additions','deletions']));
 if(route.endsWith('/reviews'))return data.map((r:any)=>({...pick(r,['state','commit_id','submitted_at']),user:user(r.user)}));
 if(route.endsWith('/requested_reviewers'))return{users:(data.users??[]).map(user),teams:(data.teams??[]).map((t:any)=>pick(t,['slug']))};
 if(route.endsWith('/commits'))return data.map((c:any)=>({author:user(c.author),commit:{author:pick(c.commit?.author,['name'])}}));
 if(route.endsWith('/timeline'))return data.map((e:any)=>({...pick(e,['id','event','created_at']),actor:user(e.actor)}));
 if(route.endsWith('/pulls'))return data.map((p:any)=>pick(p,['number']));
 return clean(data);
}
