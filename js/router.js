export function createRouter(show){
 const parse=()=>{const m=location.hash.match(/^#\/article\/(\d+)(?:\/([^?]+))?$/);return m?{id:m[1],anchor:m[2]||''}:{id:null};};
 const apply=()=>show(parse());window.addEventListener('hashchange',apply);
 return {start:apply,go(id){const hash=id?'#/article/'+encodeURIComponent(id):'#/';if(location.hash===hash)apply();else location.hash=hash;},anchor(id,anchor){location.hash='#/article/'+id+'/'+anchor;}};
}
