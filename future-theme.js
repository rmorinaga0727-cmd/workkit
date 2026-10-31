'use strict';
(()=>{
const themes={
 default:{name:'未診断',accent:'#FF6A00',highlight:'#FFC08E',angle:-10,line:'solid'},
 'ハンター':{name:'ハンター',accent:'#FF7A24',highlight:'#FFC394',angle:-14,line:'solid',asset:'hunter-full'},
 'コンサル':{name:'コンサル',accent:'#39C3BD',highlight:'#A8EDE5',angle:-6,line:'solid',asset:'consultant'},
 'プランナー':{name:'プランナー',accent:'#AB96F3',highlight:'#DBD0FF',angle:0,line:'dashed',asset:'planner'},
 'コミュニケーター':{name:'コミュニケーター',accent:'#E88FB4',highlight:'#FFD1E3',angle:-5,line:'solid',asset:'communicator'},
 'チャレンジャー':{name:'チャレンジャー',accent:'#E4C056',highlight:'#FBE5A2',angle:-17,line:'solid',asset:'challenger'},
 'オールラウンダー':{name:'オールラウンダー',accent:'#7BAAEC',highlight:'#C9DFFF',angle:-9,line:'solid',asset:'allrounder'}
};
const rgb=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)).join(' ');let current=null,scheduled=0;
function savedType(){try{const library=window.WorkKitDiagnosisHost.load(),active=library.runs.find(r=>r.id===library.activeId);if(active&&themes[active.result?.type])return active.result.type;
 if(library.runs.length===0){const old=library.legacyResults?.at(-1)?.result?.type;if(themes[old])return old;}
 }catch{/* Existing storage protection owns the error; never repair or write here. */}return 'default';}
function refresh(){const key=savedType();if(key===current)return;const previous=current;current=key;const theme=themes[key];
 for(const e of document.querySelectorAll('.future-home,.future-header,.future-footer,#aiFab')){
  e.style.setProperty('--f-accent',theme.accent);e.style.setProperty('--f-accent-rgb',rgb(theme.accent));e.style.setProperty('--f-highlight',theme.highlight);e.style.setProperty('--f-highlight-rgb',rgb(theme.highlight));e.style.setProperty('--theme-orbit-angle',theme.angle+'deg');e.style.setProperty('--theme-track-style',theme.line);
 }
 document.body.dataset.futureTheme=key;
 const portrait=document.getElementById('theme-portrait'),avatar=document.getElementById('theme-avatar');portrait.hidden=key==='default';
 if(theme.asset)avatar.src='diagnosis/assets/cutout/'+theme.asset+'.png';else avatar.removeAttribute('src');
 document.getElementById('theme-name').textContent=key==='default'?'まずは営業スタイル診断':theme.name+'のWorkKit';
 document.getElementById('entry-heading').innerHTML=key==='default'?'自分を知ると、<br>次の一手が変わる。':'あなたの強みを、<br>次の営業の準備へ。';
 document.getElementById('theme-caption').textContent=key==='default'?'20問の回答と6軸を、ほかのツールの提案へ。診断後は、この空間もあなたのタイプカラーに。':'保存した診断結果のカラーを反映しています。回答と6軸は、ほかのツールの提案にも引き継げます。';
 document.querySelector('#hero-diagnosis').firstChild.textContent=key==='default'?'営業スタイル診断をはじめる ':'診断結果を確認する ';
 document.querySelector('.header-diagnosis').textContent=key==='default'?'診断する':'診断を見る';
 if(previous!==null&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const e=document.querySelector('.diagnosis-entry');e.getAnimations().forEach(a=>a.cancel());e.animate([{opacity:.6},{opacity:1}],{duration:650,easing:'ease-out'});}
}
function schedule(){cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(refresh);}
new MutationObserver(schedule).observe(document.getElementById('saveStatus'),{subtree:true,childList:true,characterData:true});
window.addEventListener('pageshow',schedule);
Object.defineProperty(window,'FutureWorkKitTheme',{value:Object.freeze({refresh,get current(){return current;},palette:Object.freeze(themes),source:'WorkKitDiagnosisHost active run; no separate persistence'})});
refresh();
})();
