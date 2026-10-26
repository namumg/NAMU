const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {writeDataset,readDataset}=require('./storage.cjs');
test('obsolete generated data is removed without touching branding or current files',()=>{
 const {pruneGenerated}=require('./storage.cjs'),root=fs.mkdtempSync(path.join(os.tmpdir(),'namu-prune-test-'));
 const source={docs:[{id:'1',title:'old',body:'old private text',images:[]}],assets:{}};
 const first=writeDataset(root,source);fs.mkdirSync(path.join(root,'images'));fs.writeFileSync(path.join(root,'images/brand-logo.png'),'logo');
 const second=writeDataset(root,{...source,docs:[{id:'2',title:'public',body:'public',images:[]}]});pruneGenerated(root);
 assert.ok(!fs.existsSync(path.join(root,first.docs[0].articlePath)));assert.ok(!fs.existsSync(path.join(root,first.searchPath)));assert.ok(fs.existsSync(path.join(root,second.docs[0].articlePath)));assert.equal(fs.readFileSync(path.join(root,'images/brand-logo.png'),'utf8'),'logo');
});
test('split storage preserves every field and original image byte',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'namu-storage-test-'));const source={projectId:'2970230',fetchedAt:'2026-10-23',brands:['A'],models:[{id:'1',title:'M',brand:'A'}],docs:[{id:'2',title:'문서',brand:'A',modelId:'1',model:'M',body:'text\ntext',tags:['original'],custom:{unchanged:true},nodes:[{text:'one'},{tag:'img',src:'https://flow.team/flowImg/test.png'},{text:'two'}],images:[{url:'https://flow.team/flowImg/test.png',name:'original'}],url:'https://flow.team/l/original'}],assets:{'https://flow.team/flowImg/test.png':'data:image/png;base64,aGVsbG8='},expectedRows:2};const index=writeDataset(root,source);assert.deepEqual(readDataset(root),source);assert.ok(!JSON.stringify(index).includes('base64'));const article=JSON.parse(fs.readFileSync(path.join(root,index.docs[0].articlePath)));assert.deepEqual(article.document.nodes,source.docs[0].nodes);});
