import {loadIndex,loadArticle} from "./data-loader.js";
import {createRouter} from "./router.js";
import {mountSearch} from "./search.js";
import {recommend} from "./recommendations.js";
import {mountInternal} from "./internal.js";
export async function start(){
function youtubeVideo(href){
 try{const u=new URL(href);if(u.protocol!=='https:'&&u.protocol!=='http:')return null;
 const host=u.hostname.toLowerCase();let id;
 if(host==='youtu.be')id=u.pathname.split('/')[1];
 else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):/^\/(embed|shorts|live)\//.test(u.pathname)?u.pathname.split('/')[2]:null;
 if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))return null;
 const t=u.searchParams.get('start')||u.searchParams.get('t')||'';let start=0;
 if(/^\d+$/.test(t))start=Number(t);else{const m=t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);if(m)start=Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0)}
 return 'https://www.youtube-nocookie.com/embed/'+id+'?playsinline=1&rel=0'+(start?'&start='+start:'');
 }catch{return null}
}
'use strict';
const source=await loadIndex(),$=id=>document.getElementById(id);let searchController;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hiddenBrand=b=>['그룹 미지정','미분류'].includes(String(b).trim());
source.brands=(source.brands||[...new Set(source.models.map(m=>m.brand))]).filter(b=>!hiddenBrand(b));
source.models=source.models.filter(m=>!hiddenBrand(m.brand));
source.docs=source.docs.filter(d=>!hiddenBrand(d.brand));
let current=null;const opened=new Map();
const formatDate=s=>s?String(s).slice(0,8).replace(/(\d{4})(\d{2})(\d{2})/,'$1.$2.$3'):'';
function renderTree(){
const query='';
const filtered=source.docs.filter(d=>(d.brand+' '+d.model+' '+d.title+' '+d.body).toLowerCase().includes(query));
const brands=[...(source.brands||new Set(source.models.map(m=>m.brand)))].sort((a,b)=>a==='미분류'?1:b==='미분류'?-1:a.localeCompare(b));
let html='<div class="side-label">브랜드 / 모델</div>';
for(const brand of brands){const models=source.models.filter(m=>m.brand===brand&&(!query||filtered.some(d=>d.modelId===m.id)||(brand+' '+m.title).toLowerCase().includes(query))).sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true}));if(!models.length&&query)continue;const key='brand:'+brand;html+='<details data-key="'+esc(key)+'" '+(query||opened.get(key)===true?'open':'')+'><summary>'+esc(brand)+'<span class="count">'+filtered.filter(d=>d.brand===brand).length+'</span></summary><div class="models">';
for(const model of models){const docs=filtered.filter(d=>d.modelId===model.id).sort((a,b)=>a.id.localeCompare(b.id));const mk='model:'+model.id;html+='<details data-key="'+mk+'" '+(query||opened.get(mk)===true?'open':'')+'><summary>'+esc(model.title)+'<span class="count">'+docs.length+'</span></summary><div class="docs">'+(docs.length?docs.map(d=>'<button class="doc '+(d.id===current?'active':'')+'" title="'+esc(d.title)+'" data-id="'+d.id+'" '+(d.id===current?'aria-current="page"':'')+'>'+esc(d.title)+'</button>').join(''):'<div class="empty-model">등록된 하위 문서가 없습니다.</div>')+'</div></details>'}if(!models.length)html+='<div class="empty-model">등록된 모델이 없습니다. · 0건</div>';html+='</div></details>'}
$('tree').innerHTML=html.includes('<details')?html:'<div class="no-results">검색 결과가 없습니다.</div>';
$('tree').querySelectorAll('details').forEach(el=>el.addEventListener('toggle',()=>{if(!$('search').value.trim())opened.set(el.dataset.key,el.open)}));}
function textBody(body){const pieces=body.split(/(▶\s*(?:해결방법|상세 정보|문제 발생 이유))/);return pieces.map(piece=>/^▶/.test(piece)?'<h2>'+esc(piece.replace(/^▶\s*/,''))+'</h2>':'<p>'+esc(piece).replace(/([①②③④⑤⑥⑦⑧⑨⑩])/g,'<br>$1').replace(/·/g,'<br>·').replace(/https?:\/\/[^\s<]+/g,url=>'<a href="'+url+'" target="_blank" rel="noopener">'+url+'</a>')+'</p>').join('')}
function originalBody(nodes,d,assets=source.assets){const allowed=new Set(['p','div','span','strong','b','em','i','u','s','h1','h2','h3','h4','h5','h6','ul','ol','li','table','thead','tbody','tr','td','th','blockquote','pre','code','sub','sup']);const renderNode=n=>{if(typeof n.text==='string')return esc(n.text);if(n.tag==='img'){const i=d.images.findIndex(im=>im.url===n.src);if(i<0||!assets[n.src])return '';return '<figure class="figure"><button class="zoom" data-index="'+i+'" aria-label="이미지 확대"><img src="'+esc(assets[n.src])+'" alt="'+esc(d.title)+' 참고 이미지" loading="lazy"></button></figure>'}const inner=(n.children||[]).map(renderNode).join('');if(n.tag==='br')return '<br>';if(n.tag==='a'){const href=n.href||'';const video=youtubeVideo(href);if(video)return '<span class="youtube-video" style="display:block;max-width:720px;margin:18px 0"><iframe src="'+esc(video)+'" title="'+esc(d.title)+' · YouTube 영상" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="display:block;width:100%;aspect-ratio:16/9;min-height:200px;border:0;border-radius:10px;background:#111"></iframe><a href="'+esc(href)+'" target="_blank" rel="noopener" style="display:inline-block;font-size:11px;margin-top:5px">YouTube에서 보기 ↗</a></span>';return /^https?:\/\//i.test(href)?'<a href="'+esc(href)+'" target="_blank" rel="noopener">'+inner+'</a>':inner}if(allowed.has(n.tag))return '<'+n.tag+'>'+inner+'</'+n.tag+'>';return inner};return nodes.map(renderNode).join('')}
function decorateTags(){const walker=document.createTreeWalker($('article').querySelector('.document-body'),NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){if(n.parentElement.closest('a,code,pre'))continue;const matches=[...n.textContent.matchAll(/#[\p{L}\p{N}_-]+/gu)];if(!matches.length)continue;const fragment=document.createDocumentFragment();let cursor=0;for(const m of matches){fragment.append(document.createTextNode(n.textContent.slice(cursor,m.index)));const tag=document.createElement('span');tag.className='wiki-tag';tag.textContent=m[0];fragment.append(tag);cursor=m.index+m[0].length}fragment.append(document.createTextNode(n.textContent.slice(cursor)));n.replaceWith(fragment)}}
function render(id){document.querySelector('.page-grid').classList.remove('home-grid');const d=source.docs.find(x=>x.id===id)||source.docs[0];if(!d){$('article').innerHTML='<div class="empty">등록된 문서가 없습니다.</div>';renderTree();return}current=d.id;
$('bread').innerHTML='<button class="reopen-sidebar" id="reopenSidebar" aria-label="왼쪽 목차 펼치기" aria-controls="sidebar">☰ 목차</button><button class="home-link" data-home>메인</button><span>/</span><span>'+esc(d.brand)+'</span><span>/</span><b>'+esc(d.model)+'</b>';
let html='<div class="eyebrow">'+esc(d.model)+' · TROUBLE SHOOTING</div><h1>'+esc(d.title)+'</h1><div class="meta"><span class="state">Flow 상태 · '+esc(d.status)+'</span><span>'+esc(d.author)+' · '+formatDate(d.date)+' 수정</span><span>'+esc(d.brand)+' / '+esc(d.model)+'</span></div><div class="document-body">';
html+=d.pending?'<div class="section empty">새로 등록된 문서입니다.<br>현재는 제목만 반영되어 있습니다. 아래 Flow 원문 링크에서 본문을 확인해 주세요.</div>':d.body||d.images.length?originalBody(d.nodes,d):'<div class="section empty">Flow에 아직 작성된 본문이 없습니다.</div>';
html+='</div><div class="end"><a href="'+esc(d.url)+'" target="_blank" rel="noopener">Flow에서 원문 보기 ↗</a><button id="topButton">맨 위로 ↑</button></div>';
$('article').innerHTML=html;const headings=[...$('article').querySelectorAll('h2')].filter(h=>h.textContent.trim());headings.forEach((h,i)=>h.id='section-'+i);$('toc').innerHTML='<strong>이 문서에서</strong>'+headings.map(h=>'<a href="#'+h.id+'">'+esc(h.textContent)+'</a>').join('');
decorateTags();$('sidebar').classList.remove('visible');$('menu').setAttribute('aria-expanded','false');document.title=d.title+' · Trouble Shooting';window.scrollTo(0,0);$('topButton').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});$('article').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.parentElement.innerHTML='<div class="image-error">이미지를 불러오지 못했습니다. Flow 원문에서 확인해 주세요.</div>'}));}
$('syncInfo').innerHTML=source.syncedAt?esc(new Date(source.syncedAt).toLocaleString('sv-SE',{timeZone:'Asia/Seoul'}).replace(' ', ', '))+'<br>동기화 완료':'';
$('collapseSidebar').onclick=()=>{document.body.classList.add('sidebar-collapsed');$('reopenSidebar')?.focus()};$('bread').addEventListener('click',e=>{if(e.target.closest('#reopenSidebar')){document.body.classList.remove('sidebar-collapsed');$('collapseSidebar').focus()}});
$('tree').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)render(b.dataset.id)});$('clear').onclick=()=>{$('search').value='';renderTree();$('search').focus()};$('menu').onclick=()=>{const open=$('sidebar').classList.toggle('visible');$('menu').setAttribute('aria-expanded',String(open))};
$('article').addEventListener('click',e=>{const b=e.target.closest('.zoom');if(b){const d=source.docs.find(x=>x.id===current),im=d.images[Number(b.dataset.index)];$('largeImage').src=source.assets[im.url]||im.url;$('lightbox').showModal()}});$('closeLightbox').onclick=()=>$('lightbox').close();$('lightbox').addEventListener('click',e=>{if(e.target===$('lightbox'))$('lightbox').close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('sidebar').classList.remove('visible');$('menu').setAttribute('aria-expanded','false')}});
function renderHome(){
current=null;document.title='NAMU Knowledge Base';
$('bread').innerHTML='<button class="reopen-sidebar" id="reopenSidebar" aria-label="왼쪽 목차 펼치기">☰ 목차</button><span>NAMU Knowledge Base</span><span>/</span><b>전체 문서</b>';
$('toc').innerHTML='';document.querySelector('.page-grid').classList.add('home-grid');
const logo=document.querySelector('.namu-logo');
let html='<div class="home-hero">'+(logo?'<img src="'+logo.src+'" alt="NAMU" class="home-logo">':'')+'<h1>NAMU Knowledge Base</h1><p>브랜드와 모델을 선택하고, 필요한 해결 방법을 찾아보세요.</p><div class="home-stats">'+(source.brands||[...new Set(source.models.map(m=>m.brand))]).length+'개 분류 <span>·</span> '+source.models.length+'개 모델 <span>·</span> '+source.docs.length+'개 문서</div></div><div class="home-catalog">';
for(const brand of [...(source.brands||new Set(source.models.map(m=>m.brand)))].sort((a,b)=>a==='미분류'?1:b==='미분류'?-1:a.localeCompare(b))){
const models=source.models.filter(m=>m.brand===brand).sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true}));
html+='<section class="brand-section"><div class="brand-heading"><h2>'+esc(brand)+'</h2><span>'+models.length+'개 모델</span></div><div class="model-grid">';
for(const model of models){const docs=source.docs.filter(d=>d.modelId===model.id).sort((a,b)=>a.id.localeCompare(b.id));html+='<div class="model-card"><div class="model-heading"><h3>'+esc(model.title)+'</h3><span>'+docs.length+'</span></div><div class="home-docs">'+(docs.length?docs.map(d=>'<button class="home-doc" data-open-doc="'+d.id+'" title="'+esc(d.title)+'"><span>'+esc(d.title)+'</span><i>↗</i></button>').join(''):'<p class="no-docs">등록된 문서가 없습니다.</p>')+'</div></div>'}
if(!models.length)html+='<p class="no-docs">등록된 모델과 문서가 없습니다. · 0건</p>';html+='</div></section>'}
$('article').innerHTML=html+'</div>';renderTree();$('sidebar').classList.remove('visible');$('menu').setAttribute('aria-expanded','false');window.scrollTo(0,0);
}
document.addEventListener('click',e=>{const home=e.target.closest('[data-home]');if(home){renderHome();return}const doc=e.target.closest('[data-open-doc]');if(doc)render(doc.dataset.openDoc)});

function setNamuTheme(dark){
 document.documentElement.dataset.theme=dark?'dark':'light';
 const button=document.getElementById('themeToggle');
 button.textContent=dark?'☀ 라이트모드':'☾ 다크모드';
 button.setAttribute('aria-pressed',String(dark));
 button.setAttribute('aria-label',dark?'라이트모드로 전환':'다크모드로 전환');
 try{localStorage.setItem('namu-theme',dark?'dark':'light')}catch{}
}
let savedTheme;try{savedTheme=localStorage.getItem('namu-theme')}catch{}
setNamuTheme(savedTheme==='dark');
document.getElementById('themeToggle').addEventListener('click',()=>setNamuTheme(document.documentElement.dataset.theme!=='dark'));






// NAMU_UI_ENHANCEMENTS
// UI state is local to this browser; document content remains unchanged.
const uiRead=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}};
const uiSave=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const savedIds=key=>{const v=uiRead(key,[]);return Array.isArray(v)?v.filter(id=>typeof id==='string'&&source.docs.some(d=>d.id===id)):[]};
const favorites=new Set(savedIds('namu-favorites'));
let recentIds=savedIds('namu-recent').slice(0,10);
function highlightText(text,query){text=String(text||'');if(!query)return esc(text);const lower=text.toLocaleLowerCase(),needle=query.toLocaleLowerCase();let out='',offset=0,index;while((index=lower.indexOf(needle,offset))!==-1){out+=esc(text.slice(offset,index))+'<mark>'+esc(text.slice(index,index+query.length))+'</mark>';offset=index+query.length}return out+esc(text.slice(offset))}
function hasDocumentBody(d){return !d.pending&&!!(d.hasBody||String(d.body||'').trim()||d.images?.length||JSON.stringify(d.nodes||[]).includes('"href"'))}
const uiSearch=document.createElement('section');uiSearch.id='searchResults';uiSearch.setAttribute('aria-label','문서 검색 결과');
const uiLibrary=document.createElement('section');uiLibrary.id='quickDocuments';uiLibrary.setAttribute('aria-label','즐겨찾기와 최근 문서');
$('tree').before(uiSearch);$('tree').after(uiLibrary);
function libraryList(ids){return ids.map(id=>source.docs.find(d=>d.id===id)).filter(Boolean).map(d=>'<button class="quick-doc" data-ui-doc="'+esc(d.id)+'" title="'+esc(d.brand+' > '+d.model+' > '+d.title)+'">'+esc(d.title)+'</button>').join('')}
function renderLibrary(){uiLibrary.innerHTML='<details><summary>☆ 즐겨찾기 <span>'+favorites.size+'</span></summary>'+(favorites.size?libraryList([...favorites]):'<p>문서의 별 버튼으로 추가하세요.</p>')+'</details><details><summary>최근 열람 <span>'+recentIds.length+'</span></summary>'+(recentIds.length?libraryList(recentIds):'<p>열람한 문서가 여기에 표시됩니다.</p>')+'</details>'}
function renderSearch(){}
const baseRenderTree=renderTree;
renderTree=function(){baseRenderTree();renderSearch();$('tree').querySelectorAll('summary').forEach(s=>s.title=s.textContent.trim());
 $('tree').querySelectorAll('.doc').forEach(button=>{const title=button.textContent;button.removeAttribute('title');button.dataset.tooltip=title;button.setAttribute('aria-label',title);button.innerHTML='<svg class="document-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg><span class="document-label">'+esc(title)+'</span>'})};

function syncSidebar(d){opened.set('brand:'+d.brand,true);opened.set('model:'+d.modelId,true);renderTree();requestAnimationFrame(()=>{const selected=$('tree').querySelector('[aria-current="page"]');if(!selected)return;const side=$('sidebar'),r=selected.getBoundingClientRect(),s=side.getBoundingClientRect();if(r.top<s.top+20||r.bottom>s.bottom-20)side.scrollTop+=r.top-s.top-side.clientHeight/2})}
function updateFavoriteButton(){const b=$('favoriteDocument');if(!b)return;const on=favorites.has(current);b.textContent=on?'★ 즐겨찾기 해제':'☆ 즐겨찾기';b.setAttribute('aria-pressed',String(on))}
const baseRenderDocument=render;
render=function(id){const d=source.docs.find(x=>x.id===id);if(!d)return;
 baseRenderDocument(id);syncSidebar(d);
 recentIds=[d.id,...recentIds.filter(x=>x!==d.id)].slice(0,10);uiSave('namu-recent',recentIds);renderLibrary();
 $('bread').insertAdjacentHTML('beforeend','<span>/</span><span class="current-path" title="'+esc(d.title)+'">'+esc(d.title)+'</span>');
 const actions=document.createElement('div');actions.className='document-actions';
 actions.innerHTML='<button id="favoriteDocument" type="button"></button>'+(!hasDocumentBody(d)?'<span class="preparing">준비 중</span>':'');
 $('article').querySelector('h1').tabIndex=-1;$('article').querySelector('h1').after(actions);updateFavoriteButton();
 $('favoriteDocument').onclick=()=>{if(favorites.has(d.id))favorites.delete(d.id);else favorites.add(d.id);uiSave('namu-favorites',[...favorites]);updateFavoriteButton();renderLibrary()};
 const date=d.updatedAt||d.editedDateTime||d.date;
 const dateSpan=$('article').querySelector('.meta span:nth-child(2)');
 if(dateSpan){const raw=String(date||''),formatted=/^\d{8}/.test(raw)?raw.slice(0,8).replace(/(\d{4})(\d{2})(\d{2})/,'$1.$2.$3'):/^\d{4}-\d{2}-\d{2}/.test(raw)?raw.slice(0,10):'';dateSpan.textContent=(d.author?d.author+' · ':'')+(formatted?'문서 날짜 '+formatted:'문서 날짜 미제공');dateSpan.title='원본에서 수집된 문서 날짜입니다. 수정일 필드가 있으면 우선 표시합니다.'}
 const body=$('article').querySelector('.document-body');
 const documentHeader=document.createElement('header');documentHeader.className='document-header';
 const headerElements=[...$('article').children].filter(el=>el.matches('.eyebrow,h1,.document-actions,.meta'));
 headerElements[0].before(documentHeader);headerElements.forEach(el=>documentHeader.append(el));
 if(!hasDocumentBody(d)){const empty=body.querySelector('.empty');if(empty)empty.insertAdjacentHTML('afterbegin','<strong class="preparing-title">준비 중</strong>')}
 body.querySelectorAll('table').forEach(table=>{const wrap=document.createElement('div');wrap.className='table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','표 · 좌우로 스크롤');table.before(wrap);wrap.append(table)});
 body.querySelectorAll('p,blockquote').forEach(p=>{if(/^(?:⚠|주의\s*[:：]|경고\s*[:：])/.test(p.textContent.trim()))p.classList.add('warning-note')});
 const headings=[...body.querySelectorAll('h2,h3')].filter(h=>h.textContent.trim());headings.forEach((h,i)=>h.id='section-'+i);
 const links=headings.map(h=>'<a class="'+(h.tagName==='H3'?'subheading':'')+'" href="#'+h.id+'">'+esc(h.textContent)+'</a>').join('');
 $('toc').innerHTML=headings.length?'<strong>이 문서에서</strong>'+links:'';
};
const baseRenderHome=renderHome;
renderHome=function(){baseRenderHome();renderLibrary();renderSearch()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-ui-doc]');if(b){render(b.dataset.uiDoc);if(matchMedia('(max-width:760px)').matches)$('menu').focus();else $('article').querySelector('h1')?.focus()}});
const resizer=document.createElement('div');resizer.id='sidebarResizer';resizer.tabIndex=0;resizer.setAttribute('role','separator');resizer.setAttribute('aria-orientation','vertical');resizer.setAttribute('aria-label','사이드바 너비 조절');resizer.setAttribute('aria-valuemin','240');resizer.setAttribute('aria-valuemax','450');document.body.append(resizer);
function setSidebarWidth(value){const width=Math.max(240,Math.min(450,Number(value)||300));document.documentElement.style.setProperty('--sidebar-width',width+'px');resizer.setAttribute('aria-valuenow',String(Math.round(width)));return width}
setSidebarWidth(uiRead('namu-sidebar-width',300));
resizer.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();resizer.setPointerCapture(e.pointerId);document.body.classList.add('resizing-sidebar')});
resizer.addEventListener('pointermove',e=>{if(resizer.hasPointerCapture(e.pointerId))setSidebarWidth(e.clientX)});
function finishResize(){document.body.classList.remove('resizing-sidebar');uiSave('namu-sidebar-width',Number(resizer.getAttribute('aria-valuenow')))}
resizer.addEventListener('pointerup',e=>{if(resizer.hasPointerCapture(e.pointerId))resizer.releasePointerCapture(e.pointerId);finishResize()});resizer.addEventListener('lostpointercapture',finishResize);
resizer.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setSidebarWidth(e.key==='Home'?240:e.key==='End'?450:Number(resizer.getAttribute('aria-valuenow'))+(e.key==='ArrowLeft'?-10:10));finishResize()});
resizer.addEventListener('dblclick',()=>{setSidebarWidth(300);finishResize()});
const treeTools=document.createElement('div');treeTools.className='tree-tools';treeTools.setAttribute('aria-label','트리 표시');treeTools.innerHTML='<button type="button" data-tree-open="true">전체 펼치기</button><button type="button" data-tree-open="false">전체 접기</button>';$('tree').before(treeTools);
treeTools.addEventListener('click',e=>{const b=e.target.closest('[data-tree-open]');if(!b)return;const expand=b.dataset.treeOpen==='true';source.brands.forEach(brand=>opened.set('brand:'+brand,expand));source.models.forEach(model=>opened.set('model:'+model.id,expand));renderTree()});
const titleTooltip=document.createElement('div');titleTooltip.id='documentTitleTooltip';titleTooltip.setAttribute('role','tooltip');titleTooltip.hidden=true;document.body.append(titleTooltip);let tooltipOwner=null;
function hideDocumentTooltip(){if(tooltipOwner)tooltipOwner.removeAttribute('aria-describedby');tooltipOwner=null;titleTooltip.hidden=true}
function showDocumentTooltip(button){hideDocumentTooltip();tooltipOwner=button;titleTooltip.textContent=button.dataset.tooltip;titleTooltip.hidden=false;button.setAttribute('aria-describedby',titleTooltip.id);const r=button.getBoundingClientRect(),t=titleTooltip.getBoundingClientRect();const left=Math.max(8,Math.min(r.left,innerWidth-t.width-8));let top=r.bottom+6;if(top+t.height>innerHeight-8)top=r.top-t.height-6;titleTooltip.style.left=left+'px';titleTooltip.style.top=Math.max(8,Math.min(top,innerHeight-t.height-8))+'px'}
$('tree').addEventListener('mouseover',e=>{const b=e.target.closest('[data-tooltip]');if(b&&b!==tooltipOwner)showDocumentTooltip(b)});
$('tree').addEventListener('mouseout',e=>{if(tooltipOwner&&!tooltipOwner.contains(e.relatedTarget))hideDocumentTooltip()});
$('tree').addEventListener('focusin',e=>{const b=e.target.closest('[data-tooltip]');if(b)showDocumentTooltip(b)});$('tree').addEventListener('focusout',hideDocumentTooltip);$('tree').addEventListener('click',hideDocumentTooltip);
document.addEventListener('scroll',hideDocumentTooltip,true);window.addEventListener('resize',hideDocumentTooltip);document.addEventListener('keydown',e=>{if(e.key==='Escape')hideDocumentTooltip()});
renderLibrary();renderTree();

const displayDocument=render,displayHome=renderHome;let routeVersion=0;
function extras(d){
 const actions=$('article').querySelector('.document-actions');
 const copy=document.createElement('button');copy.textContent='링크 복사';copy.id='copyDocumentLink';actions.append(copy);
 copy.onclick=async()=>{const url=new URL(location.href);url.hash='/article/'+d.id;try{await navigator.clipboard.writeText(url.href);copy.textContent='문서 링크가 복사되었습니다.';}catch{copy.textContent='링크를 선택해 복사하세요';const field=document.createElement('input');field.value=url.href;field.readOnly=true;actions.append(field);field.select();}};
 const meta=$('article').querySelector('.meta');meta.innerHTML=[d.author?'<span>'+esc(d.author)+'</span>':'',(d.editedDateTime||d.updatedAt||d.date)?'<span>'+(d.editedDateTime||d.updatedAt?'수정일 ':'작성일 ')+esc(formatDate(d.editedDateTime||d.updatedAt||d.date))+'</span>':'','<span>'+esc(d.brand)+' / '+esc(d.model)+'</span>'].join('');
 const headings=[...$('article').querySelectorAll('.document-body h2,.document-body h3')].filter(h=>h.textContent.trim());
 $('toc').innerHTML=headings.length>=3?'<strong>이 문서에서</strong>'+headings.map(h=>'<a class="'+(h.tagName==='H3'?'subheading':'')+'" href="#/article/'+d.id+'/'+h.id+'">'+esc(h.textContent)+'</a>').join(''):'';
 const related=recommend(d,source.docs);if(related.length){const section=document.createElement('section');section.className='related-documents';section.innerHTML='<h2>관련 Troubleshooting</h2>'+related.map(({doc,reason})=>'<a href="#/article/'+doc.id+'" title="'+esc(doc.title)+'"><strong>'+esc(doc.title)+'</strong><span class="related-meta" title="'+esc([doc.brand+' > '+doc.model,reason,...(doc.searchTags||[])].filter(Boolean).join(' · '))+'">'+esc([doc.brand+' > '+doc.model,reason,...(doc.searchTags||[])].filter(Boolean).join(' · '))+'</span></a>').join('');$('article').append(section);}
}
const internalAccess=mountInternal({renderBody:(d,assets)=>originalBody(d.nodes,d,assets)});
const router=createRouter(async({id,anchor,internal})=>{
 const version=++routeVersion;searchController?.hideSuggestions();if(internal){current=null;renderTree();await internalAccess.show();return;}internalAccess.leave();if(!id){displayHome();return;}
 if(current===id&&$('article').querySelector('.document-header')){if(anchor)document.getElementById(anchor)?.scrollIntoView();return;}
 $('article').innerHTML='<p role="status">문서를 불러오는 중…</p>';$('toc').innerHTML='';
 const started=performance.now();try{const result=await loadArticle(id);if(version!==routeVersion)return;const meta=source.docs.find(d=>d.id===id);if(!meta)throw Error('Hidden article');Object.assign(meta,result.document);Object.assign(source.assets,result.assets);displayDocument(id);extras(meta);if(anchor)document.getElementById(anchor)?.scrollIntoView();performance.measure('namu-article',{start:started,end:performance.now()});}
 catch{if(version!==routeVersion)return;current=null;$('article').innerHTML='<p role="alert">문서를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p><button id="retryArticle">다시 시도</button>'; $('retryArticle').onclick=()=>router.go(id);}
});
render=id=>router.go(id);renderHome=()=>router.go(null);
searchController=mountSearch({input:$('search'),clear:$('clear'),results:uiSearch,library:uiLibrary,docs:source.docs,onOpen:render});searchController.refresh();
const zoomTools=document.createElement('div');zoomTools.className='zoom-tools';zoomTools.innerHTML='<button data-zoom="out" aria-label="이미지 축소">−</button><button data-zoom="in" aria-label="이미지 확대">+</button><button data-zoom="original">원본 크기</button><button data-zoom="fit">화면에 맞춤</button><output id="zoomPercent">화면 맞춤</output>';$('largeImage').before(zoomTools);
let scale=1;function fitImage(){scale=1;$('largeImage').style.cssText='';$('zoomPercent').textContent='화면 맞춤';}
zoomTools.onclick=e=>{const op=e.target.closest('[data-zoom]')?.dataset.zoom;if(!op)return;if(op==='fit'){fitImage();return;}const img=$('largeImage');if(op==='original')scale=1;else scale=Math.max(.1,Math.min(5,op==='in'?scale*1.25:scale/1.25));img.style.maxWidth='none';img.style.maxHeight='none';img.style.width=img.naturalWidth*scale+'px';$('zoomPercent').textContent=Math.round(scale*100)+'%';};
$('largeImage').addEventListener('load',fitImage);$('lightbox').addEventListener('close',fitImage);
router.start();

}
