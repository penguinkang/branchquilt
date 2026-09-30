import { readFileSync,readdirSync,mkdirSync,lstatSync,existsSync,writeFileSync,renameSync,unlinkSync,openSync,closeSync } from 'node:fs';
import { resolve,relative,sep,dirname,join } from 'node:path';
import { hostname } from 'node:os';
import { createHash,randomUUID } from 'node:crypto';
import type { Atlas } from '../../schema/src/index.js';
export function safeOutput(root:string,requested:string):string{
  const out=resolve(root,requested),rel=relative(root,out);
  if(!rel||rel.startsWith('..'+sep)||rel==='..'||resolve(out)===root||rel.split(sep).some(p=>p==='.git'||p==='node_modules'))throw new Error('Output must be a dedicated directory inside the repository, outside .git and dependencies.');
  let walk=root;for(const part of rel.split(sep)){walk=join(walk,part);if(existsSync(walk)&&lstatSync(walk).isSymbolicLink())throw new Error('Output path cannot contain a symbolic link.');}
  return out;
}
export function renderHtml(data:Atlas,assets:string):string{
  const script=readFileSync(join(assets,'viewer.js'),'utf8'),css=readFileSync(join(assets,'viewer.css'),'utf8');
  const hash=createHash('sha256').update(script).digest('base64');
  const payload=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>BranchQuilt · Local workspace</title><style>${css}</style></head><body>
<header class="floating topbar"><div class="brand">Branch<span>Quilt</span></div><span id="repo-name"></span><label class="sr-only" for="branch">Working branch</label><select id="branch"></select><label class="sr-only" for="compare">Compare with</label><select id="compare"><option value="-1">Compare…</option></select><label class="sr-only" for="color-mode">Color mode</label><select id="color-mode"><option value="activity">Activity</option><option value="ownership">Ownership</option></select><button id="toggle-search" aria-expanded="false" aria-controls="search-panel">Search <kbd>/</kbd></button></header>
<div class="floating scale-control" aria-label="Treemap sizing"><label for="size-mode">Area</label><select id="size-mode"><option value="children">Children</option><option value="bytes">Bytes</option></select><div class="scale-toggle" aria-label="Area scale"><button id="size-linear" type="button" aria-pressed="true">Linear</button><button id="size-log" type="button" aria-pressed="false">Log</button></div></div>
<main aria-label="Repository visualization"><h1 id="map-title" class="sr-only"></h1><nav id="breadcrumbs" class="floating" aria-label="Repository breadcrumbs"></nav><div id="panes"></div></main>
<nav class="floating dock" aria-label="Map tools"><button id="toggle-reviews" aria-expanded="false" aria-controls="reviews-panel">Reviews</button><button id="toggle-files" aria-expanded="false" aria-controls="files-panel">Files</button><button id="toggle-activity" aria-expanded="false" aria-controls="activity-panel">Activity</button><button id="toggle-info" aria-expanded="false" aria-controls="info-panel">Legend & info</button></nav>
<section id="reviews-panel" class="floating overlay left-panel" aria-label="Review queue" hidden><h2>Review queue</h2><input id="review-search" type="search" placeholder="PR title, author, or label" aria-label="Filter reviews"><label for="reviewer-filter">Reviewer</label><input id="reviewer-filter" placeholder="GitHub login" autocomplete="off"><p id="review-status"></p><button id="clear-pr-scope">Clear scope</button><div id="review-list"></div></section><section id="search-panel" class="floating overlay search-panel" aria-label="Search files" hidden><label for="search">Find a file</label><input id="search" type="search" placeholder="Search paths…" autocomplete="off"><label for="contributor">Contributor</label><select id="contributor"><option value="">Everyone</option></select><p>Matches stay highlighted on the map.</p></section>
<section id="files-panel" class="floating overlay left-panel" aria-label="Files" hidden><h2>Files</h2><p id="list-summary"></p><div id="file-list"></div><div id="renames"></div></section>
<section id="activity-panel" class="floating overlay activity-panel" aria-label="Branch activity" hidden><h2>Activity</h2><p id="history-summary"></p><div id="timeline" class="events"></div><div id="pr-timeline"></div></section>
<section id="info-panel" class="floating overlay left-panel" aria-label="Legend and data information" hidden><h2>Reading this map</h2><p id="legend"></p><div id="contributor-legend"></div><p id="map-description"></p><p id="freshness"></p><p id="catalog-summary"></p><p id="notice"></p></section>
<aside id="inspector" class="floating overlay inspector" aria-label="Selection details" hidden><button id="close-inspector" type="button" aria-label="Close details">Close ×</button><h2 id="detail-title" aria-live="polite"></h2><dl id="details"></dl><p id="detail-legend"></p></aside>
<div id="object-tooltip" role="tooltip" hidden></div>
<script id="atlas-data" type="application/json">${payload}</script><script>${script}</script></body></html>`;
}
export function writeArtifact(out:string,html:string):string{
  mkdirSync(out,{recursive:true});
  const marker=join(out,'.branchquilt-output'),target=join(out,'index.html');
  if(!existsSync(marker)&&readdirSync(out).length)throw new Error('Output directory is not empty and is not owned by BranchQuilt.');
  if(existsSync(marker)&&(lstatSync(marker).isSymbolicLink()||readFileSync(marker,'utf8')!=='branchquilt:0.1\n'))throw new Error('Invalid BranchQuilt output ownership marker.');
  if(existsSync(target)&&(!existsSync(marker)||lstatSync(marker).isSymbolicLink()||readFileSync(marker,'utf8')!=='branchquilt:0.1\n'))throw new Error('Refusing to overwrite an index.html not owned by BranchQuilt.');
  if(existsSync(target)&&lstatSync(target).isSymbolicLink())throw new Error('Output file cannot be a symlink.');
  const temp=join(out,`.staging-${randomUUID()}`);
  try{writeFileSync(temp,html,{flag:'wx',mode:0o600});if(!existsSync(marker))writeFileSync(marker,'branchquilt:0.1\n',{flag:'wx',mode:0o600});renameSync(temp,target);}finally{if(existsSync(temp))unlinkSync(temp);}
  return target;
}
export class LockBusyError extends Error {}
export function lock(commonDir:string,recover=false):()=>void{
  const directory=join(commonDir,'branchquilt');mkdirSync(directory,{recursive:true,mode:0o700});
  const file=join(directory,'build.lock'),gate=file+'.gate';
  let guard:number;try{guard=openSync(gate,'wx',0o600);}catch{throw new LockBusyError('Lock acquisition is busy. Inspect an abandoned build.lock.gate manually.');}
  const owner=randomUUID();
  try{
    if(existsSync(file)){
      let previous:any;try{previous=JSON.parse(readFileSync(file,'utf8'));}catch{throw new Error('Malformed build lock; manual inspection required.');}
      if(previous.host!==hostname()||!Number.isSafeInteger(previous.pid)||previous.pid<1)throw new Error('Build lock ownership cannot be verified on this host.');
      let dead=false;try{process.kill(previous.pid,0);}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH')dead=true;}
      if(!dead)throw new LockBusyError('Another build may be active.');
      if(!recover)throw new Error('Abandoned local lock found. Use refresh --recover-lock after inspecting the previous run.');
      unlinkSync(file);
    }
    const fd=openSync(file,'wx',0o600);
    try{writeFileSync(fd,JSON.stringify({pid:process.pid,host:hostname(),owner,startedAt:new Date().toISOString()}));}finally{closeSync(fd);}
  }finally{closeSync(guard);unlinkSync(gate);}
  return ()=>{try{const current=JSON.parse(readFileSync(file,'utf8'));if(current.owner===owner)unlinkSync(file);}catch{}};
}
