const lockIcon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/></svg>';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const base64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const sessionKey='namu-internal-session-v1';
const date=s=>String(s||'').replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2}).*$/,'$1.$2.$3 $4:$5');
export function mountInternal({renderBody}){
 const article=document.getElementById('article'),bread=document.getElementById('bread');
 const button=document.createElement('a');button.href='#/internal';button.className='internal-access-button';button.innerHTML=lockIcon+'<span>내부 전용</span>';document.getElementById('sidebar').append(button);
 let data=null,active=false,generation=0,assetURLs={},urls=[];
 const clear=()=>{data=null;urls.forEach(URL.revokeObjectURL);urls=[];assetURLs={};const lightbox=document.getElementById('lightbox');lightbox.close();document.getElementById('largeImage').removeAttribute('src');};
 const removeSession=()=>{try{sessionStorage.removeItem(sessionKey)}catch{}};
 const saveSession=value=>{try{sessionStorage.setItem(sessionKey,JSON.stringify(value))}catch{}};
 const header=()=>'<header class="document-header internal-heading"><div class="eyebrow">'+lockIcon+' 내부 전용</div><div class="document-actions">'+(data?'<button id="internalRefresh">새로고침</button><button id="internalLock">'+lockIcon+' 잠금</button>':'')+'</div></header>';
 async function envelope(){const r=await fetch(new URL('../internal/encrypted.json',import.meta.url),{cache:'no-store'});if(!r.ok)throw Error('자료를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');const e=await r.json();if(e.version!==1||e.iterations!==600000)throw Error('자료 형식을 확인할 수 없습니다.');return e;}
 async function unlock(e,raw){const k=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(e.iv),additionalData:new TextEncoder().encode('NAMU Internal Access v1')},k,bytes(e.ciphertext));const result=JSON.parse(new TextDecoder().decode(plain));if(!Array.isArray(result.docs))throw Error('Invalid data');return result;}
 function prepare(result){clear();data=result;for(const [source,uri] of Object.entries(result.assets||{})){const m=uri.match(/^data:(image\/(?:png|jpeg|gif));base64,(.+)$/s);if(!m)continue;const url=URL.createObjectURL(new Blob([bytes(m[2])],{type:m[1]}));urls.push(url);assetURLs[source]=url;}}
 function actions(){document.getElementById('internalLock')?.addEventListener('click',()=>{++generation;removeSession();clear();history.replaceState(null,'','#/internal');login();});document.getElementById('internalRefresh')?.addEventListener('click',()=>{clear();show();});}
 function login(message=''){
  article.innerHTML=header()+'<form class="internal-login" id="internalLogin"><h2>내부 전용 자료</h2><p>비밀번호를 입력해 주세요.</p><label for="internalPassword">비밀번호</label><input id="internalPassword" type="password" autocomplete="current-password" required maxlength="256"><button type="submit">잠금 해제</button><p id="internalError" role="alert">'+esc(message)+'</p></form>';
  const form=document.getElementById('internalLogin'),input=document.getElementById('internalPassword');input.focus();
  form.onsubmit=async ev=>{ev.preventDefault();const ticket=++generation,submit=form.querySelector('button');submit.disabled=true;document.getElementById('internalError').textContent='확인 중…';
   let e;try{e=await envelope();}catch(error){if(active&&ticket===generation){document.getElementById('internalError').textContent=error.message;submit.disabled=false;}return;}
   try{const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(input.value),'PBKDF2',false,['deriveBits']);input.value='';const raw=await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(e.salt),iterations:e.iterations,hash:'SHA-256'},material,256);const result=await unlock(e,raw);if(!active||ticket!==generation)return;saveSession({salt:e.salt,key:base64(raw)});prepare(result);render();}
   catch{if(active&&ticket===generation){document.getElementById('internalError').textContent='비밀번호가 올바르지 않습니다.';submit.disabled=false;input.focus();}}
  };
 }
 function render(){
  if(!active||!data)return;const id=location.hash.match(/^#\/internal\/(\d+)$/)?.[1];
  const d=data.docs.find(x=>x.id===id);article.innerHTML=header();actions();
  if(id&&!d){article.insertAdjacentHTML('beforeend','<p>문서가 삭제되었거나 내부 전용 그룹에서 이동되었습니다.</p><a href="#/internal">목록으로 돌아가기</a>');return;}
  if(d){article.insertAdjacentHTML('beforeend','<div class="internal-document"><a href="#/internal" class="internal-back">← 내부 문서 목록</a><header class="document-header"><div class="eyebrow">내부 전용</div><h1>'+esc(d.title)+'</h1><div class="meta"><span>'+esc(d.author)+'</span><span>'+esc(date(d.editedDateTime||d.date))+'</span></div></header><div class="document-body">'+(d.nodes?.length?renderBody(d,assetURLs).replaceAll('class="zoom"','class="internal-zoom"'):'<p class="empty">작성된 본문이 없습니다.</p>')+'</div>'+(d.attachments?.length?'<section class="internal-attachments"><h2>첨부파일</h2><p>첨부파일 '+d.attachments.length+'개 · Flow 원문에서 확인할 수 있습니다.</p></section>':'')+'<div class="end"><a href="'+esc(d.url)+'" target="_blank" rel="noopener noreferrer">Flow에서 원문 보기 ↗</a></div></div>');
   article.querySelectorAll('.internal-zoom').forEach(b=>b.onclick=()=>{document.getElementById('largeImage').src=assetURLs[d.images[Number(b.dataset.index)].url];document.getElementById('lightbox').showModal();});
   article.querySelectorAll('table').forEach(t=>{const wrap=document.createElement('div');wrap.className='table-scroll';t.before(wrap);wrap.append(t);});
  }else{article.insertAdjacentHTML('beforeend','<section class="internal-list"><label for="internalSearch">내부 문서 검색</label><input type="search" id="internalSearch" placeholder="제목 또는 본문 검색"><div id="internalResults"></div></section>');const results=document.getElementById('internalResults'),input=document.getElementById('internalSearch');const filter=()=>{const q=input.value.trim().toLocaleLowerCase(),docs=data.docs.filter(d=>(d.title+' '+d.body).toLocaleLowerCase().includes(q));results.innerHTML=docs.length?docs.map(d=>'<a class="internal-document-link" href="#/internal/'+d.id+'"><strong>'+esc(d.title)+'</strong><span>'+esc(date(d.editedDateTime||d.date))+'</span></a>').join(''):'<p class="empty">'+(q?'검색 결과가 없습니다.':'등록된 내부 문서가 없습니다.')+'</p>';};input.oninput=filter;filter();}
  document.title=(d?d.title+' · ':'')+'Internal Access · NAMU';
 }
 async function show(){
  active=true;button.setAttribute('aria-current','page');const ticket=++generation;document.querySelector('.page-grid').classList.remove('home-grid');document.getElementById('toc').innerHTML='';document.getElementById('sidebar').classList.remove('visible');document.getElementById('menu').setAttribute('aria-expanded','false');bread.innerHTML='<button class="reopen-sidebar" id="reopenSidebar" aria-label="목차 펼치기">☰ 목차</button><a href="#/">메인</a><span>/</span><span>내부 전용</span>';window.scrollTo(0,0);
  if(data){render();return;}article.innerHTML='<p role="status">내부 전용 영역을 확인하는 중…</p>';
  let session;try{session=JSON.parse(sessionStorage.getItem(sessionKey));}catch{}
  if(session){try{const e=await envelope();if(e.salt!==session.salt)throw Error('Session expired');const result=await unlock(e,bytes(session.key));if(!active||ticket!==generation)return;prepare(result);render();return;}catch{removeSession();}}
  if(active&&ticket===generation)login();
 }
 return {show,leave(){active=false;++generation;button.removeAttribute('aria-current');clear();}};
}
