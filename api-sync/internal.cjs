'use strict';
const crypto=require('node:crypto'),assert=require('node:assert/strict');
const GROUP='내부 전용',ITERATIONS=600000;
// SECTION_NAME and sectionId are read from the existing, verified Flow task/detail APIs.
function partition(tasks,details){
 const byPost=new Map(details.map(d=>[d.postId,d])),sections=new Set();
 for(const t of tasks){const d=byPost.get(t.postId);assert.ok(d,'Missing task detail');
  if(d.tasks?.some(x=>x.SECTION_NAME===GROUP)||t.columns?.some(c=>c.defaultColumnType==='SECTION'&&c.columnData?.some(x=>x.optionName===GROUP))){assert.ok(t.sectionId,'Internal section ID missing');sections.add(t.sectionId);}
 }
 const privateIds=new Set(tasks.filter(t=>sections.has(t.sectionId)).map(t=>t.taskId));
 let changed=true;while(changed){changed=false;for(const t of tasks)if(privateIds.has(t.upTaskId)&&!privateIds.has(t.taskId)){privateIds.add(t.taskId);changed=true;}}
 const privateTasks=tasks.filter(t=>privateIds.has(t.taskId)),publicTasks=tasks.filter(t=>!privateIds.has(t.taskId));
 const publicPostIds=new Set(publicTasks.map(t=>t.postId));
 // A public parent may contain private children: validate its original count first.
 for(const t of tasks)assert.equal(tasks.filter(c=>c.upTaskId===t.taskId).length,Number(t.subTaskCount),'Incomplete Flow children');
 return {privateTasks,privateIds,privatePostIds:new Set(privateTasks.map(t=>t.postId)),publicTasks:publicTasks.map(t=>({...t,subTaskCount:String(publicTasks.filter(c=>c.upTaskId===t.taskId).length)})),publicDetails:details.filter(d=>publicPostIds.has(d.postId))};
}
function encrypt(data,password,previous){
 assert.ok(password,'INTERNAL_PASSWORD secret is required');
 const salt=previous?.salt?Buffer.from(previous.salt,'base64'):crypto.randomBytes(16);
 const key=crypto.pbkdf2Sync(password,salt,ITERATIONS,32,'sha256'),iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('NAMU Internal Access v1'));
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final(),cipher.getAuthTag()]);
 return {version:1,algorithm:'AES-GCM',kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:encrypted.toString('base64')};
}
module.exports={GROUP,partition,encrypt};
