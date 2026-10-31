'use strict';
// Release routing only. Approved diagnosis/script/content engines remain unchanged.
(()=>{
const ready=new Set(['sales_type','script','objection']);
const updating=new Set(['forecast','premeeting','closing','navi','loss']);
const home=new URL('./',location.href),objection=new URL('tools/objection/',home);
const originalOpen=openTool,originalRender=renderTool,originalClose=closeTool;
const dialog=document.createElement('dialog');dialog.id='release-notice';dialog.setAttribute('aria-labelledby','release-notice-title');
dialog.innerHTML='<h2 id="release-notice-title">大幅アップデート中</h2><p id="release-notice-text"></p><button class="btn primary" id="release-notice-close">閉じる</button>';
document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();
function notice(key){
 const label=window.FUTURE_TOOLS.find(t=>t.key===key)?.name||'このサービス';
 dialog.querySelector('h2').textContent=updating.has(key)?'大幅アップデート中':'新規受付を停止しています';
 dialog.querySelector('p').textContent=updating.has(key)?label+'は大幅アップデート中です。現在は営業スタイル診断・営業スクリプト・アウト返しをご利用いただけます。':'現在、Pro・有料サービスの新規受付は停止しています。価格・申込の案内は行っていません。';
 if(!dialog.open)dialog.showModal();
}
function route(key,replace=false){const u=new URL(home);if(key)u.searchParams.set('tool',key);history[replace?'replaceState':'pushState']({tool:key},'',u.pathname+u.search+u.hash);}
openTool=function(key){
 if(key==='objection'){persistState(true);location.assign(objection.href);return;}
 if(!ready.has(key)&&key!=='profile'){notice(key);return;}
 originalOpen(key);route(key);
};
renderTool=function(key){
 if(key==='objection'){openTool(key);return;}
 if(!ready.has(key)&&key!=='profile'){notice(key);return;}
 originalRender(key);
};
closeTool=function(){originalClose();route(null);};
document.getElementById('backBtn').onclick=()=>closeTool();
// Existing embedded diagnosis calls the global close/open functions through its host adapter.
document.addEventListener('click',event=>{
 const element=event.target.closest('[data-open]');if(!element)return;
 const key=element.dataset.open;
 if(key==='objection'||!ready.has(key)&&key!=='profile'){
  event.preventDefault();event.stopImmediatePropagation();openTool(key);
 }
},true);
for(const key of updating){
 document.querySelectorAll('.catalog-tool[data-open="'+key+'"] small').forEach(e=>e.textContent='大幅アップデート中');
 document.querySelectorAll('.catalog-tool[data-open="'+key+'"]').forEach(e=>{e.classList.add('release-updating');e.setAttribute('aria-label',(window.FUTURE_TOOLS.find(t=>t.key===key)?.name||key)+'：大幅アップデート中');});
}
document.querySelector('.catalog-head>span').textContent='3機能公開・5機能は大幅アップデート中';
// Local storage restoration describes this browser, not service activation or account recovery.
const saved=document.getElementById('saveStatus');if(saved.textContent==='復元済み')saved.textContent='端末の保存を復元';
function loadRoute(){const key=new URL(location.href).searchParams.get('tool');
 if(key==='objection'){location.replace(objection.href);return;}
 if(key&&ready.has(key)||key==='profile'){originalOpen(key);return;}
 if(key)notice(key);
}
addEventListener('popstate',()=>{const key=new URL(location.href).searchParams.get('tool');if(!key)originalClose();else loadRoute();});
loadRoute();
window.WorkKitRelease=Object.freeze({version:'FUTURE-WORKKIT-V1.1-three-tools-20261031',publicTools:[...ready],updatingTools:[...updating],intakePaused:true});
})();
