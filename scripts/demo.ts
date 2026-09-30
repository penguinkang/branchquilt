import {fixture} from '../tests/fixture.js';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {ingest} from '../packages/github/src/index.js';
import {githubFixture} from '../tests/github-fixture.js';
import {configSchema} from '../packages/schema/src/index.js';
import {renderHtml} from '../packages/generator/src/index.js';
const {root}=fixture(false);
try{
 writeFileSync(join(root,'src/auth.ts'),`// Session lifecycle — Unicode 🧵
export class Session {
  constructor(private token: string) {}
  login(user: string): boolean {
    function normalize(value: string) { return value.trim(); }
    return normalize(user).length > 0 && this.token.length > 0;
  }
  logout(): void { this.token = ''; }
}
export const isGuest = (name: string) => name.length === 0;
`);
 writeFileSync(join(root,'src/review.ts'),`export class ReviewQueue {
  pending: string[] = [];
  add(path: string) { this.pending.push(path); }
  next() { return this.pending.shift(); }
}
export function summarize(queue: ReviewQueue) { return queue.pending.length; }
`);
 execFileSync('git',['add','src'],{cwd:root});execFileSync('git',['commit','-m','Add session and review types'],{cwd:root,stdio:'pipe'});
 execFileSync(process.execPath,[resolve('dist/cli.cjs'),'build',root,'--branch','team/integration','--branch','main','--history-days','3650']);
 mkdirSync('work/demo',{recursive:true});const html=readFileSync(join(root,'branchquilt/index.html'),'utf8').replace(/branchquilt-fixture-[A-Za-z0-9_-]+/g,'Team Workspace');
 const atlas=JSON.parse(html.split('<script id="atlas-data" type="application/json">')[1].split('</script>')[0]);delete atlas.contentDigest;atlas.github=await ingest(githubFixture(atlas.snapshots[0].oid),'demo/team-workspace',configSchema.parse({github:{reviewer:'riley'}}).github);atlas.diagnostics.push('PRs in this demo are synthetic fixtures, not live GitHub data.');writeFileSync('work/demo/index.html',renderHtml(atlas,resolve('dist')));
 console.log(resolve('work/demo/index.html'));
}finally{rmSync(root,{recursive:true,force:true});}
