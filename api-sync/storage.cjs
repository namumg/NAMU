'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function write(root,name,contents){const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});if(!fs.existsSync(target)||!fs.readFileSync(target).equals(Buffer.from(contents)))fs.writeFileSync(target,contents);}
function writeDataset(root,source){
 const assets={};for(const [url,data]of Object.entries(source.assets)){const match=data.match(/^data:image\/(png|jpeg|gif);base64,([\s\S]+)$/);assert.ok(match,'Unsupported existing image');const bytes=Buffer.from(match[2],'base64'),file='images/'+hash(bytes)+'.'+(match[1]==='jpeg'?'jpg':match[1]);write(root,file,bytes);assets[url]={path:file,mime:'image/'+match[1],sha256:hash(bytes)};}
 const indexDocs=[],search=[];for(const doc of source.docs){assert.match(doc.id,/^\d+$/);const mappings={};for(const im of doc.images||[]){assert.ok(assets[im.url],'Missing original image');mappings[im.url]=assets[im.url].path;}
 const article=JSON.stringify({document:doc,assets:mappings});const articlePath='data/articles/'+doc.id+'.'+hash(article).slice(0,16)+'.json';write(root,articlePath,article);
 const {body,nodes,images,...meta}=doc;const tags=Array.isArray(doc.tags)?doc.tags:[...new Set(String(body||'').match(/#[\p{L}\p{N}_-]+/gu)||[])];
 indexDocs.push({...meta,hasBody:!!(String(body||'').trim()||images?.length||JSON.stringify(nodes||[]).includes('"href"')),articlePath,searchTags:tags});
 search.push({...meta,tags,body:body||''});
 }
 const searchText=JSON.stringify(search),searchPath='data/search-index.'+hash(searchText).slice(0,16)+'.json';write(root,searchPath,searchText);
 const assetText=JSON.stringify(assets),assetPath='data/assets.'+hash(assetText).slice(0,16)+'.json';write(root,assetPath,assetText);
 const {docs,assets:originalAssets,...other}=source;const index={...other,schemaVersion:2,docs:indexDocs,assetPath,searchPath};write(root,'data/index.json',JSON.stringify(index));return index;
}
function readDataset(root){const index=JSON.parse(fs.readFileSync(path.join(root,'data/index.json'),'utf8'));const {schemaVersion,assetPath,searchPath,docs,...other}=index;const assets={};for(const [url,a]of Object.entries(JSON.parse(fs.readFileSync(path.join(root,assetPath),'utf8')))){const bytes=fs.readFileSync(path.join(root,a.path));assert.equal(hash(bytes),a.sha256);assets[url]='data:'+a.mime+';base64,'+bytes.toString('base64');}return {...other,docs:docs.map(d=>JSON.parse(fs.readFileSync(path.join(root,d.articlePath),'utf8')).document),assets};}
// Remove obsolete generated payloads so a moved private page cannot remain at an old static URL.
// Only known generated filenames inside these exact directories are eligible.
function pruneGenerated(root){
 const index=JSON.parse(fs.readFileSync(path.join(root,'data/index.json'),'utf8'));
 const assets=JSON.parse(fs.readFileSync(path.join(root,index.assetPath),'utf8'));
 const keep=new Set([index.assetPath,index.searchPath,...index.docs.map(d=>d.articlePath),...Object.values(assets).map(a=>a.path)]);
 for(const [dir,pattern] of [['data',/^(?:assets|search-index)\.[a-f0-9]{16}\.json$/],['data/articles',/^\d+\.[a-f0-9]{16}\.json$/],['images',/^[a-f0-9]{64}\.(?:png|jpg|gif)$/]]){
  for(const name of fs.readdirSync(path.join(root,dir))){const relative=dir+'/'+name;if(pattern.test(name)&&!keep.has(relative))fs.unlinkSync(path.join(root,relative));}
 }
}
module.exports={writeDataset,readDataset,hash,pruneGenerated};
