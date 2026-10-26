'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {readDataset,writeDataset,pruneGenerated}=require('./storage.cjs');
const {partition,encrypt,GROUP}=require('./internal.cjs');
const PROJECT='2970230',DATA=/<script id="source" type="application\/json">([\s\S]*?)<\/script>/g;
function readSource(html){const matches=[...html.matchAll(DATA)];assert.equal(matches.length,1,'Expected exactly one wiki data block');return JSON.parse(matches[0][1]);}
function replaceSource(html,data){readSource(html);return html.replace(DATA,()=>'<script id="source" type="application/json">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>');}
function serialize(n,images){
 if(n.nodeType===3)return {text:n.textContent};
 if(n.nodeType!==1||['SCRIPT','STYLE','BUTTON','INPUT','IFRAME','OBJECT','EMBED'].includes(n.tagName))return null;
 if(n.matches('.js-direct-href[data-preview-url]'))return {tag:'a',href:n.getAttribute('data-preview-url'),children:[...n.childNodes].filter(c=>!(c.nodeType===1&&c.matches('img.js-box-image'))).map(c=>serialize(c,images)).filter(Boolean)};
 if(n.matches('.js-post-img')||n.tagName==='IMG'){
  const src=n.getAttribute('atch_url')||n.getAttribute('img_path')||n.getAttribute('src');assert.ok(src,'Image source missing');
  const name=n.getAttribute('file_nm')||n.getAttribute('alt')||'이미지';images.push({url:src,name});return {tag:'img',src,alt:name};
 }
 return {tag:n.tagName.toLowerCase(),...(n.tagName==='A'?{href:n.getAttribute('href')}:{}),children:[...n.childNodes].map(c=>serialize(c,images)).filter(Boolean)};
}
function parseContent(detail){
 let html=detail.htmlContent||'';
 if(/^%3c/i.test(html.trim()))html=decodeURIComponent(html);
 assert.ok(html||!detail.outContent?.trim(),'Missing original HTML: '+detail.postId);
 assert.ok(html||!detail.imageAttachments?.length,'Missing image layout: '+detail.postId);
 const dom=new JSDOM('<!doctype html><body></body>');dom.window.document.body.innerHTML=html;
 const images=[],nodes=[...dom.window.document.body.childNodes].map(n=>serialize(n,images)).filter(Boolean);
 const body=detail.outContent||dom.window.document.body.textContent||'';dom.window.close();return {nodes,images,body};
}
function value(t,type){return t.columns?.find(c=>c.defaultColumnType===type)?.columnData?.[0];}
function makeData(previous,tasks,details){
 assert.equal(previous.projectId,PROJECT);assert.ok(tasks.length,'Empty API result');
 const byId=new Map(tasks.map(t=>[t.taskId,t])),byPost=new Map(details.map(d=>[d.postId,d]));
 assert.equal(byId.size,tasks.length,'Duplicate task');assert.equal(byPost.size,tasks.length,'Missing/duplicate detail');
 for(const t of tasks){assert.equal(t.projectId,PROJECT);assert.equal(byPost.get(t.postId)?.projectId,PROJECT);assert.ok(t.upTaskId==='-1'||byId.has(t.upTaskId),'Missing parent');}
 const roots=tasks.filter(t=>t.upTaskId==='-1').sort((a,b)=>Number(a.orderNumber)-Number(b.orderNumber));
 const models=roots.map(t=>{const d=byPost.get(t.postId);return {id:t.taskId,postId:t.postId,title:d.title,brand:d.tasks?.[0]?.SECTION_NAME||'그룹 미지정'};});
 const modelById=new Map(models.map(m=>[m.id,m]));
 const docs=tasks.filter(t=>t.upTaskId!=='-1').sort((a,b)=>Number(a.orderNumber)-Number(b.orderNumber)).map(t=>{
  const m=modelById.get(t.upTaskId),d=byPost.get(t.postId);assert.ok(m,'Unsupported deeper nesting');
  return {id:t.postId,title:d.title,modelId:m.id,model:m.title,brand:m.brand,...parseContent(d),author:d.registerName||'',date:d.registeredDateTime||'',editedDateTime:d.editedDateTime||value(t,'EDTR_DTTM')?.customColumnData||'',status:value(t,'STATUS')?.optionName||'',url:d.connectUrl||'https://flow.team/main.act?detail='+PROJECT+'|'+t.postId};
 });
 // An incomplete response or a permission change must never erase published articles.
 for(const d of previous.docs)assert.ok(docs.some(n=>n.id===d.id),'Published document absent from API: '+d.id);
 for(const m of previous.models)assert.ok(models.some(n=>n.id===m.id),'Published model absent from API: '+m.id);
 for(const m of models){const t=byId.get(m.id);assert.equal(docs.filter(d=>d.modelId===m.id).length,Number(t.subTaskCount),'Incomplete children: '+m.title);}
 return {projectId:PROJECT,fetchedAt:previous.fetchedAt,brands:[...new Set([...previous.brands,...models.map(m=>m.brand)])],models,docs,assets:{},expectedRows:tasks.length};
}
async function api(endpoint,key){
 for(let attempt=0;attempt<4;attempt++){
  const r=await fetch('https://api.flow.team'+endpoint,{headers:{'x-flow-api-key':key},signal:AbortSignal.timeout(45000),redirect:'error'});
  if((r.status===429||r.status>=500)&&attempt<3){await new Promise(r=>setTimeout(r,2000*2**attempt));continue;}
  const j=await r.json();assert.ok(r.ok&&j.response?.success,'Flow API request failed ('+r.status+'): '+endpoint);return j.response.data;
 }
}
async function collectTasks(key){let cursor=0,out=[];const seen=new Set();for(let i=0;i<1000;i++){
 assert.ok(!seen.has(cursor),'Repeated pagination cursor');seen.add(cursor);
 const p=await api('/user/posts/projects/'+PROJECT+'/tasks/filter?pageSize=100&cursor='+cursor,key);
 assert.ok(Array.isArray(p.tasks));out.push(...p.tasks);if(p.hasNext===false)return out;assert.equal(p.hasNext,true);assert.ok(Number.isInteger(p.lastCursor)&&p.lastCursor>cursor);cursor=p.lastCursor;
 }throw Error('Pagination limit exceeded');}
function fingerprint(tasks){return JSON.stringify(tasks.map(t=>[t.taskId,t.postId,t.upTaskId,t.sectionId,t.orderNumber,t.subTaskCount,value(t,'EDTR_DTTM')?.customColumnData,value(t,'TASK_NM')?.customColumnData]).sort());}
async function loadAssets(data,previous){for(const d of data.docs)for(const image of d.images){
 const url=image.url;if(data.assets[url])continue;
 if(/^data:image\/(png|jpeg|gif);base64,/.test(previous.assets[url]||'')){data.assets[url]=previous.assets[url];continue;}
 const u=new URL(url);assert.ok(u.protocol==='https:'&&u.hostname==='flow.team'&&u.pathname.startsWith('/flowImg/'),'Unexpected image host/path');
 // Public original images need no API key. Never send credentials to an image host.
 const r=await fetch(url,{signal:AbortSignal.timeout(45000),redirect:'error'});assert.ok(r.ok,'Image download failed: '+d.id);
 const b=Buffer.from(await r.arrayBuffer());assert.ok(b.length<=25*1024*1024,'Image too large');
 const mime=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':b[0]===255&&b[1]===216?'image/jpeg':/^GIF8[79]a$/.test(b.subarray(0,6).toString())?'image/gif':null;
 assert.ok(mime,'Invalid image response: '+d.id);data.assets[url]='data:'+mime+';base64,'+b.toString('base64');
 }}
async function main(){
 const filename=path.resolve(process.argv[2]||'index.html'),key=process.env.FLOW_API_KEY?.trim();assert.ok(key,'FLOW_API_KEY is required');
 const modular=fs.existsSync(path.join(path.dirname(filename),'data/index.json'));
 const html=fs.readFileSync(filename,'utf8'),previous=modular?readDataset(path.dirname(filename)):readSource(html),tasks=await collectTasks(key),details=[];
 for(const task of tasks)details.push(await api('/user/posts/'+task.postId,key));
 const split=partition(tasks,details);
 const publicPrevious={...previous,brands:previous.brands.filter(b=>b!==GROUP),models:previous.models.filter(m=>!split.privateIds.has(m.id)),docs:previous.docs.filter(d=>!split.privatePostIds.has(d.id))};
 const collected=makeData(publicPrevious,split.publicTasks,split.publicDetails);
 const next={...previous,...collected,models:collected.models.map(m=>({...previous.models.find(p=>p.id===m.id),...m})),docs:collected.docs.map(d=>({...previous.docs.find(p=>p.id===d.id),...d}))};await loadAssets(next,previous);
 const detailMap=new Map(details.map(d=>[d.postId,d]));
 const internal={...(process.env.NAMU_SYNC_TOKEN?{syncToken:process.env.NAMU_SYNC_TOKEN}:{}),docs:split.privateTasks.map(t=>{const d=detailMap.get(t.postId);assert.equal(d.projectId,PROJECT);return {id:d.postId,parentId:t.upTaskId,title:d.title,...parseContent(d),author:d.registerName||'',date:d.registeredDateTime||'',editedDateTime:d.editedDateTime||'',attachments:d.attachments||[],url:d.connectUrl||'https://flow.team/main.act?detail='+PROJECT+'|'+d.postId};}),assets:{}};
 await loadAssets(internal,{assets:{}});
 const privatePath=path.join(path.dirname(filename),'internal/encrypted.json');
 const oldEnvelope=fs.existsSync(privatePath)?JSON.parse(fs.readFileSync(privatePath,'utf8')):null;
 const encrypted=encrypt(internal,process.env.INTERNAL_PASSWORD,oldEnvelope);
 assert.equal(fingerprint(await collectTasks(key)),fingerprint(tasks),'Flow changed during collection; retry next run');
 const unchanged=JSON.stringify(next)===JSON.stringify(previous);
 if(!unchanged){next.fetchedAt=new Date().toISOString();assert.ok(!JSON.stringify(next).includes(key),'Credential leaked');if(modular){writeDataset(path.dirname(filename),next);assert.equal(fs.readFileSync(filename,'utf8'),html,'UI changed');}else{const result=replaceSource(html,next);assert.equal(result.replace(DATA,'DATA'),html.replace(DATA,'DATA'),'UI changed');assert.ok(Buffer.byteLength(result)<95*1024*1024,'HTML exceeds repository size limit');fs.writeFileSync(filename+'.tmp',result);fs.renameSync(filename+'.tmp',filename);}}
 fs.mkdirSync(path.dirname(privatePath),{recursive:true});fs.writeFileSync(privatePath,JSON.stringify(encrypted));
 if(modular)pruneGenerated(path.dirname(filename));
 if(modular)fs.writeFileSync(path.join(path.dirname(filename),'data/sync-status.json'),JSON.stringify({completedAt:new Date().toISOString()})+'\n');
 console.log(JSON.stringify({changed:!unchanged,documents:next.docs.length,models:next.models.length,images:Object.keys(next.assets).length}));
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'changed='+!unchanged+'\n');
}
module.exports={readSource,replaceSource,parseContent,makeData,fingerprint,loadAssets};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
