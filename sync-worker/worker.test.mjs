import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const env={NAMU_SYNC_TOKEN:'test-capability',GITHUB_ACTIONS_TOKEN:'test-github-token'};
const req=(path,method='GET',token='test-capability',origin='https://namumg.github.io')=>new Request('https://worker.example'+path,{method,headers:{Origin:origin,Authorization:'Bearer '+token}});
test('rejects unauthorized origin and capability before contacting GitHub',async()=>{
 const old=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected network');};try{assert.equal((await worker.fetch(req('/sync','POST','bad'),env)).status,401);assert.equal((await worker.fetch(req('/sync','POST','test-capability','https://other.test'),env)).status,403);assert.equal((await worker.fetch(req('/sync','OPTIONS'),env)).status,204);}finally{globalThis.fetch=old;}
});
test('dispatches only the fixed workflow and returns a request identifier',async()=>{
 const old=globalThis.fetch,calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return options.method==='POST'?new Response(null,{status:204}):Response.json({workflow_runs:[]});};try{const r=await worker.fetch(req('/sync','POST'),env),j=await r.json();assert.equal(r.status,202);assert.match(j.requestId,/^[a-f0-9-]{36}$/);assert.equal(calls.length,2);assert.equal(calls[1].url,'https://api.github.com/repos/namumg/NAMU/actions/workflows/flow-sync.yml/dispatches');assert.deepEqual(JSON.parse(calls[1].options.body),{ref:'main',inputs:{web_request_id:j.requestId}});assert.ok(!JSON.stringify(j).includes(env.GITHUB_ACTIONS_TOKEN));}finally{globalThis.fetch=old;}
});
test('reuses running sync and reports completion without leaking upstream details',async()=>{
 const old=globalThis.fetch;globalThis.fetch=async()=>Response.json({workflow_runs:[{id:23,event:'workflow_dispatch',status:'in_progress',created_at:'2026-10-26T01:00:00Z'}]});try{const j=await(await worker.fetch(req('/sync','POST'),env)).json();assert.equal(j.runId,23);assert.equal(j.alreadyRunning,true);globalThis.fetch=async()=>Response.json({id:23,status:'completed',conclusion:'success',path:'.github/workflows/flow-sync.yml'});assert.equal((await(await worker.fetch(req('/status?runId=23'),env)).json()).conclusion,'success');globalThis.fetch=async()=>new Response('private upstream details',{status:403});const failed=await worker.fetch(req('/sync','POST'),env);assert.equal(failed.status,502);assert.ok(!(await failed.text()).includes('private upstream'));}finally{globalThis.fetch=old;}
});
