import {mkdtempSync,mkdirSync,writeFileSync,renameSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
export function fixture(hostile=true){
 const root=mkdtempSync(join(tmpdir(),'branchquilt-fixture-'));
 const run=(...args:string[])=>execFileSync('git',args,{cwd:root,stdio:['ignore','pipe','pipe'],env:{...process.env,GIT_AUTHOR_DATE:'2026-09-29T12:00:00Z',GIT_COMMITTER_DATE:'2026-09-29T12:00:00Z'}}).toString().trim();
 run('init','-b','main');run('config','user.name','Alex');run('config','user.email','alex-private@example.invalid');
 mkdirSync(join(root,'src'));
 writeFileSync(join(root,'src/auth.ts'),'export function login() { return true; }\n'.repeat(12));
 writeFileSync(join(root,'src/search.ts'),'export function search() { return []; }\n'.repeat(8));
 writeFileSync(join(root,'README.md'),'A team repository\n'.repeat(20));
 writeFileSync(join(root,'empty.txt'),'');writeFileSync(join(root,'line\nbreak.txt'),'filename fixture');
 writeFileSync(join(root,'日本語.ts'),'const emoji = "🧵";\n');writeFileSync(join(root,'.env'),'SECRET_CANARY');
 if(process.platform!=='win32')symlinkSync('/etc/passwd',join(root,'outside-link'));
 run('add','.');run('commit','-m','Initial team structure');
 run('checkout','-b','team/integration');run('config','user.name','Morgan');run('config','user.email','morgan-private@example.invalid');
 writeFileSync(join(root,'src/auth.ts'),'export function login(token: string) { return !!token; }\n'.repeat(18));
 renameSync(join(root,'src/search.ts'),join(root,'src/query.ts'));
 writeFileSync(join(root,'src/review.ts'),'export function review() {}\n'.repeat(10));
 run('add','.');run('commit','-m',hostile?'Improve auth and review flow </script><script>alert(1)</script>':'Improve authentication and add review flow');
 writeFileSync(join(root,'untracked.txt'),'not committed');
 return {root,run};
}
