import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'yaml';
test('workflow templates isolate install, pin actions, bound schedules and gate deployment on a successful build',()=>{
 for(const name of ['pages','report']){
  const workflow=parse(readFileSync(`examples/automation/${name}.yml`,'utf8'));
  assert.deepEqual(Object.keys(workflow.on).sort(),['schedule','workflow_dispatch']);assert.equal(workflow.concurrency['cancel-in-progress'],false);assert.deepEqual(workflow.permissions,{});
  const job=workflow.jobs.build;assert.equal(job['timeout-minutes'],15);assert.equal(job.permissions.contents,'read');assert.equal(job.permissions['pull-requests'],'read');assert.equal(job.permissions.issues,'read');
  assert.equal(job.steps[0].with['fetch-depth'],0);assert.equal(job.steps[0].with['persist-credentials'],false);
  for(const j of Object.values(workflow.jobs) as any[])for(const step of j.steps)if(step.uses)assert.match(step.uses,/@[0-9a-f]{40}$/);
  const runs=job.steps.map((s:any)=>s.run??'').join('\n');assert(runs.includes('--frozen-lockfile --ignore-scripts'));assert(runs.includes('--timeout 600'));assert(runs.includes('"$GITHUB_REPOSITORY"'));
  if(name==='pages'){assert.equal(workflow.jobs.deploy.needs,'build');assert.equal(workflow.jobs.deploy.if,"vars.BRANCHQUILT_PUBLISH == 'true'");assert.equal(workflow.jobs.deploy.environment.name,'github-pages');assert.deepEqual(workflow.jobs.deploy.permissions,{'pages':'write','id-token':'write'});}else assert(!workflow.jobs.deploy);
 }
 if(process.platform!=='win32')execFileSync('sh',['-n','examples/automation/refresh.sh']);
});
