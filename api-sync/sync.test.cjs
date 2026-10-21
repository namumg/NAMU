const {test}=require('node:test'),assert=require('node:assert/strict');
const {replaceSource,readSource,parseContent,makeData,loadAssets}=require('./sync.cjs');
test('updates only JSON, preserving theme/scripts and escaping closing tags',()=>{
 const html='<style>original theme</style><script id="source" type="application/json">{}</script><script>original code</script>';
 const data={title:'</script><script>bad</script> $&'};const out=replaceSource(html,data);assert.deepEqual(readSource(out),data);assert.equal(out.replace(/<script id="source"[\s\S]*?<\/script>/,'DATA'),html.replace(/<script id="source"[\s\S]*?<\/script>/,'DATA'));assert.throws(()=>replaceSource(html+html,data));
});
test('original image order, single line breaks, preview links and inert scripts',()=>{
 const c=parseContent({postId:'1',htmlContent:encodeURIComponent('<p>A<br>B</p><div class="js-post-img" atch_url="https://flow.team/flowImg/test.png"></div><p>C</p><div class="js-direct-href" data-preview-url="https://youtu.be/abc"><img class="js-box-image" src="https://external.test/thumbnail.jpg"><span>Video</span></div><script>throw Error()</script>')});
 assert.deepEqual(c.nodes.map(n=>n.tag),['p','img','p','a']);assert.equal(c.images.length,1);assert.equal(c.nodes[0].children[1].tag,'br');assert.equal(c.nodes[3].href,'https://youtu.be/abc');
 assert.throws(()=>parseContent({postId:'1',outContent:'nonempty'}));
});
test('brand/model hierarchy, empty models and count validation',()=>{
 const previous={projectId:'2970230',fetchedAt:'old',brands:['AUWII','Empty'],models:[],docs:[]};
 const tasks=[{taskId:'1',postId:'11',projectId:'2970230',upTaskId:'-1',subTaskCount:'1',orderNumber:'1'},{taskId:'2',postId:'12',projectId:'2970230',upTaskId:'1',subTaskCount:'0',orderNumber:'2'},{taskId:'3',postId:'13',projectId:'2970230',upTaskId:'-1',subTaskCount:'0',orderNumber:'3'}];
 const details=tasks.map(t=>({projectId:'2970230',postId:t.postId,title:t.postId,tasks:[{SECTION_NAME:'AUWII'}],htmlContent:'<p>text</p>'}));
 const result=makeData(previous,tasks,details);assert.equal(result.models.length,2);assert.equal(result.docs[0].modelId,'1');assert.ok(result.brands.includes('Empty'));
 assert.throws(()=>makeData({...previous,docs:[{id:'99'}]},tasks,details));assert.throws(()=>makeData(previous,tasks.slice(1),details.slice(1)));
 assert.throws(()=>makeData(previous,tasks.map(t=>t.taskId==='1'?{...t,subTaskCount:'2'}:t),details));
});
test('asset requests reject foreign hosts without leaking API credentials',async()=>{await assert.rejects(loadAssets({docs:[{images:[{url:'https://example.org/a.png'}]}],assets:{}},{assets:{}}));});
