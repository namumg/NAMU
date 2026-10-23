'use strict';
function decide(runs,now=Date.now()){
 const hour=Math.floor(now/3600000)*3600000;
 const relevant=runs.filter(r=>['schedule','workflow_dispatch'].includes(r.event));
 if(relevant.some(r=>r.status!=='completed'))return {action:'wait',reason:'An update is already queued or running'};
 if(relevant.some(r=>r.conclusion==='success'&&Date.parse(r.run_started_at||r.created_at)>=hour))return {action:'skip',reason:'This hour already completed'};
 const latest=relevant[0];if(latest&&Date.parse(latest.created_at)>=hour&&latest.conclusion!=='success')return Number(latest.run_attempt||1)<3?{action:'rerun',id:latest.id}:{action:'stop',reason:'Three attempts failed; manual attention required'};
 return {action:'dispatch',reason:'No successful update for this hour'};
}
async function main(){const token=process.env.GITHUB_TOKEN,repo=process.env.GITHUB_REPOSITORY;if(repo!=='namumg/NAMU'||!token)throw Error('Repository credentials unavailable');
 const api=async(p,method='GET',body)=>{const r=await fetch('https://api.github.com/repos/'+repo+p,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('GitHub request failed: '+r.status);return r.status===204||r.status===201?{}:r.json();};
 const runs=(await api('/actions/workflows/flow-sync.yml/runs?per_page=100')).workflow_runs,choice=decide(runs);console.log(choice);
 if(choice.action==='dispatch')await api('/actions/workflows/flow-sync.yml/dispatches','POST',{ref:'main'});
 if(choice.action==='rerun')await api('/actions/runs/'+choice.id+'/rerun','POST');
 if(choice.action==='stop')throw Error(choice.reason);
}
module.exports={decide};if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
