import {fork,execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import type {Config} from '../../schema/src/index.js';
import {lock,LockBusyError,writeArtifact} from '../../generator/src/index.js';
export async function runJob(root:string,common:string,out:string,config:Config,assets:string,options:{skipBusy?:boolean;recoverLock?:boolean}={}){
 let unlock:()=>void;
 try{unlock=lock(common,options.recoverLock);}catch(e){if(options.skipBusy&&e instanceof LockBusyError)return{status:'skipped',reason:'Another build is active',phase:4};throw e;}
 const start=performance.now();let stage:string|undefined;
 try{
  stage=mkdtempSync(join(common,'branchquilt','run-'));
  const staging=join(stage,'report.html');
  const result=await new Promise<any>((resolve,reject)=>{
   const child=fork(join(assets,'build-worker.cjs'),[],{stdio:['ignore','ignore','ignore','ipc'],detached:process.platform!=='win32'});
   let response:any,stopReason:string|undefined;
   const stop=(reason:string)=>{stopReason??=reason;if(!child.pid)return;try{if(process.platform==='win32')execFileSync('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'});else process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}};
   const interrupt=()=>stop('Refresh interrupted; previous report retained.');
   process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt);
   const timer=setTimeout(()=>stop('Build deadline exceeded; previous report retained.'),config.runtime.timeoutSeconds*1000);
   const cleanup=()=>{clearTimeout(timer);process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);};
   child.on('message',message=>{response=message;});
   child.once('error',()=>{cleanup();reject(new Error('Unable to start build worker.'));});
   child.once('exit',code=>{cleanup();if(stopReason||code!==0||response?.status!=='success')reject(new Error(stopReason??response?.message??'Build worker failed; previous report retained.'));else resolve(response);});
   child.send({root,out,staging,config,assets});
  });
  let previous='';try{const html=readFileSync(join(out,'index.html'),'utf8');previous=JSON.parse(html.split('<script id="atlas-data" type="application/json">')[1].split('</script>')[0]).contentDigest??'';}catch{}
  const output=writeArtifact(out,readFileSync(staging,'utf8'));
  result.changed=previous!==result.contentDigest;
  return {...result,phase:4,output,durationMs:Math.round(performance.now()-start)};
 }finally{if(stage)rmSync(stage,{recursive:true,force:true});unlock();}
}
