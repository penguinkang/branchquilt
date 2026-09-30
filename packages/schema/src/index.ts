import { z } from 'zod';
export const configSchema = z.object({
  version: z.literal(1).default(1),
  branches: z.array(z.string().min(1)).min(1).max(5).default(['HEAD']),
  output: z.object({ directory: z.string().min(1).default('branchquilt'), format: z.literal('single').default('single') }).strict().default({directory:'branchquilt',format:'single'}),
  exclude: z.array(z.string()).default([]),
  history: z.object({ days: z.number().int().min(1).max(3650).default(14), maxCommits: z.number().int().min(1).max(2000).default(100) }).strict().default({days:14,maxCommits:100}),
  parsing: z.object({maxFileBytes:z.number().int().positive().default(2097152),timeoutMs:z.number().int().positive().default(2000)}).strict().default({maxFileBytes:2097152,timeoutMs:2000}),
  ownership: z.object({mode:z.enum(['blame','off']).default('blame'),identityMappings:z.array(z.object({fromEmail:z.string().email(),toEmail:z.string().email(),name:z.string().min(1)}).strict()).default([])}).strict().default({mode:'blame',identityMappings:[]}),
  runtime: z.object({staleAfterMinutes:z.number().int().min(1).max(10080).default(1440),timeoutSeconds:z.number().int().min(1).max(3600).default(600),maxOutputBytes:z.number().int().min(1024).max(268435456).default(67108864)}).strict().default({staleAfterMinutes:1440,timeoutSeconds:600,maxOutputBytes:67108864}),
  cache: z.object({enabled:z.boolean().default(true),maxBytes:z.number().int().min(1048576).max(1073741824).default(134217728),maxAgeDays:z.number().int().min(1).max(365).default(30)}).strict().default({enabled:true,maxBytes:134217728,maxAgeDays:30}),
  github: z.object({mode:z.enum(['off','auto','required']).default('off'),repo:z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/).optional(),maxPRs:z.number().int().min(1).max(100).default(30),state:z.enum(['open','closed','all']).default('open'),reviewer:z.string().optional()}).strict().default({mode:'off',maxPRs:30,state:'open'})
}).strict();
export type Config = z.infer<typeof configSchema>;
export interface SymbolNode { id:string; parentId?:string; name:string; kind:string; startByte:number; endByte:number; startLine:number; endLine:number; exclusiveBytes?:number; owners?:Owner[]; }
export interface Owner {id:string;name:string;lines:number;}
export interface Entry { path:string; oid:string; mode:string; bytes:number; kind:'file'|'symlink'|'submodule'; language?:string; symbols?:SymbolNode[]; parseStatus?:string; owners?:Owner[]; lines?:number; ownershipStatus?:'complete'|'partial'|'unavailable'; }
export interface Commit { oid:string; parents:string[]; author:string; authorId:string; date:string; subject:string; paths:string[]; scopeComplete:boolean; merge:boolean; }
export interface Snapshot { id:string; ref:string; oid:string; files:Entry[]; commits:Commit[]; historyTruncated:boolean; }
export interface Atlas { contentDigest?:string; staleAfterMinutes?:number; schemaVersion:'0.1.0'; generatedAt:string; github?:GitHubData; repository:string; snapshots:Snapshot[]; refs:{ref:string;oid:string}[]; diagnostics:string[]; excluded:number; comparisons:Record<string,{oldPath:string;newPath:string}[]>; }
export interface PullRequest {
 number:number;title:string;url:string;author:string;authorId:string;state:string;draft:boolean;
 baseRef:string;headRef:string;baseOid:string;headOid:string;createdAt:string;updatedAt:string;
 labels:string[];requested:string[];contributors:string[];
 files:{path:string;oldPath?:string;status:string;additions:number;deletions:number}[];
 reviews:{author:string;state:string;commitOid:string;date:string}[];
 events:{id:string;kind:string;actor:string;date:string}[];
 completeness:'complete'|'partial';diagnostics:string[];
}
export interface GitHubData {repo:string;fetchedAt:string;status:'complete'|'partial'|'unavailable';truncated?:boolean;reviewer?:string;pullRequests:PullRequest[];}
export interface Tree { name:string; path:string; bytes:number; children?:Tree[]; }
export function validateAtlas(a:Atlas):void {
  if(a.schemaVersion!=='0.1.0'||!a.snapshots.length) throw new Error('Invalid atlas version or empty snapshots');
  const ids=new Set<string>();
  for(const s of a.snapshots){
    if(ids.has(s.id)) throw new Error('Duplicate snapshot'); ids.add(s.id);
    const paths=new Set<string>();
    for(const f of s.files){
      if(paths.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||f.path.startsWith('/')||f.path.split('/').includes('..')) throw new Error('Invalid file entry');
      paths.add(f.path);
    }
  }
}
