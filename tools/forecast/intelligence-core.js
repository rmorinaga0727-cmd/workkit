/* Pure, deterministic intelligence. No API, network, DOM or persistence. */
(function(root){'use strict';
 const E=root.ForecastEngine,C=root.ForecastImportCore,dayMs=86400000;
 const num=n=>Number.isFinite(n)?n:null,round=n=>Math.round(n*10)/10;
 function bounds(date,unit){const d=new Date(date+'T00:00:00Z');let start,end;
  if(unit==='year'){start=new Date(Date.UTC(d.getUTCFullYear(),0,1));end=new Date(Date.UTC(d.getUTCFullYear()+1,0,0));}
  else if(unit==='quarter'){const m=Math.floor(d.getUTCMonth()/3)*3;start=new Date(Date.UTC(d.getUTCFullYear(),m,1));end=new Date(Date.UTC(d.getUTCFullYear(),m+3,0));}
  else if(unit==='month'){start=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0));}
  else if(unit==='week'){start=new Date(d);start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);end=new Date(start);end.setUTCDate(end.getUTCDate()+6);}
  else start=end=d;
  return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
 }
 function keyOf(date,unit){const b=bounds(date,unit);return unit==='year'?b.start.slice(0,4):unit==='quarter'?b.start.slice(0,4)+' Q'+(Math.floor(+b.start.slice(5,7)/3)+1):unit==='month'?b.start.slice(0,7):b.start;}
 function grainRank(g){return {day:0,week:1,month:2,quarter:3,year:4}[g]??0;}
 function events(dataset){
  const records=(dataset?.records||[]).filter(r=>r.date).slice().sort((a,b)=>a.date.localeCompare(b.date));
  if(dataset?.mode!=='cumulative')return {records,limited:false,error:null};
  if(dataset.cumulativeBase==='continuous')return {records:[],limited:true,error:'通算累計は時点残高です。期間内累計または期間実績へ変換するまで、前期比・成長率を表示しません。'};
  const previous=new Map();let bad=false;
  const result=records.map(r=>{const k=C.seriesKey(r)+'|'+r.date.slice(0,r.grain==='year'?4:7),p=previous.get(k),values={};for(const [name,value]of Object.entries(r.values)){if(name==='target'){values[name]=value;continue;}const diff=value-(p?.values[name]||0);if(diff<0)bad=true;values[name]=diff;}previous.set(k,r);return {...r,values};});
  return {records:bad?[]:result,limited:true,error:bad?'期間内累計が途中で減少しています。累計のリセット範囲・列の意味を確認してください。':null};
 }
 function buckets(dataset,unit,asOf,filters={}){
  const pf=dataset?.profile||{},ev=events(dataset);if(ev.error)return {items:[],error:ev.error};
  if(pf.grain==='mixed')return {items:[],error:'日次・月次などの粒度が混在しています。同じ定義の期間データへ分離してください。'};
  if(grainRank(unit)<grainRank(pf.grain))return {items:[],error:'元データが'+pf.grain+'単位のため、細かい期間へ分解できません。'};
  const groups=new Map(),keys=dataset.stageKeys||[];
  for(const r of ev.records){if(Object.entries(filters).some(([k,v])=>v&&r[k]!==v))continue;const key=keyOf(r.date,unit);if(!groups.has(key))groups.set(key,{key,...bounds(r.date,unit),values:Object.fromEntries(keys.map(k=>[k,0])),days:new Set(),people:new Set(),goals:new Map(),source:[]});const g=groups.get(key);keys.forEach(k=>g.values[k]+=r.values[k]||0);g.days.add(r.date);if(r.person)g.people.add(r.person);g.source.push(r);if(r.values.target!==undefined){const level=dataset.targetLevel||'person',key=level==='segment'?C.seriesKey(r):level==='global'?'all':r.person||'all';const targetKey=key+'|'+r.date.slice(0,r.grain==='year'?4:7)+(dataset.targetMode==='sum'?'|'+r.row+'|'+r.date+'|'+C.seriesKey(r):'');g.goals.set(targetKey,r.values.target);}}
  const items=[...groups.values()].sort((a,b)=>a.start.localeCompare(b.start)).map(g=>{
   const flow=root.ForecastDiagnosis?.flow(keys.map((k,i)=>({name:dataset.stageNames?.[i]||k,actual:g.values[k]})),dataset.input?.definition);const rates=keys.slice(0,-1).map((k,i)=>flow?.[i]?.safe===false?null:g.values[k]>0?g.values[keys[i+1]]/g.values[k]*100:null);
   const wd=[...new Set(g.source.map(r=>r.workdays).filter(v=>v!==null&&v!==undefined))],staff=[...new Set(g.source.map(r=>r.staff).filter(v=>v!==null&&v!==undefined))];
   return {key:g.key,start:g.start,end:g.end,values:g.values,value:g.values[keys.at(-1)]||0,rates,recordedDays:g.days.size,people:g.people.size,target:dataset.targetApplicable!==false&&pf.hasTarget&&(dataset.targetMode==='sum'||grainRank(unit)>=grainRank(pf.grain==='year'?'year':'month'))?[...g.goals.values()].reduce((a,b)=>a+b,0):null,partial:g.end>asOf,workdays:wd.length===1?wd[0]:null,staff:staff.length===1?staff[0]:null,cumulative:ev.limited};
  });
  return {items,error:null};
 }
 function rangeBucket(dataset,from,to,asOf,filters={}){
  if(!C.date(from)||!C.date(to)||from>to)return null;
  const records=(dataset.records||[]).filter(r=>r.date>=from&&r.date<=to&&!Object.entries(filters).some(([k,v])=>v&&r[k]!==v));
  if(!records.length)return null;
  const ev=events(dataset);if(ev.error)return null;const selected=ev.records.filter(r=>r.date>=from&&r.date<=to&&!Object.entries(filters).some(([k,v])=>v&&r[k]!==v));
  const values=Object.fromEntries((dataset.stageKeys||[]).map(k=>[k,selected.reduce((s,r)=>s+(r.values[k]||0),0)])),keys=dataset.stageKeys||[];
  return {key:from+' 〜 '+to,start:from,end:to,value:values[keys.at(-1)]||0,values,rates:keys.slice(0,-1).map((k,i)=>root.ForecastDiagnosis?.flow(keys.map((key,j)=>({name:dataset.stageNames?.[j]||key,actual:values[key]})),dataset.input?.definition)[i]?.safe===false?null:values[k]>0?values[keys[i+1]]/values[k]*100:null),recordedDays:new Set(records.map(r=>r.date)).size,people:new Set(records.map(r=>r.person).filter(Boolean)).size,partial:to>asOf,target:null,cumulative:ev.limited};
 }
 function compare(a,b,options={}){
  if(!a||!b)return {status:'unavailable',reason:'比較する2期間のデータを選択してください。'};
  if(!Number.isFinite(a.value)||!Number.isFinite(b.value))return {status:'unavailable',reason:'比較する期間の分母または実績が不足しています。'};
  if(options.normalize&&options.isRate)return {status:'unavailable',reason:'CVRは分子合計÷分母合計で比較します。人数・営業日数で率を割る標準化はできません。'};
  const reasons=[];if(!options.confirmed)reasons.push('同じKPI定義・集計条件であることを確認してください。');if(a.partial||b.partial)reasons.push('期間途中のデータを含みます。完成期間との単純比較は参考値です。');
  const span=p=>Math.round((Date.parse(p.end)-Date.parse(p.start))/dayMs)+1;if(span(a)!==span(b))reasons.push('暦日数が異なります。営業日数や人数を確認してください。');if(a.cumulative||b.cumulative)reasons.push('期間内累計を差分化しています。日別の発生日ではなく記録日ベースです。');
  let av=a.value,bv=b.value;
  if(options.normalize){const {daysA,membersA,daysB,membersB}=options;if(![daysA,membersA,daysB,membersB].every(n=>Number.isFinite(n)&&n>0))return {status:'unavailable',reason:'両期間の営業日数と人数を入力すると、1人1営業日あたりで比較できます。'};av/=daysA*membersA;bv/=daysB*membersB;}
  return {status:reasons.length?'conditional':'available',reasons,a:av,b:bv,delta:bv-av,percent:av===0?null:(bv/av-1)*100,rateDelta:b.rates.map((r,i)=>r===null||a.rates[i]===null?null:r-a.rates[i]),unit:options.isRate?'%':options.normalize?'件 / 人・営業日':'件',deltaUnit:options.isRate?'pt':options.normalize?'件 / 人・営業日':'件'};
 }
 function segments(dataset,dimension,asOf){
  if(!(dataset?.profile?.dimensions?.[dimension]>0))return [];
  const all=new Map();for(const r of dataset.records||[]){const key=r[dimension];if(!key)continue;if(!all.has(key))all.set(key,[]);all.get(key).push(r);}
  return [...all].map(([name,records])=>{const values=C.aggregate(records,dataset.stageKeys,dataset.mode,dataset.cumulativeBase);return {name,values,actual:values.at(-1)||0,rates:values.slice(0,-1).map((n,i)=>root.ForecastDiagnosis?.flow(values.map((actual,j)=>({name:dataset.stageNames?.[j]||dataset.stageKeys[j],actual})),dataset.input?.definition)[i]?.safe===false?null:n>0?values[i+1]/n*100:null)};}).sort((a,b)=>b.actual-a.actual);
 }
 function scenario(m,options={}){
  const d=m.d;if(root.ForecastDiagnosis?.flow(d.stages,d.definition).some(f=>!f.safe))return {available:false,reason:'工程の対象母集団・件数関係を確認するまで連鎖試算は算出しません。'};const index=Math.max(0,Math.min(d.stages.length-2,options.index||0)),lift=Number(options.lift??5),factor=Number(options.factor??1.2);
  if((d.targetKnown===false||!Number.isSafeInteger(d.target)))return {available:false,reason:'目標を追加すると目標達成シミュレーションを利用できます。'};
  if(d.stages.length<2)return {available:false,reason:'前段階の活動件数とCVRを追加すると、活動量と転換率を分けて試算できます。'};
  const observed=m.rows.slice(0,-1).map(r=>r.actualRate),usable=observed.every(r=>r!==null&&r>=0&&r<=100),rates=usable?observed:d.stages.slice(0,-1).map(s=>s.rate),basis=usable?'期間実績CVR':'入力した計画CVR（実績CVR不足）';
  if(!rates.every(r=>Number.isFinite(r)&&r>=0&&r<=100))return {available:false,reason:'このKPI構造ではシミュレーションを算出していません。'};const stages=d.stages.map((s,i)=>({...s,rate:i<rates.length?rates[i]:null}));const a=E.reverse(m.gap,stages);
  const daily=Number(options.dailyCapacity)>0?Number(options.dailyCapacity):(d.daysConfirmed&&d.elapsed>0?d.stages[0].actual/d.elapsed:null);const budget=d.daysConfirmed&&daily!==null&&Number.isFinite(d.remaining)?daily*d.remaining:null;
  const other=rates.reduce((p,r,i)=>i===index?p:p*r/100,1),neededRate=budget>0&&other>0?m.gap/budget/other*100:null;
  const improved=rates.map((r,i)=>Math.min(100,r+(i===index?lift:0))),product=improved.reduce((p,r)=>p*r/100,1),combined=E.reverse(m.gap,stages,index,lift);
  function feasibility(total){if(!d.daysConfirmed||!Number.isFinite(total)||!(d.remaining>0)||!(d.members>0))return '';const minutes=Number(options.minutes),hours=Number(options.hours);if(!(minutes>0&&hours>0))return '';const perPerson=total/d.remaining/d.members,needed=perPerson*minutes;return '最上流の活動のみ：1人1日 '+round(needed/60)+'時間 / 入力枠 '+hours+'時間。'+(needed<=hours*60?'入力した時間枠の範囲内です。他業務の時間は別途必要です。':'入力した時間枠を超えます。活動量だけに依存しない改善を検討してください。');}
  const currentProduct=rates.reduce((p,r)=>p*r/100,1),future=budget===null?null:budget*currentProduct;
  return {available:true,basis,index,rates,neededRate,ratePossible:neededRate!==null&&neededRate<=100&&neededRate>=0,budget,daily,activityFactor:factor,lift,
   A:{required:a,top:a?.[0]??null,daily:a&&d.daysConfirmed&&d.remaining>0?a[0]/d.remaining:null,personDaily:a&&d.daysConfirmed&&d.remaining>0&&d.members>0?a[0]/d.remaining/d.members:null,projection:a?d.achieved+m.gap:null,feasibility:feasibility(a?.[0])},
   B:{top:budget,neededRate,projection:neededRate!==null&&neededRate<=100?d.achieved+m.gap:null,feasibility:budget===null?'活動ペースを算出できません。チームの日次活動可能量を入力してください。':feasibility(budget)},
   C:{required:combined,top:combined?.[0]??null,plannedActivity:budget===null?null:budget*factor,projection:budget===null?null:d.achieved+budget*factor*product,feasibility:feasibility(budget===null?null:budget*factor)},
   currentProjection:future===null?null:d.achieved+future,assumption:'現在の転換率が維持され、案件タイムラグと既存パイプラインを含めない参考試算。必要成果は残目標 '+m.gap+'件。A/Bの着地は必要条件が成立した場合の目標値で、実績予測の保証ではありません。'};
 }
 function pipeline(dataset,d,asOf){
  const source=(dataset?.records||[]).filter(r=>r.projectId);if(!source.length)return {available:false,reason:'案件ID・ステージ・各日付がありません。'};
  const latest=new Map();for(const r of source){const old=latest.get(r.projectId);if(!old||String(r.stageDate||r.date)>=String(old.stageDate||old.date))latest.set(r.projectId,r);}
  const cases=[...latest.values()],closed=cases.filter(r=>r.closedDate),open=cases.filter(r=>!r.closedDate),lead=closed.filter(r=>r.openedDate&&r.closedDate>=r.openedDate).map(r=>(Date.parse(r.closedDate)-Date.parse(r.openedDate))/dayMs),dwell=open.filter(r=>r.stageDate&&r.stageDate<=asOf).map(r=>({id:r.projectId,stage:r.caseStage,days:(Date.parse(asOf)-Date.parse(r.stageDate))/dayMs}));
  const eligible=open.filter(r=>r.dueDate&&r.dueDate>=asOf&&d.periodEnd&&r.dueDate<=d.periodEnd&&r.probability!==null&&r.probability!==undefined),weighted=eligible.reduce((s,r)=>s+r.probability/100,0);
  return {available:true,total:cases.length,open:open.length,closed:closed.length,leadCount:lead.length,leadDays:lead.length?lead.reduce((a,b)=>a+b,0)/lead.length:null,dwell:dwell.sort((a,b)=>b.days-a.days).slice(0,8),weighted:eligible.length?weighted:null,weightedCount:eligible.length,weightedProjection:eligible.length?d.achieved+weighted:null,reason:eligible.length?'入力された成約確率と予定日に基づく参考値。確率の校正と成約の保証は未検証です。':'見込日・成約確率・目標期間末が揃っていないため、案件加味の着地は算出しません。'};
 }
 function navigator(d,dataset,m){const pf=dataset?.profile||{},missing=[];
 if(d.targetKnown===false||!Number.isSafeInteger(d.target))missing.push({field:'対象期間の目標',value:'達成率と、目標までの必要活動量を確認できます。',columns:['目標']});
 if(d.stages.length<2)missing.push({field:'営業工程ごとの実績件数',value:'実際の工程間CVRと、改善する区間を確認できます。',columns:['工程名','工程の実績件数']});
 else if(d.stages.slice(0,-1).some(s=>s.rate==null))missing.push({field:'各工程の計画CVR',value:'実績と計画の差、計画ベースの目標逆算を確認できます。',columns:['計画CVR']});
 if(!d.periodStart||!d.periodEnd||!(d.elapsed>0)||d.remaining==null||!d.daysConfirmed)missing.push({field:'対象期間・確認済み営業日数',value:'現在のペースによる参考着地を確認できます。',columns:['日付','営業日数']});
 if((pf.months||0)<2)missing.push({field:'年月付きの複数期間データ',value:'中長期の推移と期間差を確認できます。',columns:['年月']});
 if(!Object.values(pf.dimensions||{}).some(n=>n>=2))missing.push({field:'担当者・チーム・商材・地域',value:'該当する分類が複数あれば、実績とCVRを比較できます。',columns:['担当者','チーム','商材','地域']});
 return {modules:[],missing:missing.slice(0,3),recommended:[...new Set([...d.stages.map(s=>s.name),...missing.slice(0,3).flatMap(m=>m.columns)])]};
 }
 function build(d,dataset,role,asOf,phase=()=>{}){
  const errors=E.validate(d);if(errors.length)throw new Error(errors.join('\n'));phase('整合性検証が完了');
  if(dataset?.records?.some(r=>r.date&&r.date>asOf))throw new Error('分析基準日より後の実績日・対象期間が含まれています。実績と予定の列、または分析基準日を確認してください。保存済みデータは変更しません。');
  const m=E.calculate(d);if(m.error)throw new Error(m.error);const validity=root.ForecastDiagnosis?.flow(d.stages,d.definition);if(validity?.some(f=>!f.safe)){validity.forEach((f,i)=>{if(!f.safe)m.rows[i].actualRate=null;});m.required=null;m.best=null;m.rows.forEach(row=>{row.required=null;row.teamDaily=null;row.personDaily=null;});}if(d.daysConfirmed!==true){m.projected=null;m.needed=null;for(const row of m.rows){row.teamDaily=null;row.personDaily=null;}}phase('目標・実績・残必要量を計算');
  const pf=dataset?.profile||{dates:0,months:0,dimensions:{},grain:null,roles:[]};phase('KPI構造とデータ充足状況を識別');
  const unit=grainRank(pf.grain)>2?pf.grain:pf.grain==='week'&&pf.months<=2?'week':pf.grain==='day'&&pf.dates<=14&&pf.months<2?'day':'month',time=buckets(dataset||{records:[],stageKeys:[]},unit,asOf);const complete=time.items.filter(p=>!p.partial);phase('記録期間と比較可能なデータを照合');
  const observed=m.rows.slice(0,-1).map((r,i)=>({index:i,name:r.name+' → '+m.rows[i+1].name,actualRate:r.actualRate,planRate:r.planRate,gap:r.actualRate===null||r.planRate==null?null:r.actualRate-r.planRate,count:r.actual}));const bottleneck=observed.filter(r=>r.gap!==null&&r.gap<0).sort((a,b)=>a.gap-b.gap)[0]||null;phase('営業ファネルと改善余地を計算');
  const sim=scenario(m,{index:m.best?.index||0});phase('改善シナリオと実行条件を算出');
  const hasGoal=d.targetKnown!==false&&Number.isSafeInteger(d.target),periodCurrent=!!(d.periodStart&&d.periodEnd&&d.periodStart<=asOf&&asOf<=d.periodEnd),hasForecast=periodCurrent&&d.elapsed>0&&Number.isFinite(d.remaining)&&d.daysConfirmed===true;
  const diagnosis=root.ForecastDiagnosis?root.ForecastDiagnosis.assess(d,dataset,m,{buckets},asOf):null;
  const p=diagnosis?.priorities?.[0],n=val=>Number.isFinite(val)?val.toLocaleString('ja-JP',{maximumFractionDigits:2}):'未算出';
  const conclusion=!hasGoal?'実績 '+n(d.achieved)+'件。目標未設定。':m.gap===0?'目標達成：実績 '+n(d.achieved)+'件 / 目標 '+n(d.target)+'件。':'目標未達：実績 '+n(d.achieved)+'件 / 目標 '+n(d.target)+'件（残り '+n(m.gap)+'件）。';
  const sub=(hasGoal?'達成率 '+m.attainment.toLocaleString('ja-JP',{minimumFractionDigits:0,maximumFractionDigits:1})+'% / 予実差 '+n(d.achieved-d.target)+'件。':'')+(hasForecast?'着地予測 '+n(m.projected)+'件。':'着地予測は対象期間・営業日数の条件不足、または過去期間のため未算出。')+(diagnosis?.comparison?'前月比：最終成果 '+n(diagnosis.comparison.actualDelta)+'件。':'');
  const actions=diagnosis?.priorities.length?diagnosis.priorities.map(c=>({title:c.body,body:c.evidence+' / 最終成果への影響 +'+n(c.impact)+'件（条件付き）',evidence:c.formula})): [{title:hasGoal&&m.gap===0?'目標達成・残必要成果0件':'比較可能なKPIで実績を確認',body:'実績 '+n(d.achieved)+'件。'+(diagnosis?.comparison?'比較した工程で優先する低下候補はありません。':'比較基準がないため、ボトルネック・改善幅は未判定。'),evidence:'原因の断定や架空の改善幅は生成しません。'}];
  const nav=navigator(d,dataset,m),pipe={available:false};
  let stability=null,seasonality=null;if(complete.length>=12){const values=complete.map(p=>p.value),mean=values.reduce((a,b)=>a+b,0)/values.length;stability=mean>0?Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/values.length)/mean:null;}
  if(pf.grain!=='year'&&complete.length>=36){const monthMap=new Map();complete.forEach(p=>{const k=p.start.slice(5,7);if(!monthMap.has(k))monthMap.set(k,[]);monthMap.get(k).push(p.value);});if(monthMap.size===12&&[...monthMap.values()].every(a=>a.length>=3))seasonality=[...monthMap].sort().map(([month,values])=>({month,mean:values.reduce((a,b)=>a+b,0)/values.length,count:values.length}));}
  phase('分析結果・推奨アクション・追加データを整理');
  const report={model:m,diagnosis,profile:pf,conclusion,sub,actions:actions.slice(0,3),role,asOf,hasGoal,hasReverse:hasGoal&&m.required!==null,hasForecast,periodCurrent,bottleneck,observed,scenario:sim,navigator:nav,pipeline:pipe,defaultUnit:unit,series:time.items.slice(-120),seriesCount:time.items.length,timeError:time.error,defaultComparison:complete.length>=2?compare(complete.at(-2),complete.at(-1),{confirmed:false}):null,stability,seasonality,warnings:[...m.warnings,...(dataset?.warnings||[])],scope:dataset?.source||'manual'};if(root.ForecastPlanner)report.actionPlan=root.ForecastPlanner.build(report,dataset);return report;
 }
 const api={bounds,keyOf,buckets,rangeBucket,compare,segments,scenario,pipeline,navigator,build,events,grainRank};root.ForecastIntelligence=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
