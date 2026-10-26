const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {partition,encrypt}=require('./internal.cjs');
const task=(id,parent,section,count=0)=>({taskId:id,postId:id,sectionId:section,upTaskId:parent,subTaskCount:String(count)});
test('exact group matching, descendants, private roots and private children are isolated',()=>{
 const tasks=[task('1','-1','public',1),task('2','1','secret'),task('3','-1','secret',1),task('4','3','other'),task('5','-1','similar')];
 const details=tasks.map(t=>({postId:t.postId,tasks:[{SECTION_NAME:t.sectionId==='secret'?'내부 전용':t.sectionId==='similar'?'내부 전용 아님':'AUWII'}]}));
 const result=partition(tasks,details);assert.deepEqual(result.publicTasks.map(t=>t.taskId),['1','5']);assert.equal(result.publicTasks[0].subTaskCount,'0');assert.deepEqual(result.privateTasks.map(t=>t.taskId),['2','3','4']);assert.throws(()=>partition(tasks.slice(0,3),details));
});
test('encrypted bundle exposes no plaintext and decrypts only with correct password; session salt stays stable',()=>{
 const password=crypto.randomBytes(16).toString('hex'),data={docs:[{title:'secret-title',body:'secret-body'}],assets:{}};
 const e=encrypt(data,password);assert.ok(!JSON.stringify(e).includes('secret-title'));
 const decode=p=>{const key=crypto.pbkdf2Sync(p,Buffer.from(e.salt,'base64'),e.iterations,32,'sha256'),cipher=Buffer.from(e.ciphertext,'base64');const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));d.setAAD(Buffer.from('NAMU Internal Access v1'));d.setAuthTag(cipher.subarray(-16));return JSON.parse(Buffer.concat([d.update(cipher.subarray(0,-16)),d.final()]));};
 assert.deepEqual(decode(password),data);assert.throws(()=>decode('wrong'));assert.throws(()=>encrypt(data,''));const second=encrypt(data,password,e);assert.equal(second.salt,e.salt);assert.notEqual(second.iv,e.iv);
});
