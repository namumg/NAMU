const base=new URL('../',import.meta.url),cache=new Map();let manifest;
export const assetURL=p=>new URL(p,base).href;
async function json(p,options={}){const response=await fetch(assetURL(p),{signal:AbortSignal.timeout(20000),...options});if(!response.ok)throw Error('자료를 불러오지 못했습니다. ('+response.status+')');return response.json();}
export async function loadIndex(){manifest=await json('data/index.json',{cache:'no-cache'});const sync=await json('data/sync-status.json',{cache:'no-cache'}).catch(()=>null);return {...manifest,syncedAt:sync?.completedAt,assets:{}};}
function cached(path){if(!cache.has(path))cache.set(path,json(path).catch(e=>{cache.delete(path);throw e}));return cache.get(path);}
export async function loadArticle(id){const meta=manifest.docs.find(d=>d.id===id);if(!meta)throw Error('문서를 찾을 수 없습니다.');const result=await cached(meta.articlePath);if(result.document.id!==id)throw Error('문서 식별자가 일치하지 않습니다.');return {document:result.document,assets:Object.fromEntries(Object.entries(result.assets).map(([u,p])=>[u,assetURL(p)]))};}
export const loadSearch=()=>cached(manifest.searchPath);
export const loadSynonyms=()=>cached('data/synonyms.json');
