import type {Api} from '../packages/github/src/index.js';
export function githubFixture(head='a'.repeat(40)):Api{
 return {async get(path){
  const number=Number(path.match(/\/(?:pulls|issues)\/(\d+)/)?.[1]??42);
  const base={number,title:number===42?'Improve session validation':number===43?'Add review queue labels':'Document onboarding',user:{id:number===43?2:1,login:number===43?'morgan':'alex'},state:'open',draft:number===44,base:{ref:'team/integration',sha:'b'.repeat(40)},head:{ref:'feature/'+number,sha:head},created_at:'2026-09-20T12:00:00Z',updated_at:'2026-09-29T12:00:00Z',changed_files:number===44?1:2,commits:2,labels:[{name:number===44?'docs':'review-needed'}]};
  if(/\/pulls\?/.test(path))return{data:[{number:42},{number:43},{number:44}],more:false};
  if(path.includes('/files?'))return{data:number===44?[{filename:'README.md',status:'modified',additions:10,deletions:2}]:[{filename:'src/auth.ts',status:'modified',additions:6,deletions:2},{filename:number===42?'src/removed.ts':'src/review.ts',status:number===42?'removed':'modified',additions:0,deletions:3}],more:false};
  if(path.includes('/reviews?'))return{data:[{user:{login:'riley'},state:'APPROVED',commit_id:'c'.repeat(40),submitted_at:'2026-09-23T10:00:00Z'}],more:false};
  if(path.endsWith('/requested_reviewers'))return{data:{users:[{login:'riley'}],teams:[{slug:'platform'}]},more:false};
  if(path.includes('/commits?'))return{data:[{author:{login:'alex'}},{author:{login:'morgan'}}],more:false};
  if(path.includes('/timeline?'))return{data:[{id:number*10,event:'review_requested',actor:{login:'alex'},created_at:'2026-09-21T10:00:00Z'},{id:number*10+1,event:'labeled',actor:{login:'morgan'},created_at:'2026-09-25T10:00:00Z'}],more:false};
  return{data:base,more:false};
 }};
}
