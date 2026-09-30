import type { Entry,Tree } from '../../schema/src/index.js';
export function tree(files:Entry[]):Tree{
  const root:Tree={name:'Repository',path:'',bytes:0,children:[]};
  for(const f of [...files].sort((a,b)=>a.path<b.path?-1:1)){
    let cursor=root;cursor.bytes+=f.bytes;
    const bits=f.path.split('/');
    bits.forEach((name,i)=>{
      if(i===bits.length-1){cursor.children!.push({name,path:f.path,bytes:f.bytes});return;}
      let child=cursor.children!.find(c=>c.name===name&&c.children);
      if(!child){child={name,path:bits.slice(0,i+1).join('/'),bytes:0,children:[]};cursor.children!.push(child);}
      child.bytes+=f.bytes;cursor=child;
    });
  }
  return root;
}
export function unionFiles(a:Entry[],b:Entry[]):Entry[]{
  const all=new Map(a.map(x=>[x.path,{...x}]));
  for(const f of b){const old=all.get(f.path);if(!old||f.bytes>old.bytes)all.set(f.path,{...f});}
  return [...all.values()];
}
export function change(a:Entry|undefined,b:Entry|undefined):string{
  if(!a)return 'added';if(!b)return 'removed';
  if(a.kind!==b.kind)return 'type changed';
  return a.oid===b.oid&&a.mode===b.mode?'unchanged':'modified';
}

export function symbolTree(file:Entry):Tree {
 const root:Tree={name:file.path.split('/').at(-1)!,path:file.path,bytes:file.bytes,children:[]};
 const map=new Map<string,Tree>();
 for(const s of file.symbols??[])map.set(s.id,{name:s.name,path:file.path+'#'+s.id,bytes:s.endByte-s.startByte,children:[]});
 for(const s of file.symbols??[]){const n=map.get(s.id)!,parent=s.parentId?map.get(s.parentId)!:root;parent.children!.push(n);}
 const fill=(n:Tree)=>{const childBytes=n.children!.reduce((sum,c)=>sum+c.bytes,0);if(n.children!.length){for(const c of n.children!)fill(c);if(n.bytes>childBytes)n.children!.push({name:'Other code',path:n.path+'#residual',bytes:n.bytes-childBytes});}else delete n.children;};
 fill(root);return root;
}
