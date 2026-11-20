'use strict';
(() => {
  const KEY='workkit-forecast-v2';
  const MAX_STAGE=12;
  const $=id=>document.getElementById(id);
  const fmt=n=>Number.isFinite(n)?Math.round(n).toLocaleString('ja-JP'):'—';
  const decimal=n=>Number.isFinite(n)?n.toFixed(1):'—';
  const safe=n=>Number.isFinite(n)?n:0;
  const presets={
    tele:{period:'今月',target:40,achieved:14,elapsed:10,remaining:10,members:4,stages:[['架電',4000,45],['接続',1800,20],['有効会話',360,20],['アポイント',72,70],['商談',50,40],['契約',14,null]]},
    field:{period:'今月',target:25,achieved:9,elapsed:10,remaining:10,members:3,stages:[['リード',260,50],['初回商談',130,55],['提案',72,40],['契約',9,null]]},
    simple:{period:'今月',target:20,achieved:6,elapsed:10,remaining:10,members:2,stages:[['アプローチ',300,30],['商談',90,25],['成約',6,null]]}
  };
  let data=null,model=null,selectedLeverage=null;
  function integer(value){if(value===null||value===undefined||String(value).trim()==='')return NaN;const n=Number(value);return Number.isSafeInteger(n)?n:NaN}
  function getInput(){return {period:$('period').value.trim().slice(0,60),target:integer($('target').value),achieved:integer($('achieved').value),elapsed:integer($('elapsed').value),remaining:integer($('remaining').value),members:integer($('members').value),stages:[...$('stageRows').querySelectorAll('tr')].map((tr,i,arr)=>({name:tr.querySelector('.stage-name').value.trim().slice(0,40),actual:integer(tr.querySelector('.stage-actual').value),rate:i===arr.length-1?null:Number(tr.querySelector('.stage-rate').value)}))}}
  function validate(d){const errors=[];for(const [name,label,min,max] of [['target','目標',0,100000000],['achieved','最終実績',0,100000000],['elapsed','経過営業日',0,366],['remaining','残営業日',0,366],['members','メンバー数',1,10000]])if(!Number.isSafeInteger(d[name])||d[name]<min||d[name]>max)errors.push(label+'は'+min+'〜'+max+'の整数で入力してください。');
    if(d.stages.length<2||d.stages.length>MAX_STAGE)errors.push('ファネルは2〜12ステージで設定してください。');
    const seen=new Set(); d.stages.forEach((s,i)=>{if(!s.name)errors.push((i+1)+'行目のステージ名を入力してください。');else if(seen.has(s.name))errors.push('ステージ名「'+s.name+'」が重複しています。');else seen.add(s.name);
      if(!Number.isSafeInteger(s.actual)||s.actual<0||s.actual>100000000)errors.push(s.name+'の実績は0以上の整数で入力してください。');
      if(i<d.stages.length-1&&(!Number.isFinite(s.rate)||s.rate<=0||s.rate>100))errors.push(s.name+'の計画CVRは0より大きく100以下で入力してください。');
    });
    if(d.stages.length&&Number.isSafeInteger(d.achieved)&&d.stages.at(-1).actual!==d.achieved)errors.push('最終ステージ実績と「期間内の最終実績」は一致させてください。');
    return errors;
  }
  function reverse(finalCount,stages,changedIndex=-1,lift=0){const result=Array(stages.length).fill(0);result[result.length-1]=finalCount;for(let i=stages.length-2;i>=0;i--){const rate=Math.min(100,stages[i].rate+(i===changedIndex?lift:0))/100;result[i]=Math.ceil(result[i+1]/rate);if(!Number.isSafeInteger(result[i])||result[i]>Number.MAX_SAFE_INTEGER)return null;}return result}
  function calculate(d){const gap=Math.max(0,d.target-d.achieved),total=d.elapsed+d.remaining;const projected=d.elapsed>0?d.achieved/d.elapsed*total:null;const attainment=d.target>0?100*d.achieved/d.target:(d.achieved>0?100:100);
    const needed=d.remaining>0?gap/d.remaining/d.members:(gap===0?0:null);
    const required=reverse(gap,d.stages);if(!required)return {error:'必要活動量が計算可能な範囲を超えました。ファネルの計画CVRを見直してください。'};
    const rows=d.stages.map((s,i)=>({name:s.name,actual:s.actual,required:required[i],teamDaily:d.remaining>0?Math.ceil(required[i]/d.remaining):(gap===0?0:null),personDaily:d.remaining>0?Math.ceil(required[i]/d.remaining/d.members):(gap===0?0:null),actualRate:i<d.stages.length-1&&s.actual>0?d.stages[i+1].actual/s.actual*100:null,planRate:s.rate}));
    const warnings=[];for(let i=0;i<rows.length-1;i++)if(rows[i+1].actual>rows[i].actual)warnings.push('「'+rows[i].name+' → '+rows[i+1].name+'」の実績が増えています。異なる期間の案件や定義を確認してください。');
    if(d.elapsed===0)warnings.push('経過営業日が0日のため、着地予測は表示していません。');
    if(d.remaining===0&&gap>0)warnings.push('残営業日が0日で目標未達です。追加活動量を算出できません。');
    if(d.target===0)warnings.push('目標が0件のため達成率は参考値です。');
    if(d.achieved>d.target)warnings.push('目標を超過達成しています。追加の必要活動量は0件です。');
    let best=null;for(let i=0;i<d.stages.length-1;i++){const improved=reverse(gap,d.stages,i,5);if(!improved)continue;const save=required[0]-improved[0];if(!best||save>best.save)best={index:i,save,improved:improved[0]};}
    return {d,gap,total,attainment,projected,needed,required,rows,warnings,best};
  }
  function stageRow(stage,index,total){const tr=document.createElement('tr');
    const name=document.createElement('td'),actual=document.createElement('td'),rate=document.createElement('td'),remove=document.createElement('td');
    const nameInput=document.createElement('input');nameInput.className='stage-name';nameInput.type='text';nameInput.maxLength=40;nameInput.setAttribute('aria-label','ステージ'+(index+1)+'の名前');nameInput.value=stage[0];name.append(nameInput);
    const actualInput=document.createElement('input');actualInput.className='stage-actual';actualInput.type='number';actualInput.min='0';actualInput.step='1';actualInput.max='100000000';actualInput.setAttribute('aria-label',stage[0]+'の実績');actualInput.value=stage[1];actual.append(actualInput);
    if(index===total-1){const label=document.createElement('span');label.className='last-rate';label.textContent='最終成果';rate.append(label);}else{const input=document.createElement('input');input.className='stage-rate';input.type='number';input.min='0.01';input.max='100';input.step='0.01';input.setAttribute('aria-label',stage[0]+'から次への計画CVR');input.value=stage[2]??30;rate.append(input);}
    const btn=document.createElement('button');btn.type='button';btn.textContent='削除';btn.disabled=total<=2;btn.setAttribute('aria-label',stage[0]+'を削除');btn.addEventListener('click',()=>{const snapshot=readStageInputs().filter((_,i)=>i!==index);drawRows(snapshot);refresh();});remove.append(btn);
    tr.append(name,actual,rate,remove);return tr;
  }
  function readStageInputs(){return [...$('stageRows').querySelectorAll('tr')].map(tr=>[tr.querySelector('.stage-name').value, tr.querySelector('.stage-actual').value, tr.querySelector('.stage-rate')?.value??null]);}
  function drawRows(stages){const rows=$('stageRows');rows.replaceChildren();stages.forEach((s,i)=>rows.append(stageRow(s,i,stages.length)))}
  function setData(d){$('period').value=d.period;$('target').value=d.target;$('achieved').value=d.achieved;$('elapsed').value=d.elapsed;$('remaining').value=d.remaining;$('members').value=d.members;drawRows(d.stages.map(s=>Array.isArray(s)?s:[s.name,s.actual,s.rate]));refresh();}
  function recordState(){try{const d=getInput();localStorage.setItem(KEY,JSON.stringify(d));$('storageStatus').textContent='この端末に保存済み'}catch{$('storageStatus').textContent='自動保存が利用できません'}}
  function setText(id,text){$(id).textContent=text}
  function updateBars(m){const vals=[m.d.achieved,m.projected??0,m.d.target];const max=Math.max(1,...vals);[['actualBar',vals[0]],['forecastBar',vals[1]],['targetBar',vals[2]]].forEach(([id,n])=>$(id).style.width=Math.min(100,n/max*100)+'%');setText('actualBarLabel',fmt(vals[0])+'件');setText('forecastBarLabel',m.projected===null?'算出不可':decimal(vals[1])+'件');setText('targetBarLabel',fmt(vals[2])+'件');}
  function textNode(tag,text){const e=document.createElement(tag);e.textContent=text;return e}
  function updateRecommendations(m){const box=$('insightList');box.replaceChildren();const items=[];if(m.gap===0)items.push(['目標達成','現時点の目標は達成しています。次は再現性と成果の質を確認してください。']);
    else if(m.d.remaining===0)items.push(['残営業日がありません','目標との差は'+fmt(m.gap)+'件。期間設定または次期目標の確認を優先してください。']);
    else{items.push(['残り'+fmt(m.gap)+'件を埋める','残り'+m.d.remaining+'営業日で、チーム全体の成約は1日平均'+decimal(m.gap/m.d.remaining)+'件が必要です。']);items.push(['必要活動量を確保する',m.d.stages[0].name+'はチームで1日約'+fmt(m.rows[0].teamDaily)+'件、1人あたり約'+fmt(m.rows[0].personDaily)+'件が目安です。']);}
    if(m.best&&m.best.save>0)items.push(['改善効果が大きい場所',m.d.stages[m.best.index].name+' → '+m.d.stages[m.best.index+1].name+' の計画CVRを5ポイント上げると、最上流必要数を約'+fmt(m.best.save)+'件抑えられる試算です。']);
    if(m.projected!==null&&m.gap>0){const short=m.d.target-m.projected;if(short>0)items.push(['ペースの見直し','現在ペースの着地は目標を約'+decimal(short)+'件下回る予測です。活動量か転換率のどちらを改善するか決めてください。']);}
    m.warnings.forEach(w=>items.push(['入力・前提の確認',w]));
    if(!items.length)items.push(['計画を確認','営業日数とCVRの変化を定期的に見直しましょう。']);
    items.forEach(([title,body])=>{const div=document.createElement('div');div.append(textNode('b',title),textNode('p',body));box.append(div);});
  }
  function updateTable(m){const tbody=$('resultRows');tbody.replaceChildren();m.rows.forEach(row=>{const tr=document.createElement('tr');[row.name,fmt(row.required)+'件',row.teamDaily===null?'—':fmt(row.teamDaily)+'件',row.personDaily===null?'—':fmt(row.personDaily)+'件',row.planRate===null?'最終成果':(row.actualRate===null?'—':decimal(row.actualRate)+'%')+' / '+decimal(row.planRate)+'%'].forEach(t=>tr.append(textNode('td',t)));tbody.append(tr);});}
  function scenario(m){if(!m||m.error)return;const index=Number($('leverageStage').value),lift=Number($('lift').value),rate=m.d.stages[index]?.rate;
    if(!Number.isInteger(index)||index<0||index>=m.d.stages.length-1||!Number.isFinite(rate)){setText('savedTop','—');setText('improvedTop','—');return;}
    const improved=reverse(m.gap,m.d.stages,index,lift);if(!improved){setText('savedTop','算出不可');return;}
    const saved=m.required[0]-improved[0];setText('savedTop',fmt(saved)+'件');setText('improvedTop',fmt(improved[0])+'件');
    setText('scenarioNote',m.d.stages[index].name+' → '+m.d.stages[index+1].name+' の計画CVRを '+decimal(rate)+'% から '+decimal(Math.min(100,rate+lift))+'% に変更した場合。');
  }
  function updateLeverage(m){const el=$('leverageStage'),old=selectedLeverage,opts=m.d.stages.slice(0,-1);el.replaceChildren();
    opts.forEach((s,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=s.name+' → '+m.d.stages[i+1].name;el.append(option)});
    const chosen=old!==null&&old<opts.length?old:(m.best?.index??0);el.value=String(chosen);selectedLeverage=chosen;scenario(m);
  }
  function update(m){model=m;setText('periodLabel',m.d.period||'現在の予実');setText('attainment',decimal(m.attainment)+'%');setText('gap',fmt(m.gap)+'件');setText('projection',m.projected===null?'—':decimal(m.projected)+'件');setText('projectionNote',m.projected===null?'経過営業日が必要です':'経過営業日ベースの単純推計');setText('dailyClose',m.needed===null?'算出不可':decimal(m.needed)+'件');setText('dailyCloseNote',m.needed===null?'残営業日がありません':'残目標 ÷ 残営業日 ÷ 人数');
    $('attainment').classList.toggle('positive',m.attainment>=100);$('projection').classList.toggle('negative',m.projected!==null&&m.projected<m.d.target);
    updateBars(m);setText('paceMessage',m.projected===null?'経過営業日を入力すると着地ペースを推計します。':m.projected>=m.d.target?'現状ペースでは目標到達の見込みです。CVRや日々の活動量に変化がないかを確認しましょう。':'現状ペースでは目標を下回る見込みです。必要な成果と最上流の行動量を両方管理しましょう。');
    updateRecommendations(m);updateTable(m);updateLeverage(m);
  }
  function refresh(){const d=getInput();recordState();const issues=validate(d);const errors=$('errors');
    if(issues.length){errors.hidden=false;errors.textContent=issues.join('\n');model=null;return false;}
    const m=calculate(d);if(m.error){errors.hidden=false;errors.textContent=m.error;model=null;return false;}
    errors.hidden=true;errors.textContent='';data=d;update(m);return true;
  }
  function report(){if(!model)return'';const m=model,d=m.d,lines=[
    'WORKKIT｜営業予実分析', '対象：'+(d.period||'指定なし'),'目標：'+d.target+'件 / 実績：'+d.achieved+'件 / 達成率：'+decimal(m.attainment)+'%','残目標：'+m.gap+'件 / 経過営業日：'+d.elapsed+'日 / 残営業日：'+d.remaining+'日 / 人数：'+d.members+'名','着地予測：'+(m.projected===null?'算出不可':decimal(m.projected)+'件'),'1人1日あたり必要成約：'+(m.needed===null?'算出不可':decimal(m.needed)+'件'),'','【残目標からの逆算】'];
    m.rows.forEach(r=>lines.push(r.name+'：必要'+r.required+'件 / チーム1日'+(r.teamDaily??'—')+'件 / 1人1日'+(r.personDaily??'—')+'件'));
    lines.push('','【改善シナリオ】',$('scenarioNote').textContent,'最上流削減見込み：'+$('savedTop').textContent,'','※ペース予測は営業日ベースの単純推計。ファネル逆算では既存パイプラインを考慮していません。');
    if(m.warnings.length)lines.push('','【確認事項】',...m.warnings);return lines.join('\n');
  }
  function csvCell(v){const str=String(v??'');return '"'+( /^[=+\-@\t\r]/.test(str)?'\''+str:str).replace(/"/g,'""')+'"'}
  function downloadCsv(){if(!model)return;const m=model,d=m.d;const rows=[['WORKKIT 予実分析'],['対象',d.period],['目標',d.target],['実績',d.achieved],['達成率（%）',decimal(m.attainment)],['着地予測（件）',m.projected===null?'算出不可':decimal(m.projected)],['経過営業日',d.elapsed],['残営業日',d.remaining],['人数',d.members],[],['ステージ','期間実績','必要総数','チーム日次','1人日次','実績CVR(%)','計画CVR(%)']];m.rows.forEach(r=>rows.push([r.name,r.actual,r.required,r.teamDaily??'',r.personDaily??'',r.actualRate===null?'':decimal(r.actualRate),r.planRate??'']));
    rows.push([],['改善案',$('scenarioNote').textContent],['削減活動量',$('savedTop').textContent],['注意','将来予測・必要量は参考試算であり成果を保証しません']);
    const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='workkit-forecast-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setText('exportStatus','CSVを作成しました。');
  }
  $('forecastForm').addEventListener('submit',e=>{e.preventDefault();if(refresh())$('results').scrollIntoView({behavior:'smooth',block:'start'});});
  $('forecastForm').addEventListener('input',()=>refresh());
  $('forecastForm').addEventListener('change',()=>refresh());
  $('addStage').addEventListener('click',()=>{const s=readStageInputs();if(s.length>=MAX_STAGE){setText('exportStatus','最大12ステージです。');return;}if(s.length>0&&s.at(-1)[2]===null)s[s.length-1][2]='30';s.push(['新しいステージ',0,null]);drawRows(s);refresh();});
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{selectedLeverage=null;setData(presets[b.dataset.preset]);}));
  $('example').addEventListener('click',()=>{selectedLeverage=null;setData(presets.tele)});
  $('reset').addEventListener('click',()=>{if(!confirm('この端末に保存した予実データを初期化しますか？'))return;localStorage.removeItem(KEY);selectedLeverage=null;setData(presets.simple);});
  $('leverageStage').addEventListener('change',()=>{selectedLeverage=Number($('leverageStage').value);scenario(model)});
  $('lift').addEventListener('change',()=>scenario(model));
  $('copyReport').addEventListener('click',async()=>{if(!refresh())return;const s=report();try{await navigator.clipboard.writeText(s);setText('exportStatus','分析結果をコピーしました。')}catch{const area=document.createElement('textarea');area.value=s;document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();setText('exportStatus',ok?'コピーしました。':'コピーできませんでした。テキスト選択でご利用ください。')}});
  $('downloadCsv').addEventListener('click',()=>{if(refresh())downloadCsv()});
  try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.stages)&&saved.stages.length>=2&&saved.stages.length<=MAX_STAGE&&saved.stages.every(s=>s&&typeof s.name==='string')){setData(saved)}else setData(presets.tele)}catch{setData(presets.tele)}
  window.WorkKitForecast=Object.freeze({version:'2.0',calculate,validate,reverse});
})();
