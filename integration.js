'use strict';
// Additive, same-origin diagnosis integration. No network requests or paid services.
(()=>{
const C=WorkKitCore,N=WorkKitNarrative,clone=x=>JSON.parse(JSON.stringify(x));
const FREE=['sales_type','script','objection','forecast','premeeting','closing','navi','loss'];
const labels={script:'営業スクリプト作成',objection:'アウト返し・競合対策',forecast:'予実逆算',premeeting:'商談前作戦会議',closing:'クロージング設計',navi:'営業課題診断',loss:'失注・NG理由設計'};
const validAnswers=a=>Array.isArray(a)&&a.length===20&&a.every(x=>Number.isInteger(x)&&x>=1&&x<=5);
const validResult=r=>r&&validAnswers(r.answers)&&Object.values(C.TYPES).includes(r.type)&&Object.keys(C.AXES).every(k=>Number.isFinite(r.scores?.[k])&&r.scores[k]>=20&&r.scores[k]<=100);
const blank=()=>({version:1,draft:{answers:Array(20).fill(null),index:0},runs:[],activeId:null,enabled:true});
function validate(s){return s&&s.version===1&&Array.isArray(s.runs)&&s.runs.every(r=>typeof r.id==='string'&&validResult(r.result))&&new Set(s.runs.map(r=>r.id)).size===s.runs.length&&s.draft&&Array.isArray(s.draft.answers)&&s.draft.answers.length===20&&s.draft.answers.every(v=>v===null||Number.isInteger(v)&&v>=1&&v<=5);}
let envelope={},lastRaw=null,blocked=false,backupDone=false;
const backupKey=STORAGE_KEY+'__before_diagnosis_v3_3';
const recoveryKey='workkit_diagnosis_v3_3_recovery';let recovery=null,lastRecoveryRaw=null;
try{lastRaw=localStorage.getItem(STORAGE_KEY);if(lastRaw!==null){envelope=JSON.parse(lastRaw);if(!envelope||typeof envelope!=='object'||Array.isArray(envelope))throw Error('bad state');}if(envelope.diagnosisV33&&!validate(envelope.diagnosisV33))throw Error('bad diagnosis');}catch{blocked=true;}
try{lastRecoveryRaw=localStorage.getItem(recoveryKey);if(lastRecoveryRaw!==null){recovery=JSON.parse(lastRecoveryRaw);if(recovery.version!==1||!Number.isFinite(recovery.savedAt)||!validate(recovery.library))throw Error('bad recovery');}}catch{blocked=true;}
const useRecovery=recovery&&(!envelope.diagnosisV33||recovery.savedAt>(envelope.savedAt||0));
let library=useRecovery?clone(recovery.library):envelope.diagnosisV33?clone(envelope.diagnosisV33):blank();
if(!validate(library)){library=blank();blocked=true;}
const legacyAtStart=envelope.typeResult&&!validAnswers(envelope.typeResult.answers)?clone(envelope.typeResult):null;
if(legacyAtStart){library.legacyResults=library.legacyResults||[];if(!library.legacyResults.some(row=>JSON.stringify(row.result)===JSON.stringify(legacyAtStart)))library.legacyResults.push({id:'legacy-'+(envelope.savedAt||'undated'),result:legacyAtStart,createdAt:envelope.savedAt||null,source:'legacy-no-answers'});}
if(!envelope.diagnosisV33&&!useRecovery&&validResult(envelope.typeResult)){
 const result=clone(envelope.typeResult),rank=Object.entries(result.scores).sort((a,b)=>b[1]-a[1]);
 // Display metadata only; keep the previously stored type, scores and answers untouched.
 result.leaders=result.leaders||[rank[0][0]];result.method=result.method||'legacy-preserved';
 result.spread=result.spread??rank[0][1]-rank.at(-1)[1];
 const imported={id:'imported-'+(envelope.savedAt||'undated'),source:'answer',origin:'legacy-answers',result,createdAt:envelope.savedAt?new Date(envelope.savedAt).toISOString():null,optional:{},review:{}};
 library.runs.push(imported);library.activeId=imported.id;library.draft={answers:[...result.answers],index:19};
}
state.diagnosisV33=library;
if(useRecovery){const selected=library.runs.find(r=>r.id===library.activeId);if(selected)state.typeResult={...clone(selected.result),diagnosisRunId:selected.id};}
const originalPayload=persistedPayload;
persistedPayload=function(){return {...envelope,...originalPayload(),diagnosisV33:clone(library)};};
function commit(){
 if(blocked){setSaveStatus('既存データを保護・保存停止','error');return false;}
 try{
  if(localStorage.getItem(STORAGE_KEY)!==lastRaw){blocked=true;throw Error('another tab changed state');}
  if(localStorage.getItem(recoveryKey)!==lastRecoveryRaw){blocked=true;throw Error('another tab changed recovery');}
  if(!backupDone&&lastRaw!==null){if(localStorage.getItem(backupKey)===null)localStorage.setItem(backupKey,lastRaw);backupDone=true;}
  const payload=persistedPayload(),raw=JSON.stringify(payload),snapshot=JSON.stringify({version:1,savedAt:payload.savedAt,library:clone(library)});localStorage.setItem(recoveryKey,snapshot);lastRecoveryRaw=snapshot;localStorage.setItem(STORAGE_KEY,raw);lastRaw=raw;envelope=payload;setSaveStatus('保存済み');return true;
 }catch{setSaveStatus('保存できません・既存記録を保護','error');return false;}
}
persistState=function(immediate=false){clearTimeout(persistTimer);if(immediate)return commit();setSaveStatus('保存中…','saving');persistTimer=setTimeout(commit,180);};
function activeRun(){return library.runs.find(r=>r.id===library.activeId)||null;}
function selectRun(id){const r=library.runs.find(x=>x.id===id);if(!r||!validResult(r.result))throw Error('No valid diagnosis');library.activeId=id;state.typeResult={...clone(r.result),diagnosisRunId:id};updateAssistantIdentity();updateAssistantContext();return r;}
function legacy(){return clone(library.legacyResults||[]);}
function saveDiagnosis(next){
 if(!validate(next))throw Error('Invalid diagnosis data');
 // A draft update may not discard any historical run or legacy result.
 if(library.runs.some(old=>!next.runs.some(n=>n.id===old.id)))throw Error('History removal denied');
 const previous=library,oldType=state.typeResult;
 library={...library,...clone(next),legacyResults:library.legacyResults};state.diagnosisV33=library;
 if(library.activeId)selectRun(library.activeId);
 if(!persistState(true)){library=previous;state.diagnosisV33=previous;state.typeResult=oldType;throw Error('Storage unavailable');}
}
const originalRender=renderTool,originalClose=closeTool,originalOut=out,originalAssistantMessage=assistantTypeMessage;
renderSalesType=function(){
 document.body.classList.add('diagnosis-active');closeAssistant();
 const app=document.getElementById('appShell');app.classList.add('diagnosis-open');document.getElementById('appTitle').textContent='営業スタイル診断';
 document.getElementById('toolRoot').innerHTML='<iframe id="diagnosis-frame" title="営業スタイル診断：20問・結果・履歴" src="diagnosis/index.html"></iframe>';
};
renderTool=function(key){document.body.classList.toggle('diagnosis-active',key==='sales_type');document.getElementById('appShell').classList.toggle('diagnosis-open',key==='sales_type');originalRender(key);if(labels[key])attach(key);};
closeTool=function(){document.body.classList.remove('diagnosis-active');document.getElementById('appShell').classList.remove('diagnosis-open');originalClose();};
window.WorkKitDiagnosisHost=Object.freeze({
 load(){if(blocked)throw Error('Storage is protected');return clone(library);},
 legacy,
 save:saveDiagnosis,
 home(){document.getElementById('toolRoot').innerHTML='';closeTool();document.querySelector('[onclick*="sales_type"]')?.focus();},
 open(key,id){if(!labels[key])throw Error('Free tool only');selectRun(id);library.enabled=true;if(!persistState(true))throw Error('Save failed');openTool(key);},
 version:'integrated-v3.3'
});
function context(){const run=activeRun();if(!run||library.enabled===false||!validResult(run.result))return null;return {run,r:run.result,n:N.build(run.result)};}
function practice(key){
 const c=context();if(!c||!labels[key])return null;const {r,n}=c,a=r.answers;
 const conversation=a[3]>=4&&a[5]<=3?'背景を聞く持ち味を使い、最後に「今の話で、まず一つ選ぶなら何でしょう」と確認する。':a[5]>=4?'整理した内容を結論にせず、「私の整理で抜けている点はありますか」と相手が直せる余白を残す。':'提案前に「どこからお話しすると分かりやすいですか」と希望を確認する。';
 const decision=a[18]<=3?'結論を急がず、何が確認できれば判断できるかを一つ聞く。':a[19]<=3?'判断の後に、次に行うこと・担当・日付を相手と合意する。':'次の予定を置く強みを使い、「今は決めない」も相手が選べることを確認する。';
 const guide={
  script:{title:'自分の持ち味に合う会話の組み立て',text:conversation+'\n次の会話で試すこと：'+n.sections.H.text,q:[4,6,...n.sections.H.q]},
  objection:{title:'反論を増やす前に、返し方を整える',text:'練習用の返し方：'+n.reply+'\n'+n.sections.G.text+'\n本人の練習：'+n.sections.H.text,q:[...n.sections.C.q,...n.sections.G.q,...n.sections.H.q]},
  premeeting:{title:'会話が進む条件と、立ち止まる場面を準備する',text:'持ち味を使えそうな会話：'+n.sections.B.text+'\n工夫を考える会話：'+n.sections.C.text+'\n当日試すこと：'+n.sections.H.text,q:[...n.sections.B.q,...n.sections.C.q,...n.sections.H.q]},
  closing:{title:'判断を急がせず、次の一歩を合意する',text:decision+'\n強みが裏目に出る条件：'+n.sections.G.text+'\n本人の練習：'+n.sections.H.text,q:[19,20,...n.sections.G.q,...n.sections.H.q]},
  navi:{title:'実績の分析と、営業スタイルの練習を分ける',text:'上の数値分析は入力した実績KPIに基づきます。営業タイプ・6軸から不振の原因や成約率を推定しません。\n行動を振り返る問い：'+n.sections.H.text+'\n実績上の課題と関係するかは、実際の商談記録で確認してください。',q:n.sections.H.q},
  forecast:{title:'必要行動数を、試せる一日に落とす',text:'必要件数・CVR・目標は既存の実績入力と計算のままです。6軸を数値計算に混ぜません。\n一日の準備で試す行動：'+n.sections.H.text+'\n完了した行動数と、相手の反応を別々に記録します。',q:n.sections.H.q},
  loss:{title:'自分の見立てと、相手が話した事実を分ける',text:'見方の癖として振り返る例：'+n.sections.D.text+'\nこれは失注理由の証拠ではありません。顧客の発言・本人の仮説・未確認の3欄に分け、理由不明を勝手に埋めません。\n次に試すこと：'+n.sections.H.text,q:[...n.sections.D.q,...n.sections.H.q]}
 }[key];
 const q=[...new Set(guide.q)].filter(i=>i>=1&&i<=20),scores=Object.entries(r.scores).map(([k,v])=>`${k} ${v}`).join('／');
 return {...guide,q,scores,run:c.run,result:r,rule:n.id,evidence:q.map(i=>`Q${i}「${C.QUESTIONS[i-1]}」=${a[i-1]}/5`).join('\n')};
}
function textFor(key){const p=practice(key);return p?`【診断の回答を活かす準備／自己申告に基づく仮説】\n${p.title}\n${p.text}\n\n6軸（能力・KPIではありません）：${p.scores}\n回答根拠：\n${p.evidence}\n参照結果：${p.run.id}／${p.run.createdAt}／文章ルール ${p.rule}\n顧客の実情・相性・他者評価を確認した結果ではありません。`:'';}
function attach(key){
 document.getElementById('diagnosis-context')?.remove();const p=practice(key),run=activeRun();if(!run)return;
 const panel=document.createElement('section');panel.id='diagnosis-context';panel.className='panel diagnosis-context';
 panel.innerHTML=`<div class="diagnosis-context-head"><h2>営業スタイルを、この準備に活かす</h2><button class="btn" id="return-diagnosis">診断結果へ戻る</button></div><label class="diagnosis-enable"><input type="checkbox" id="use-diagnosis" ${library.enabled!==false?'checked':''}> この診断の回答を提案に活かす</label><p class="small">自己申告の参考情報です。顧客情報・実績KPIには自動入力しません。</p>${p?`<h3>${esc(p.title)}</h3><p class="diagnosis-guide-text">${esc(p.text)}</p><details><summary>参照した6軸・回答根拠を見る</summary><p>${esc(p.scores)}</p><pre>${esc(p.evidence)}</pre><p class="small">${esc(p.run.createdAt)}／文章ルール ${esc(p.rule)}</p></details>`:'<p>連携はオフです。通常のツール機能を使えます。</p>'}`;
 const root=document.getElementById('toolRoot');root.querySelector('.tool-hero')?.after(panel);
 document.getElementById('return-diagnosis').onclick=()=>openTool('sales_type');
 document.getElementById('use-diagnosis').onchange=e=>{library.enabled=e.target.checked;persistState(true);attach(key);};
}
out=function(id,text){const suffix=textFor(state.currentTool);originalOut(id,suffix?text+'\n\n'+suffix:text);};
assistantTypeMessage=function(){const p=textFor('premeeting');return p||originalAssistantMessage();};
// Inter-tool assistant handoffs retain existing customer context and add a separate personal-style object.
const oldCapture=captureAssistantHandoff;
captureAssistantHandoff=function(query=''){oldCapture(query);const c=context();if(c)state.handoff.diagnosis={runId:c.run.id,type:c.r.type,scores:clone(c.r.scores),answers:[...c.r.answers],growth:c.n.sections.H.text,kind:'self-report-hypothesis'};};
if(blocked)setSaveStatus('既存データを保護・保存停止','error');
window.WorkKitIntegration=Object.freeze({freeTools:[...FREE],practice,textFor,backupKey,version:'3.3',get activeId(){return library.activeId;}});
})();
