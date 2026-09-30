import {parentPort,workerData} from 'node:worker_threads';
import {Parser,Language,type Node as SyntaxNode} from 'web-tree-sitter';
import {join} from 'node:path';
const languages=new Map<string,Language>();
await Parser.init();
parentPort!.on('message',async ({source,language,id})=>{
 try{
  if(!languages.has(language))languages.set(language,await Language.load(join(workerData.grammars,`tree-sitter-${language}.wasm`)));
  const parser=new Parser();parser.setLanguage(languages.get(language)!);
  const tree=parser.parse(source)!;
  const offsets=new Uint32Array(source.length+1);let bytes=0;
  for(let i=0;i<source.length;){const code=source.codePointAt(i)!;const units=code>65535?2:1;offsets[i]=bytes;if(units===2)offsets[i+1]=bytes;bytes+=Buffer.byteLength(String.fromCodePoint(code));i+=units;offsets[i]=bytes;}
  const symbols:any[]=[];
  const kinds:Record<string,string>={class_declaration:'class',class_definition:'class',class_specifier:'class',interface_declaration:'interface',struct_item:'struct',struct_specifier:'struct',struct_declaration:'struct',enum_item:'enum',enum_declaration:'enum',enum_specifier:'enum',function_declaration:'function',function_definition:'function',function_item:'function',method_definition:'method',method_declaration:'method',constructor_declaration:'constructor',impl_item:'implementation',trait_item:'interface'};
  function nameOf(node:SyntaxNode):string|undefined{
   const name=node.childForFieldName('name')??(node.type==='impl_item'?node.childForFieldName('type'):null);if(name)return name.text;
   const decl=node.childForFieldName('declarator');
   if(decl){let d=decl;while(d.childForFieldName('declarator'))d=d.childForFieldName('declarator')!;return d.text;}
   return undefined;
  }
  const stack:[SyntaxNode,string|undefined][]=[[tree.rootNode,undefined]];
  while(stack.length){const [node,parentId]=stack.pop()!;let kind=kinds[node.type],name=nameOf(node);
   if(node.type==='type_spec'&&node.childForFieldName('name')){kind='type';name=node.childForFieldName('name')!.text;}
   if(node.type==='variable_declarator'&&['arrow_function','function_expression','function'].includes(node.childForFieldName('value')?.type??'')){kind='function';name=node.childForFieldName('name')?.text;}
   let childParent=parentId;
   if(kind&&name&&!node.hasError){
    const symbolId=`${offsets[node.startIndex]}:${offsets[node.endIndex]}:${kind}`;childParent=symbolId;
    symbols.push({id:symbolId,parentId,name,kind,startByte:offsets[node.startIndex],endByte:offsets[node.endIndex],startLine:node.startPosition.row+1,endLine:node.endPosition.row+(node.endPosition.column?1:0)});
    if(symbols.length>=20000)throw new Error('Symbol limit exceeded');
   }
   for(let i=node.namedChildren.length-1;i>=0;i--){const child=node.namedChildren[i];if(child)stack.push([child,childParent]);}
  }
  const status=tree.rootNode.hasError?'partial':'complete';tree.delete();parser.delete();
  parentPort!.postMessage({id,symbols,status});
 }catch{parentPort!.postMessage({id,symbols:[],status:'failed'});}
});
