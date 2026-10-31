'use strict';
// No prototype localStorage access: the WorkKit host owns all persistence.
window.WorkKitDiagnosisAdapter=(()=>{
 let host;try{if(parent!==window&&parent.location.origin===location.origin)host=parent.WorkKitDiagnosisHost;}catch{}
 if(!host)throw Error('WORKKITから診断を開いてください。');
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return {
  load:()=>host.load(),save:data=>host.save(data),
  open(key,id){try{return host.open(key,id);}catch{let alert=document.getElementById('integrated-handoff-error');if(!alert){alert=document.createElement('p');alert.id='integrated-handoff-error';alert.className='storage-warning';alert.setAttribute('role','alert');document.getElementById('modal-body').prepend(alert);}alert.textContent='診断を安全に保存できないため、ツールへの移動を停止しました。別タブの更新や保存容量を確認し、必要な回答を控えてください。';return false;}},
  home:()=>host.home(),
  legacyHTML(){const list=host.legacy();return list.map(row=>`<section class="caution-panel"><h2>保存済みの旧診断：${esc(row.result.type)}</h2><p>旧版では20問の回答が保存されていないため、回答を補完した個別分析は行いません。タイプと6軸は保存時のままです。詳しく振り返るには20問へ回答してください。</p><p>${Object.entries(row.result.scores||{}).map(([k,v])=>esc(k)+' '+esc(v)).join(' ／ ')}</p>${row.createdAt?'<p>保存時刻：'+esc(new Date(row.createdAt).toLocaleString('ja-JP'))+'</p>':'<p>保存時刻：未確認</p>'}</section>`).join('');}
 };
})();
