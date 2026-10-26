const ENDPOINT='https://namu-flow-sync.namumksong.workers.dev';
export function createFlowSync({getToken,onComplete}){
 let running=false,message='',controller=null;
 const update=()=>{const button=document.getElementById('internalSync');if(button){button.disabled=running;button.textContent=running?'동기화 중…':'FLOW 동기화';button.title='Flow 자료를 수집하고 사이트를 갱신합니다.';}
  let status=document.getElementById('flowSyncStatus');const header=document.querySelector('.internal-heading');if(!status&&header){status=document.createElement('p');status.id='flowSyncStatus';status.setAttribute('role','status');status.style.cssText='font-size:12px;color:var(--muted);margin:8px 0 16px';header.after(status);}if(status){status.textContent=message;status.hidden=!message;}};
 async function start(){
  if(running)return;const token=getToken();if(!token){message='연결 정보를 갱신하려면 페이지를 새로고침해 주세요.';update();return;}
  running=true;controller=new AbortController();const signal=controller.signal;message='Flow 동기화를 요청하고 있습니다…';update();
  async function api(path,method='GET'){const r=await fetch(ENDPOINT+path,{method,headers:{Authorization:'Bearer '+token},signal:AbortSignal.any([signal,AbortSignal.timeout(20000)]),cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'동기화 요청에 실패했습니다.');return data;}
  try{
   let state=await api('/sync','POST');const deadline=Date.now()+15*60*1000;let failures=0;
   while(Date.now()<deadline){
    if(state.status==='completed'){
     if(state.conclusion!=='success')throw Error('동기화가 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
     message='동기화 완료 · 최신 자료를 불러오는 중…';update();await onComplete(signal,state.createdAt);return;
    }
    message=state.status==='in_progress'?'Flow 자료 수집 및 사이트 반영 중…':'동기화 실행 대기 중…';update();
    await new Promise((resolve,reject)=>{const finish=()=>{signal.removeEventListener('abort',cancel);resolve();},timer=setTimeout(finish,5000),cancel=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};signal.addEventListener('abort',cancel,{once:true});});
    try{state=await api('/status?'+(state.runId?'runId='+state.runId:'requestId='+state.requestId));failures=0;}catch(error){if(signal.aborted||++failures>=3)throw error;}
   }
   throw Error('처리가 지연되고 있습니다. 잠시 후 다시 확인해 주세요.');
  }catch(error){if(!signal.aborted)message=error.message;}finally{running=false;controller=null;update();}
 }
 return {start,update,cancel(){controller?.abort();message='';running=false;update();}};
}
