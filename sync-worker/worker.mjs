const ORIGIN='https://namumg.github.io',REPO='namumg/NAMU',WORKFLOW='flow-sync.yml';
const active=r=>!['completed'].includes(r.status);
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin===ORIGIN)Object.assign(headers,{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'});
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin!==ORIGIN)return reply({error:'허용되지 않은 요청입니다.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!env.NAMU_SYNC_TOKEN||!env.GITHUB_ACTIONS_TOKEN)return reply({error:'동기화 연결을 설정 중입니다.'},503);
  const supplied=request.headers.get('Authorization')||'';
  const digest=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [a,b]=await Promise.all([digest(supplied),digest('Bearer '+env.NAMU_SYNC_TOKEN)]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  if(diff)return reply({error:'내부 전용 잠금을 해제한 후 다시 시도해주세요.'},401);
  const url=new URL(request.url);
  async function gh(endpoint,method='GET',body){
   const r=await fetch('https://api.github.com/repos/'+REPO+endpoint,{method,headers:{'Authorization':'Bearer '+env.GITHUB_ACTIONS_TOKEN.trim(),'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'NAMU-Flow-Sync','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'manual'});
   if(!r.ok){const error=Error('GitHub request failed');error.code='GITHUB_'+r.status;throw error;}return r.status===204?null:r.json();
  }
  const summarize=r=>({runId:r.id,status:r.status,conclusion:r.conclusion,createdAt:r.created_at});
  try{
   if(url.pathname==='/sync'&&request.method==='POST'){
    const recent=await gh('/actions/workflows/'+WORKFLOW+'/runs?per_page=30');
    const running=recent.workflow_runs.find(r=>active(r)&&r.event!=='push');
    if(running)return reply({...summarize(running),alreadyRunning:true},202);
    const last=recent.workflow_runs.find(r=>r.event==='workflow_dispatch'&&r.display_title?.startsWith('NAMU web sync '));
    if(last&&Date.now()-Date.parse(last.created_at)<60000)return reply({...summarize(last),alreadyRunning:true},202);
    const requestId=crypto.randomUUID();
    await gh('/actions/workflows/'+WORKFLOW+'/dispatches','POST',{ref:'main',inputs:{web_request_id:requestId}});
    return reply({requestId,status:'queued'},202);
   }
   if(url.pathname==='/status'&&request.method==='GET'){
    const runId=url.searchParams.get('runId'),requestId=url.searchParams.get('requestId');let run;
    if(runId&&/^\d{1,20}$/.test(runId)){
     run=await gh('/actions/runs/'+runId);
     if(run.path!=='.github/workflows/'+WORKFLOW)return reply({error:'잘못된 실행입니다.'},404);
    }else if(requestId&&/^[a-f0-9-]{36}$/.test(requestId)){
     const list=await gh('/actions/workflows/'+WORKFLOW+'/runs?event=workflow_dispatch&per_page=30');
     run=list.workflow_runs.find(r=>r.display_title==='NAMU web sync '+requestId);
    }else return reply({error:'잘못된 요청입니다.'},400);
    return reply(run?summarize(run):{status:'queued',requestId});
   }
   return reply({error:'지원되지 않는 요청입니다.'},404);
  }catch(error){return reply({error:'동기화 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',code:error.code||(/header/i.test(error.message)?'INVALID_HEADER':/fetch/i.test(error.message)?'FETCH_FAILED':error.name)},502);}
 }
};
