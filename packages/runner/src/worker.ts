import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {relative,sep} from 'node:path';
import {collect} from '../../git/src/index.js';
import {enrich} from '../../analysis/src/enrich.js';
import {enrichGitHub} from '../../github/src/index.js';
import {validateAtlas,configSchema} from '../../schema/src/index.js';
import {renderHtml} from '../../generator/src/index.js';
process.on('disconnect',()=>process.exit(1));
process.once('message',async(input:{root:string;out:string;staging:string;config:unknown;assets:string})=>{
 try{
  const config=configSchema.parse(input.config),start=performance.now();
  const data=collect(input.root,config,relative(input.root,input.out).split(sep).join('/'));
  const collected=performance.now();await enrich(input.root,data,config,input.assets);
  const analyzed=performance.now();await enrichGitHub(input.root,data,config);validateAtlas(data);
  data.staleAfterMinutes=config.runtime.staleAfterMinutes;
  data.contentDigest=createHash('sha256').update(JSON.stringify({...data,generatedAt:undefined,github:data.github?{...data.github,fetchedAt:undefined}:undefined,diagnostics:data.diagnostics.filter(d=>!d.startsWith('GitHub:')&&!d.startsWith('Phase 4:'))})).digest('hex');
  const enriched=performance.now(),html=renderHtml(data,input.assets),bytes=Buffer.byteLength(html);
  if(bytes>config.runtime.maxOutputBytes)throw new Error('Report exceeds runtime.maxOutputBytes; narrow branches/history/PR limits.');
  writeFileSync(input.staging,html,{flag:'wx',mode:0o600});
  process.send?.({status:'success',contentDigest:data.contentDigest,snapshots:data.snapshots.length,files:data.snapshots.reduce((n,s)=>n+s.files.length,0),excluded:data.excluded,diagnostics:data.diagnostics,bytes,timingsMs:{collect:Math.round(collected-start),analysis:Math.round(analyzed-collected),github:Math.round(enriched-analyzed),render:Math.round(performance.now()-enriched)}},()=>process.exit(0));
 }catch(error){process.send?.({status:'failed',message:error instanceof Error?error.message:'Build failed'},()=>process.exit(1));}
});
