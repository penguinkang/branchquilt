import { hierarchy,treemap,treemapSquarify } from 'd3-hierarchy';
import { tree,unionFiles,change,symbolTree,boxWeight } from '../../analysis/src/index.js';
import type {Atlas,Entry,Tree,PullRequest} from '../../schema/src/index.js';
const data:Atlas=JSON.parse(document.querySelector('#atlas-data')!.textContent!);
const $=(s:string)=>document.querySelector(s) as HTMLElement;
function el<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls=''):HTMLElementTagNameMap[K]{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
function button(label:string,action:()=>void){const b=el('button',label);b.type='button';b.onclick=action;return b;}
const bytes=(n:number)=>n>=1024?`${(n/1024).toFixed(1)} KiB`:`${n} B`;
let current=0,compare=-1,scope='',query='',selected='',inspectorOpen=false,trigger:HTMLElement|null=null;
const color=(id:string)=>`hsl(${parseInt(id.slice(0,8),16)%360} 28% 72%)`;
let contributor='',colorMode='activity';
let sizeMode:'children'|'bytes'='children',sizeScale:'linear'|'log'='linear';
($('#size-mode') as HTMLSelectElement).onchange=e=>{sizeMode=(e.target as HTMLSelectElement).value as typeof sizeMode;render();};
($('#size-scale') as HTMLSelectElement).onchange=e=>{sizeScale=(e.target as HTMLSelectElement).value as typeof sizeScale;render();};
const tooltip=$('#object-tooltip');
function hoverName(target:HTMLElement,name:string){
 target.title=name;
 const show=()=>{tooltip.textContent=name;tooltip.hidden=false;target.setAttribute('aria-describedby','object-tooltip');const r=target.getBoundingClientRect();tooltip.style.left=Math.max(8,Math.min(r.left,innerWidth-tooltip.offsetWidth-8))+'px';tooltip.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-tooltip.offsetHeight-8))+'px';};
 const hide=()=>{tooltip.hidden=true;target.removeAttribute('aria-describedby');};
 target.addEventListener('mouseenter',show);target.addEventListener('mouseleave',hide);target.addEventListener('focus',show);target.addEventListener('blur',hide);
}
function visualTree(files:Entry[],symbolFiles=files):Tree{
 const root=tree(files),byPath=new Map(symbolFiles.filter(file=>file.symbols?.length).map(file=>[file.path,file]));
 const attach=(node:Tree)=>{if(node.children)for(const child of node.children)attach(child);else{const file=byPath.get(node.path);if(file?.symbols?.length)node.children=symbolTree(file).children;}};
 attach(root);return root;
}
function chainTo(root:Tree,path:string):Tree[]{
 const visit=(node:Tree,parents:Tree[]):Tree[]|undefined=>node.path===path?[...parents,node]:node.children?.map(child=>visit(child,[...parents,node])).find(Boolean);
 return path?(visit(root,[])??[root]):[root];
}
function enterScope(path:string){scope=path;inspectorOpen=false;$('#inspector').hidden=true;render();document.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"] .tile-select`)?.focus();}

const contributorSelect=$('#contributor') as HTMLSelectElement;
const people=new Map<string,string>();
for(const s of data.snapshots){for(const c of s.commits)people.set(c.authorId,c.author);for(const f of s.files)for(const o of f.owners??[])people.set(o.id,o.name);}
for(const [id,name] of [...people].sort((a,b)=>a[1].localeCompare(b[1]))){contributorSelect.add(new Option(name,id));const item=button(name,()=>{contributor=id;contributorSelect.value=id;render();});item.style.borderLeft=`8px solid ${color(id)}`;$('#contributor-legend').append(item);}
contributorSelect.onchange=()=>{contributor=contributorSelect.value;render();};
($('#color-mode') as HTMLSelectElement).onchange=e=>{colorMode=(e.target as HTMLSelectElement).value;render();};
$('#repo-name').textContent=data.repository;
function updateFreshness(){
 const minutes=Math.max(0,Math.floor((Date.now()-Date.parse(data.generatedAt))/60000)),stale=minutes>(data.staleAfterMinutes??1440);
 $('#freshness').textContent=`${stale?'Stale report · ':''}Generated ${new Date(data.generatedAt).toLocaleString()} · ${minutes<60?minutes+' minutes':Math.floor(minutes/60)+' hours'} ago. Static report; refresh the build to update it.`;
 $('#toggle-info').classList.toggle('stale',stale);$('#toggle-info').setAttribute('aria-label',stale?'Legend & info · stale report':'Legend & info');
}
updateFreshness();setInterval(updateFreshness,60000);
$('#notice').textContent=data.diagnostics.join(' ');
$('#catalog-summary').textContent=`${data.refs.length} refs inventoried · ${data.snapshots.length} snapshots embedded`;
const branch=$('#branch') as HTMLSelectElement,other=$('#compare') as HTMLSelectElement;
data.snapshots.forEach((s,i)=>{branch.add(new Option(s.ref,String(i)));other.add(new Option(s.ref,String(i)));});
branch.onchange=()=>{current=Number(branch.value);if(compare===current){compare=-1;other.value='-1';}scope='';render();};
other.onchange=()=>{compare=Number(other.value);if(compare===current){compare=-1;other.value='-1';}scope='';render();};
($('#search') as HTMLInputElement).oninput=e=>{query=(e.target as HTMLInputElement).value.toLowerCase();togglePanel('files',!!query);render();};
$('#close-inspector').onclick=()=>closeInspector();
const panels=['search','files','activity','info','reviews'];
function togglePanel(name:string,force?:boolean){
  const panel=$(`#${name}-panel`),open=force??panel.hidden;
  for(const item of panels){
    // Search and its file results can remain open together.
    if(item!==name&&!(name==='files'&&item==='search')&&!(name==='search'&&item==='files')){
      $(`#${item}-panel`).hidden=true;$(`#toggle-${item}`).setAttribute('aria-expanded','false');
    }
  }
  panel.hidden=!open;$(`#toggle-${name}`).setAttribute('aria-expanded',String(open));
  if(open&&name==='search')($('#search') as HTMLInputElement).focus();
}
for(const name of panels)$(`#toggle-${name}`).onclick=()=>togglePanel(name);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){tooltip.hidden=true;
    if(inspectorOpen){closeInspector();return;}
    const active=panels.find(name=>!$(`#${name}-panel`).hidden);
    for(const name of panels){$(`#${name}-panel`).hidden=true;$(`#toggle-${name}`).setAttribute('aria-expanded','false');}
    if(active)$(`#toggle-${active}`).focus();
  }
  if(e.key==='/'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLSelectElement)){
    e.preventDefault();togglePanel('search',true);
  }
});
function closeInspector(){inspectorOpen=false;$('#inspector').hidden=true;trigger?.focus();}
function inspect(id:string,title:string,facts:[string,string][],paths:string[]=[]){
  if(selected===id&&inspectorOpen){closeInspector();return;}
  selected=id;inspectorOpen=true;trigger=document.activeElement as HTMLElement;
  $('#inspector').hidden=false;$('#detail-title').textContent=title;
  const content=$('#details');content.replaceChildren();
  for(const [label,value] of facts){content.append(el('dt',label),el('dd',value));}
  if(paths.length){content.append(el('dt','Affected paths · file-level scope'));const list=el('div','','detail-paths');for(const p of paths.slice(0,100)){list.append(button(p,()=>{scope=p.includes('/')?p.slice(0,p.lastIndexOf('/')):'';render();inspectFile(p,current);}));}content.append(list);if(paths.length>100)content.append(el('p',`${paths.length-100} more paths.`));}
  $('#detail-legend').textContent='Activity is not ownership. Blame counts physical lines, including comments and blank lines. Mixed contributors use neutral color; choose a contributor to highlight their scope.';
}
function inspectFile(path:string,index:number){
  if(path.endsWith('#residual')){const file=data.snapshots[index].files.find(f=>f.path===path.split('#')[0]);if(file){const find=(n:Tree):Tree|undefined=>n.path===path?n:n.children?.map(find).find(Boolean);const residual=find(symbolTree(file));inspect(`residual:${index}:${path}`,'Other code',[['File',file.path],['Bytes',String(residual?.bytes??0)],['Meaning','Source outside child declaration spans; includes comments, whitespace, imports, and surrounding syntax.']]);return;}}
  if(path.includes('#')){const [filePath,id]=path.split('#');const f=data.snapshots[index].files.find(f=>f.path===filePath),symbol=f?.symbols?.find(s=>s.id===id);if(symbol){inspect(`symbol:${index}:${path}`,symbol.name,[['Kind',symbol.kind],['File',filePath],['Lines',`${symbol.startLine}–${symbol.endLine}`],['UTF-8 span',`${symbol.startByte}–${symbol.endByte}`],['Bytes',String(symbol.endByte-symbol.startByte)],['Ownership',(symbol.owners??[]).map(o=>`${o.name}: ${o.lines} lines`).join(', ')||'Unavailable'],['Parsing',f?.parseStatus??'unknown']]);return;}}
  const s=data.snapshots[index],f=s.files.find(f=>f.path===path),children=s.files.filter(f=>f.path.startsWith(path+'/'));
  const activity=s.commits.filter(c=>c.paths.some(p=>p===path||p.startsWith(path+'/')));
  const facts:[string,string][]=[['Snapshot',`${s.ref} · ${s.oid.slice(0,12)}`],['Path',path||'/'],['Size',bytes(f?.bytes??children.reduce((n,x)=>n+x.bytes,0))],['Kind',f?.kind??(children.length?'directory':'absent in this snapshot')],['Recent contributors',[...new Set(activity.filter(c=>!c.merge).map(c=>c.author))].join(', ')||'No activity in included history'],['Recent touching commits',String(activity.length)],['Symbols',String(f?.symbols?.length??0)],['Parsing',f?.parseStatus??'directory aggregate'],['Ownership',(f?.owners??[]).map(o=>`${o.name}: ${o.lines} lines`).join(', ')||'Open a file for line attribution'],['Attribution status',f?.ownershipStatus??'Not aggregated at directory level']];
  if(compare>=0){const a=data.snapshots[current].files.find(f=>f.path===path),b=data.snapshots[compare].files.find(f=>f.path===path);if(a||b)facts.push(['A → B',change(a,b)],['Byte delta',String((b?.bytes??0)-(a?.bytes??0))]);}
  const related=(data.github?.pullRequests??[]).filter(pr=>pr.files.some(f=>f.path===path||f.path.startsWith(path+'/')||f.oldPath===path));if(related.length)facts.push(['Related PRs (file-level)',related.map(pr=>`#${pr.number} ${pr.title}`).join(' · ')]);
  inspect(`file:${index}:${path}`,f?.path.split('/').at(-1)??path??'Repository',facts);
}
function inScope(path:string){const base=scope.split('#')[0];return !base||path===base||path.startsWith(base+'/');}
function render(){
  tooltip.hidden=true;
  renderReviews();
  const a=data.snapshots[current],b=compare>=0?data.snapshots[compare]:undefined;
  const files=b?unionFiles(a.files,b.files):a.files;
  const full=visualTree(files,[...a.files,...(b?.files??[])]),chain=chainTo(full,scope),active=new Set(chain.map(node=>node.path));
  const symbolFile=!b?a.files.find(file=>(file.path===scope||scope.startsWith(file.path+'#'))&&file.symbols?.length):undefined;
  const parent=new Map<string,string>();const indexTree=(node:Tree)=>{for(const child of node.children??[]){parent.set(child.path,node.path);indexTree(child);}};indexTree(full);
  $('#breadcrumbs').replaceChildren(button('Repository',()=>{scope='';render();}));
  for(const node of chain.slice(1))$('#breadcrumbs').append(button(node.name,()=>enterScope(node.path)));
  $('#map-title').textContent=b?'Compare branch snapshots':'Explore the shared branch';
  $('#map-description').textContent=b?'Aligned slots use shared child counts or maximum bytes. Expanding a source file switches to that pane’s branch for symbol exploration.':'Click a box to subdivide it in place; Open → shows its inspector.';
  const sizing=`Area = ${sizeScale==='log'?'log(1 + value)':'linear'} ${sizeMode==='children'?'immediate children (leaves count as 1)':'bytes'}`;
  $('#legend').textContent=sizing+' · '+(b?'aligned comparison slots · ':'')+`${colorMode==='ownership'?'current-line blame':'commit activity'} · gray = mixed or unknown`;
  if(contributor)$('#legend').textContent+=' · '+people.get(contributor);
  const panes=$('#panes');panes.replaceChildren();panes.classList.toggle('paired',!!b);
  const weight=(c:Tree)=>Math.max(boxWeight(c,a.files,sizeMode,sizeScale),b?boxWeight(c,b.files,sizeMode,sizeScale):0);
  type Region={child:Tree;x0:number;y0:number;x1:number;y1:number;depth:number;expanded:boolean};
  const all:Region[]=[];let omitted=0;
  const layout=(node:Tree,x0:number,y0:number,x1:number,y1:number,depth:number)=>{
    const children=node.children??[];if(!children.length)return;
    const shallow:Tree={...node,children:children.map(child=>({...child,children:undefined}))};
    const originals=new Map(children.map(child=>[child.path,child]));
    const root=treemap<Tree>().tile(treemapSquarify).size([x1-x0,y1-y0]).paddingInner(children.length>100?1:5)(hierarchy(shallow).sum(d=>d===shallow?0:weight(originals.get(d.path)!)).sort((a,b)=>b.value!-a.value!));
    for(const rect of root.children??[]){const child=originals.get(rect.data.path)!;const region={child,x0:x0+rect.x0,y0:y0+rect.y0,x1:x0+rect.x1,y1:y0+rect.y1,depth,expanded:active.has(child.path)&&!!child.children?.length};
      if(region.x1-region.x0<2||region.y1-region.y0<2||all.length>=500){if(weight(child)>0)omitted++;continue;}all.push(region);
      if(region.expanded){const inset=3,header=Math.min(30,Math.max(18,(region.y1-region.y0)*.18));layout(child,region.x0+inset,region.y0+header,region.x1-inset,region.y1-inset,depth+1);}
    }
  };layout(full,0,0,900,500,1);
  if(omitted>0)$('#map-description').textContent+=` ${omitted} small or excess regions omitted; use Files or search to inspect all paths.`;
  for(const index of b?[current,compare]:[current]){
    const s=data.snapshots[index],section=el('section','','pane');
    section.append(button(`${s.ref}  ·  ${s.oid.slice(0,8)}`,()=>inspect(`branch:${index}`,s.ref,[['Tip',s.oid],['Files',String(s.files.length)],['History','Commits reachable at build time; not branch creation history.']])));
    const map=el('div','','map');map.setAttribute('aria-label',`${s.ref} repository map`);
    for(const region of all){const {child}=region;
      const filePath=child.path.split('#')[0];const paths=s.files.filter(f=>f.path===filePath||f.path.startsWith(filePath+'/'));
      const symbolId=child.path.split('#')[1];
      const owners=symbolId?paths.flatMap(f=>f.symbols?.find(s=>s.id===symbolId)?.owners??[]):paths.flatMap(f=>f.owners??[]);
      const authors=colorMode==='ownership'?[...new Map(owners.map(o=>[o.id,o.name])).entries()]:symbolId?[]:[...new Map(s.commits.filter(c=>!c.merge&&c.paths.some(p=>p===filePath||p.startsWith(filePath+'/'))).map(c=>[c.authorId,c.author])).entries()];
      const box=el('div','','tile');box.style.left=`${region.x0/9}%`;box.style.top=`${region.y0/5}%`;box.style.width=`${(region.x1-region.x0)/9}%`;box.style.height=`${(region.y1-region.y0)/5}%`;box.style.zIndex=String(region.depth);box.classList.toggle('expanded',region.expanded);
      box.style.background=contributor&&authors.some(a=>a[0]===contributor)?color(contributor):authors.length===1?color(authors[0][0]):'#dce3df';
      const touching=(data.github?.pullRequests??[]).filter(pr=>pr.files.some(f=>f.path===filePath||f.path.startsWith(filePath+'/')||f.oldPath===filePath));
      const chosen=touching.filter(pr=>selectedPRs.has(pr.number));
      if(selectedPRs.size){if(chosen.length&&!symbolId){box.style.outline=`3px solid ${chosen.length===1?color(chosen[0].authorId):'#42594a'}`;box.style.outlineOffset='-3px';}else box.classList.add('dim');}
      if(touching.length&&!symbolId)box.append(el('small',`${touching.length} PR${touching.length>1?'s':''} · file-level`));
      if(!paths.length)box.classList.add('absent');if((query&&!child.path.toLowerCase().includes(query))||(contributor&&!authors.some(a=>a[0]===contributor)))box.classList.add('dim');
      const canEnter=!!child.children?.length,isFileNode=files.some(file=>file.path===child.path);
      const select=button(`${child.name}${child.children&&!symbolId&&!isFileNode?'/':''}`,()=>{if(canEnter){if(b&&!child.path.includes('#')&&paths.length===1&&paths[0].symbols?.length){current=index;branch.value=String(index);compare=-1;other.value='-1';}enterScope(region.expanded?(parent.get(child.path)??''):child.path);}else inspectFile(child.path,index);});select.className='tile-select';box.append(select);
      let fullName=child.path;
      if(symbolId){const symbols=paths[0]?.symbols??[];let symbol=symbols.find(s=>s.id===symbolId);const names:string[]=[];while(symbol){names.unshift(symbol.name);symbol=symbols.find(s=>s.id===symbol!.parentId);}fullName=filePath+' → '+(names.join(' → ')||child.name);}
      hoverName(box,fullName);select.title=fullName;select.setAttribute('aria-description',fullName);
      box.dataset.path=child.path;box.dataset.weight=String(weight(child));
      box.append(el('small',paths.length?bytes(child.path.includes('#')?child.bytes:paths.reduce((n,f)=>n+f.bytes,0)):'Absent'));
      if(authors.length>1)box.append(el('small',`${authors.length} contributors`));
      if(b&&!child.children)box.append(el('small',change(a.files.find(f=>f.path===child.path),b.files.find(f=>f.path===child.path))));
      const details=button('Open →',()=>inspectFile(child.path,index));details.className='open';details.setAttribute('aria-label',`Open details: ${child.name}`);box.append(details);
      map.append(box);
    }
    if(omitted>0)map.append(el('p',`${omitted} small or excess regions omitted · use Files / search for all paths`,'sr-only map-limit'));
    if(!all.some(({child})=>weight(child)>0))map.append(el('p','No nonzero file sizes here. Use the file list below.','empty'));
    section.append(map);panes.append(section);
  }
  const list=$('#file-list');list.replaceChildren();
  const matching=files.filter(f=>inScope(f.path)&&(!query||f.path.toLowerCase().includes(query)||f.symbols?.some(s=>s.name.toLowerCase().includes(query)))&&(!contributor||(colorMode==='ownership'?f.owners?.some(o=>o.id===contributor):a.commits.some(c=>!c.merge&&c.authorId===contributor&&c.paths.includes(f.path)))));
  for(const f of matching.slice(0,150)){const row=el('div','','file-row');row.append(button(f.path,()=>inspectFile(f.path,current)),el('span',b?change(a.files.find(x=>x.path===f.path),b.files.find(x=>x.path===f.path)):bytes(f.bytes)));list.append(row);}
  if(symbolFile&&!b){const symbols=(symbolFile.symbols??[]).filter(s=>!query||s.name.toLowerCase().includes(query));if(symbols.length>150)list.append(el('p',`${symbols.length} matching symbols · first 150 shown; narrow your search`));for(const symbol of symbols.slice(0,150)){list.append(button(`${symbol.kind} · ${symbol.name} · L${symbol.startLine}`,()=>inspectFile(symbolFile.path+'#'+symbol.id,current)));}}
  $('#list-summary').textContent=`${matching.length} matching paths${matching.length>150?' · showing first 150; narrow your search':''}`;
  const lane=$('#timeline');lane.replaceChildren();
  for(const c of a.commits){
    const marker=button(`${new Date(c.date).toLocaleDateString()} · ${c.author} · ${c.subject}`,()=>inspect(`commit:${c.oid}`,c.subject,[['Commit',c.oid],['Author',c.author],['Commit time',c.date],['Parents',c.parents.join(', ')||'Root commit'],['Change interpretation',c.merge?'First-parent integration; excluded from contributor color':'Commit-to-parent activity, not cumulative net change'],['Scope',c.scopeComplete?'File-level changes available':'Incomplete history']],c.paths));
    marker.className='event';lane.append(marker);
  }
  $('#history-summary').textContent=`${a.commits.length} commits · topological order${a.historyTruncated?' · capped history':''}`;
  if(!a.commits.length)lane.append(el('p','No commits within the configured history window.'));
  const renames=$('#renames');renames.replaceChildren();
  if(b){const reverse=current>compare;for(const r of data.comparisons[`${Math.min(current,compare)}:${Math.max(current,compare)}`]??[])renames.append(el('p',`Detected rename: ${reverse?r.newPath:r.oldPath} → ${reverse?r.oldPath:r.newPath}`));}
}

const selectedPRs=new Set<number>();
const reviewerInput=$('#reviewer-filter') as HTMLInputElement;reviewerInput.value=data.github?.reviewer??'';
reviewerInput.oninput=()=>renderReviews();($('#review-search') as HTMLInputElement).oninput=()=>renderReviews();
$('#clear-pr-scope').onclick=()=>{selectedPRs.clear();render();};
const seen=new Map<number,string>();
for(const pr of data.github?.pullRequests??[])try{const value=localStorage.getItem(`branchquilt:${data.github!.repo}:pr:${pr.number}`);if(value)seen.set(pr.number,value);}catch{}
function inspectPR(pr:PullRequest){
 inspect(`pr:${pr.number}`,`#${pr.number} ${pr.title}`,[['Submitter',pr.author],['Commit contributors',pr.contributors.join(', ')||'Unavailable'],['State',pr.state+(pr.draft?' · draft':'')],['Labels',pr.labels.join(', ')||'None'],['Base → head',`${pr.baseRef} → ${pr.headRef}`],['Head SHA',pr.headOid],['Review requests',pr.requested.join(', ')||'No requests returned'],['Reviews',pr.reviews.map(r=>`${r.author}: ${r.state} at ${r.commitOid.slice(0,8)}${r.commitOid!==pr.headOid?' (older head)':''}`).join(' · ')||'No submitted reviews returned'],['Coverage',`${pr.files.length} files · ${pr.completeness} · file-level mapping only`],['Checkpoint',seen.has(pr.number)?seen.get(pr.number)===pr.headOid?'Seen at current head':'Head differs from locally seen checkpoint':'Not marked seen locally'],['Limits',pr.diagnostics.join(' ')||'Current fetched PR scope; no historical symbol projection.']],pr.files.map(f=>f.path));
 if(!inspectorOpen)return;
 const actions=el('div','','pr-actions');
 actions.append(button(selectedPRs.has(pr.number)?'Remove scope highlight':'Highlight scope',()=>{if(selectedPRs.has(pr.number))selectedPRs.delete(pr.number);else selectedPRs.add(pr.number);render();}));
 actions.append(button('Mark seen locally',()=>{seen.set(pr.number,pr.headOid);let persisted=true;try{localStorage.setItem(`branchquilt:${data.github!.repo}:pr:${pr.number}`,pr.headOid);}catch{persisted=false;}actions.append(el('p',persisted?'Saved in this browser only.':'Saved for this session only; browser storage unavailable.'));renderReviews();}));
 const link=el('a','Open on GitHub');link.href=pr.url;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);$('#details').append(actions);
 const changes=el('div','','detail-paths');for(const f of pr.files.slice(0,100))changes.append(el('p',`${f.status} · ${f.oldPath?f.oldPath+' → ':''}${f.path} · +${f.additions} −${f.deletions}`));$('#details').append(changes);
 $('#detail-legend').textContent='PR outline = submitting author. A shared path is file-level overlap, not a confirmed conflict or exact function change. Old approvals do not prove current-head approval or merge readiness.';
}
function renderReviews(){
 const g=data.github,queue=$('#review-list');queue.replaceChildren();
 $('#review-status').textContent=g?`${g.pullRequests.length} PRs${g.truncated?' (selection capped)':''} · ${g.status} · checked ${new Date(g.fetchedAt).toLocaleString()}`:'GitHub data not included. Rebuild with --github required --github-repo owner/repo.';
 const needle=($('#review-search') as HTMLInputElement).value.toLowerCase(),reviewer=reviewerInput.value.trim().toLowerCase();
 const ref=data.snapshots[current].ref.replace(/^origin\//,'');
 const requested=(p:PullRequest)=>!!reviewer&&p.requested.some(r=>r.toLowerCase()===reviewer);
 const prs=[...(g?.pullRequests??[])].sort((a,b)=>Number(requested(b))-Number(requested(a))||b.updatedAt.localeCompare(a.updatedAt));
 for(const pr of prs){if(needle&&!`${pr.number} ${pr.title} ${pr.author} ${pr.labels.join(' ')}`.toLowerCase().includes(needle))continue;
  const row=el('div','','pr-row');const reason=requested(pr)?'Review requested from you':pr.baseRef===ref?'Targets this branch':pr.headRef===ref?'Uses this branch as head':'Other branch';
  const toggle=el('input');toggle.type='checkbox';toggle.checked=selectedPRs.has(pr.number);toggle.setAttribute('aria-label',`Highlight PR ${pr.number}`);toggle.onchange=()=>{if(toggle.checked)selectedPRs.add(pr.number);else selectedPRs.delete(pr.number);render();};
  const title=button(`#${pr.number} ${pr.title}`,()=>inspectPR(pr));title.style.borderLeft=`5px solid ${color(pr.authorId)}`;
  row.append(toggle,title,el('small',`${pr.author} · ${pr.state}${pr.draft?' · draft':''} · ${reason}${seen.has(pr.number)&&seen.get(pr.number)!==pr.headOid?' · updated since checkpoint':''}`));queue.append(row);
 }
 const timeline=$('#pr-timeline');timeline.replaceChildren();
 const allTimes=prs.flatMap(p=>[p.createdAt,...p.events.map(e=>e.date),...p.reviews.map(r=>r.date)]).map(Date.parse).filter(Number.isFinite);const min=allTimes.reduce((a,b)=>Math.min(a,b),Infinity),max=allTimes.reduce((a,b)=>Math.max(a,b),-Infinity);
 for(const pr of prs.slice(0,10)){
  const events=[{kind:'opened',actor:pr.author,date:pr.createdAt},...pr.events,...pr.reviews.map(r=>({kind:r.state,actor:r.author,date:r.date}))].filter(e=>Number.isFinite(Date.parse(e.date))).sort((a,b)=>a.date.localeCompare(b.date));
  const lane=el('div','','pr-history');lane.append(button(`#${pr.number} · ${pr.title}`,()=>inspectPR(pr)));
  const track=el('div','','time-track');
  const shown=events.length>200?Array.from({length:200},(_,i)=>events[Math.floor(i*(events.length-1)/199)]):events;
  for(const e of shown){const dot=button('●',()=>inspect(`event:${pr.number}:${e.kind}:${e.date}`,e.kind,[['PR',`#${pr.number}`],['Actor',e.actor],['Time',e.date],['Code scope','Lifecycle/review event; use PR details for current known file scope.']]));dot.title=`${e.kind} · ${e.actor} · ${e.date}`;dot.setAttribute('aria-label',dot.title);dot.style.left=`${max>min?(Date.parse(e.date)-min)/(max-min)*94:0}%`;track.append(dot);}
  lane.append(track,el('small',events.length?`${new Date(min).toISOString().slice(0,10)} → ${new Date(max).toISOString().slice(0,10)} · shared time scale${shown.length<events.length?' · 200 of '+events.length+' events sampled':''}`:'No dated events'));timeline.append(lane);
 }
}
render();
