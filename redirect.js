(()=>{'use strict';
const origin='https://workkit-shigoto.pages.dev/',prefix='/workkit',knownKeys=['workkit_state_v48','workkit_objection_local_w001v07_library'];
const target=new URL(origin);target.search=location.search;target.hash=location.hash;
const path=location.pathname.replace(/^\/workkit(?=\/|$)/,'').replace(/\/index\.html$/,'/').replace(/\/$/,'');
let recognized=true;
if(path==='/tools/objection'||(!path&&target.searchParams.get('tool')==='objection')){target.pathname='/tools/objection/';target.searchParams.delete('tool');}
else if(path==='/diagnosis'){target.searchParams.set('tool','sales_type');}
else if(path!=='')recognized=false;
const link=document.getElementById('continue');link.href=recognized?target.href:origin;
document.getElementById('destination').textContent=link.href;
const stored=[];let readable=true;
try{for(const key of knownKeys){const raw=localStorage.getItem(key);if(raw!==null)stored.push({key,raw});}}catch{readable=false;}
for(const {key,raw} of stored){const button=document.createElement('button');button.textContent=key==='workkit_state_v48'?'旧サイトの設定・診断データをJSONで保全':'旧サイトのアウト返し履歴をJSONで保全';button.onclick=()=>{const blob=new Blob([raw],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=key+'-github-pages-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};document.getElementById('backups').append(button);}
document.getElementById('status').textContent=!recognized?'この旧URLの転送先は特定できません。正式ホームから機能を選んでください。':!readable?'保存領域を確認できませんでした。自動転送せず、この画面でご案内します。':stored.length?'このブラウザに旧サイトの保存内容があります。必要なJSONを保全してから正式サイトへ進んでください。':'正式サイトへ移動します。';
if(recognized&&readable&&!stored.length)location.replace(target.href);
})();