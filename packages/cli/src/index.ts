import { Command } from 'commander';
import { readFileSync,existsSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {configSchema} from '../../schema/src/index.js';
import {repositoryRoot,text} from '../../git/src/index.js';
import {safeOutput} from '../../generator/src/index.js';
import {runJob} from '../../runner/src/index.js';
const cli=new Command().name('branchquilt').version('0.4.0-alpha.9').description('Offline branch maps · Phase 4 scheduled refresh alpha');
for(const command of ['build','refresh'])cli.command(command).argument('[path]','existing Git repository','.').option('--branch <ref>','snapshot only this ref (repeatable); default includes available branches',(v:string,a:string[])=>[...a,v],[]).option('--max-branches <count>','automatic branch snapshot cap, 1–50').option('--output <directory>','output directory inside target repo').option('--config <path>','JSON config file').option('--github <mode>','off, auto, or required').option('--github-repo <owner/repo>','GitHub repository').option('--max-prs <count>','PR cap, 1–100').option('--pr-state <state>','open, closed, all').option('--reviewer <login>','reviewer to prioritize').option('--history-days <days>','history window in days').option('--max-commits <count>','history cap per snapshot').option('--ownership <mode>','blame or off').option('--no-cache','disable analysis cache').option('--timeout <seconds>','analysis/enrichment deadline, 1–3600 seconds').option('--recover-lock','recover a verified dead local process lock').option('--json','machine-readable final result').action(async (path,opts)=>{
 const root=repositoryRoot(resolve(path));
 const configPath=opts.config?resolve(root,opts.config):resolve(root,'branchquilt.config.json');
 let input:Record<string,unknown>={};
 if(existsSync(configPath)){try{input=JSON.parse(readFileSync(configPath,'utf8'));}catch{throw new Error('Configuration must be valid JSON.');}}else if(opts.config)throw new Error('Specified configuration file does not exist.');
 const base=configSchema.parse(input);
 const config=configSchema.parse({...base,maxSnapshots:opts.maxBranches?Number(opts.maxBranches):base.maxSnapshots,runtime:{...base.runtime,timeoutSeconds:opts.timeout?Number(opts.timeout):base.runtime.timeoutSeconds},ownership:{...base.ownership,mode:opts.ownership??base.ownership.mode},cache:{...base.cache,enabled:opts.cache===false?false:base.cache.enabled},branches:opts.branch.length?opts.branch:base.branches,output:{...base.output,...(opts.output?{directory:opts.output}:{})},github:{...base.github,mode:opts.github??base.github.mode,repo:opts.githubRepo??base.github.repo,maxPRs:opts.maxPrs?Number(opts.maxPrs):base.github.maxPRs,state:opts.prState??base.github.state,reviewer:opts.reviewer??base.github.reviewer},history:{days:opts.historyDays?Number(opts.historyDays):base.history.days,maxCommits:opts.maxCommits?Number(opts.maxCommits):base.history.maxCommits}});
 const out=safeOutput(root,config.output.directory),common=resolve(root,text(root,['rev-parse','--git-common-dir']));
 const result=await runJob(root,common,out,config,__dirname,{skipBusy:command==='refresh',recoverLock:opts.recoverLock});
 console.log(opts.json?JSON.stringify(result):result.status==='skipped'?'Skipped: another build is active.':`Built ${result.output}\n${result.snapshots} snapshots · ${result.files} file entries · ${result.durationMs} ms\n${result.diagnostics.join('\n')}`);
});
cli.command('init').argument('[path]','existing repository','.').action(path=>{
 const root=repositoryRoot(resolve(path)),file=resolve(root,'branchquilt.config.json');
 writeFileSync(file,JSON.stringify(configSchema.parse({}),null,2)+'\n',{flag:'wx'});console.log(`Created ${file}`);
});
cli.command('doctor').argument('[path]','existing repository','.').action(path=>{
 const root=repositoryRoot(resolve(path));console.log(JSON.stringify({node:process.version,git:text(root,['--version']),head:text(root,['rev-parse','--verify','HEAD']),phase:4,github:'github.com read-only REST; GH_TOKEN / GITHUB_TOKEN'},null,2));
});
cli.parseAsync().catch(error=>{console.error(JSON.stringify({status:'failed',message:error instanceof Error?error.message:'Build failed'}));process.exitCode=1;});
