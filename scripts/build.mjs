import {build} from 'esbuild';
import {mkdir,copyFile,chmod} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['packages/viewer/src/index.ts'],outfile:'dist/viewer.js',bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true});
await copyFile('packages/viewer/src/style.css','dist/viewer.css');
await build({entryPoints:['packages/cli/src/index.ts'],outfile:'dist/cli.cjs',bundle:true,format:'cjs',platform:'node',target:'node22',banner:{js:'#!/usr/bin/env node'}});
await chmod('dist/cli.cjs',0o755);

await mkdir('dist/grammars',{recursive:true});
for(const name of ['javascript','typescript','tsx','python','go','rust','java','c_sharp','c','cpp'])await copyFile(`node_modules/tree-sitter-wasms/out/tree-sitter-${name}.wasm`,`dist/grammars/tree-sitter-${name}.wasm`);
await build({entryPoints:['packages/parsers/src/worker.ts'],outfile:'dist/parser-worker.mjs',bundle:true,format:'esm',platform:'node',target:'node22',external:['web-tree-sitter']});

await build({entryPoints:['packages/runner/src/worker.ts'],outfile:'dist/build-worker.cjs',bundle:true,format:'cjs',platform:'node',target:'node22'});
