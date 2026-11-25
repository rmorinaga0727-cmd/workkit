/* V3 normalization around the preserved V2 reader and numeric rules. */
(function(root){
 'use strict';const legacy=root.ForecastImportCore;
 const aliases={person:['担当者','担当','社員名','氏名','person','owner','member'],product:['商材','商品','サービス','product','service'],team:['部署','チーム','team','department'],region:['地域','エリア','region','area'],workdays:['営業日数','稼働日数','workdays'],staff:['人数','稼働人数','staff'],projectId:['案件ID','案件番号','projectid','dealid'],caseStage:['案件ステージ','案件状況','dealstage'],openedDate:['商談日','案件開始日','openeddate'],closedDate:['契約日','受注日','closeddate'],stageDate:['ステージ更新日','更新日','stagedate'],dueDate:['契約予定日','受注予定日','duedate'],probability:['成約確率','受注確率','probability'],lossReason:['失注理由','lossreason']};
 const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[\s_（）()]/g,'');
 function period(value){const s=String(value??'').normalize('NFKC').trim();let m;
  if((m=s.match(/^(\d{4})[年/.-](\d{1,2})月?$/))&&+m[2]>=1&&+m[2]<=12)return {date:m[1]+'-'+m[2].padStart(2,'0')+'-01',grain:'month'};
  if((m=s.match(/^(\d{4})年?$/)))return {date:m[1]+'-01-01',grain:'year'};
  if((m=s.match(/^(\d{4})-?W(\d{1,2})$/i))&&+m[2]>=1&&+m[2]<=53){const d=new Date(Date.UTC(+m[1],0,4));d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7+(+m[2]-1)*7);return {date:d.toISOString().slice(0,10),grain:'week'};}
  const d=legacy.date(s);return d?{date:d,grain:'day'}:null;
 }
 function legacyInfer(headers){const used=new Set();return headers.map((h,i)=>{let role=legacy.infer([String(h).replace(/^(日別|週次|月次|年次|daily\s+|weekly\s+|monthly\s+)/i,'')])[0]||'';if(/^(年月|対象月|month|期間|対象期間|年度|year|week|週|訪問日|送信日|返信日|接続日|活動日|記録日)$/i.test(norm(h)))role='date';if(/目標/.test(norm(h))&&!/率|CVR|%/i.test(norm(h))&&/成約|受注|契約|最終成果|最終実績/.test(norm(h)))role='target';for(const [k,a]of Object.entries(aliases))if(a.some(x=>norm(x)===norm(h)))role=k;if(used.has(role))return '';if(role)used.add(role);return role;});}

 const processWord=/(訪問|対話|送信|返信|開封|配信|問い合わせ|問合|資料請求|体験|予約|申込|申請|応募|来店|試用|面談|提案|購入|更新|継続|見積|登録|トライアル|説明会|デモ|リード|見込|接点|接触|打診|紹介|資料|相談|見学|MQL|SAL|SQL)/i;
 const processRanks=[/架電|訪問|送信|配信|アプローチ|問い合わせ|問合|来店|応募|登録/,/接続|開封|対話|MQL/i,/有効会話|返信|資料請求|SAL/i,/アポ|予約|体験|試用|トライアル|申込|申請|SQL/i,/商談|面談|説明会|デモ/,/提案|見積/,/契約|成約|受注|購入|継続|更新/];
 function infer(headers){const roles=legacyInfer(headers),extra=headers.map((h,i)=>{const text=String(h??'').normalize('NFKC');return !roles[i]&&!/CVR|率|%|理由|有無|可否|履歴|トーク案|文面案|件名案|種別|時刻|時間帯|区分|属性|住所|所在地|金額|売上|単価|時間|日数|人数|人員|スタッフ|目標|予定日|契約日|日$|ID|番号|データ件数|行数/i.test(text)&&(processWord.test(text)||/件数$|到達数$|数$/.test(text)&&! /商材数|商品数|地域数|部署数|チーム数|合計数/.test(text));});if(!extra.some(Boolean))return roles;const stages=headers.map((h,i)=>({i,text:String(h),rank:/配信成功/.test(String(h))?.5:/打診|決裁者接触/.test(String(h))?2.5:/有効返信/.test(String(h))?3:processRanks.reduce((n,re,j)=>re.test(String(h))?j:n,-1)})).filter(({i})=>/^stage\d+$/.test(roles[i])||extra[i]);stages.sort((a,b)=>(a.rank<0||b.rank<0?0:a.rank-b.rank)||a.i-b.i);const assigned=new Map(stages.map((v,i)=>[v.i,'stage'+i]));return roles.map((role,i)=>assigned.get(i)||role);}
 function headerIndex(rows){let index=0,best=-1;rows.slice(0,30).forEach((r,i)=>{const n=infer(r).filter(Boolean).length;if(n>best){best=n;index=i;}});return index;}
 const total=v=>/^(総?合計|小計|総計|total|subtotal)$/i.test(String(v??'').trim());
 const dims=['person','product','team','region'];
 const seriesKey=r=>JSON.stringify(dims.map(k=>r[k]||''));
 function aggregate(records,keys,mode,base='period'){
  if(mode!=='cumulative')return keys.map(k=>records.reduce((s,r)=>s+(r.values[k]||0),0));
  const groups=new Map();for(const r of records){const k=seriesKey(r)+(base==='period'?'|'+(r.date||'').slice(0,r.grain==='year'?4:7):'');const old=groups.get(k);if(!old||String(r.date)>=String(old.date))groups.set(k,r);}
  return keys.map(k=>[...groups.values()].reduce((s,r)=>s+(r.values[k]||0),0));
 }
 function profile(records,map,mode){
  const dates=[...new Set(records.map(r=>r.date).filter(Boolean))].sort();const grains=[...new Set(records.map(r=>r.grain).filter(Boolean))];let grain=grains.length===1?grains[0]:grains.length>1?'mixed':null,grainInferred=false;
  if(grain==='day'&&dates.length>1){const gaps=dates.slice(1).map((d,i)=>(Date.parse(d)-Date.parse(dates[i]))/864e5).sort((a,b)=>a-b),median=gaps[Math.floor(gaps.length/2)];if(median>=6&&median<=8){grain='week';grainInferred=true;}else if(dates.length>=3&&median>=27&&median<=32&&new Set(dates.map(d=>d.slice(8))).size===1){grain='month';grainInferred=true;}else if(dates.length>=3&&median>=360&&median<=367&&new Set(dates.map(d=>d.slice(5))).size===1){grain='year';grainInferred=true;}}
  const months=[...new Set(dates.map(d=>d.slice(0,7)))];const dimCounts=Object.fromEntries(dims.map(k=>[k,new Set(records.map(r=>r[k]).filter(Boolean)).size]));
  return {count:records.length,dates:dates.length,start:dates[0]||null,end:dates.at(-1)||null,months:months.length,grain,grainInferred,mode,dimensions:dimCounts,roles:map.filter(Boolean),hasTarget:map.includes('target'),hasCases:map.includes('projectId'),hasWorkdays:map.includes('workdays'),hasStaff:map.includes('staff')};
 }
 function interpret(rows,c){
  const {header,map,mode,from='',to='',scope='latest',targetMode='latest',targetLevel='person',cumulativeBase='period'}=c;
  const issues=[],warnings=[],records=[],seen=new Set();let duplicates=0,totals=0,missing=0;const roleList=map.filter(Boolean),keys=roleList.filter(k=>/^stage\d+$/.test(k)).sort((a,b)=>+a.slice(5)-+b.slice(5)),ci=k=>map.indexOf(k);
  if(!Number.isInteger(header)||header<0||header>=rows.length)return {issues:['見出し行を選択してください。'],warnings,records};
  if(new Set(roleList).size!==roleList.length)issues.push('同じ指標へ複数の列を割り当てられません。');
  const pipeline=!keys.length&&ci('projectId')>=0&&ci('caseStage')>=0;
  if(pipeline&&ci('closedDate')<0)issues.push('案件形式には契約日列が必要です（未契約は空欄）。状態名から契約の有無や期間を推測せず、契約日を追加してください。');
  if(!keys.length&&!pipeline)issues.push('成果件数などのKPI列を1つ以上、または案件IDと案件ステージを指定してください。');
  if(!['daily','cumulative'].includes(mode))issues.push('値が期間実績か累計値かを確認してください。');
  if(mode==='cumulative'&&ci('date')<0)issues.push('累計値の集計には日付・年月の列が必要です。');
  if((from&&!legacy.date(from))||(to&&!legacy.date(to))||(from&&to&&from>to))issues.push('集計期間を確認してください。');
  const text=(r,k)=>ci(k)<0?'':String(r[ci(k)]??'').trim();
  rows.slice(header+1).forEach((r,i)=>{
   if(r.every(v=>String(v??'').trim()===''))return;if(r.some(total)){totals++;return;}
   const p=ci('date')<0?null:period(r[ci('date')]);const rec={row:header+i+2,date:p?.date||null,grain:p?.grain||null,values:{}};
   dims.forEach(k=>{if(ci(k)>=0)rec[k]=text(r,k);});
   for(const k of ['projectId','caseStage','lossReason'])if(ci(k)>=0)rec[k]=text(r,k);
   for(const k of ['openedDate','closedDate','stageDate','dueDate']){if(ci(k)<0)continue;const v=text(r,k);rec[k]=v?legacy.date(v):null;if(v&&!rec[k])issues.push(rec.row+'行目の'+k+'の日付を修正してください。');}
   if(pipeline&&!rec.date){rec.date=rec.closedDate||rec.stageDate||rec.openedDate;rec.grain=rec.date?'day':null;}
   if(ci('date')>=0&&!p&&text(r,'date')!==''){missing++;return;}
   if(rec.date&&((from&&rec.date<from)||(to&&rec.date>to)))return;
   for(const k of dims)if(c[k]&&rec[k]!==c[k])return;
   for(const k of [...keys,...(ci('target')>=0?['target']:[])]){const n=legacy.numeric(r[ci(k)]);rec.values[k]=n;if(n===null&&!(k==='target'&&text(r,k)===''))issues.push(rec.row+'行目「'+String(rows[header][ci(k)])+'」は0以上の整数が必要です。');}
   for(const k of ['workdays','staff']){if(ci(k)<0)continue;const v=text(r,k);rec[k]=v===''?null:legacy.numeric(v);if(v!==''&&rec[k]===null)issues.push(rec.row+'行目の営業日数・人数を確認してください。');}
   const probability=text(r,'probability').replace(/%$/,'');if(ci('probability')>=0)rec.probability=probability===''?null:Number(probability);if(rec.probability!==undefined&&rec.probability!==null&&(!Number.isFinite(rec.probability)||rec.probability<0||rec.probability>100))issues.push(rec.row+'行目の成約確率は0〜100%で入力してください。');
   if(pipeline){rec.values.stage5=rec.closedDate?1:0;if(!rec.projectId)issues.push(rec.row+'行目の案件IDがありません。');}
   const {row,...content}=rec;const signature=JSON.stringify(content);if(seen.has(signature)){duplicates++;return;}seen.add(signature);records.push(rec);
  });
  if(pipeline){keys.push('stage5');const latest=new Map();for(const r of records){const old=latest.get(r.projectId);if(old&&String(r.stageDate||r.date)===String(old.stageDate||old.date))issues.push('同一案件ID・同一更新日に異なる状態があります。日単位で最新状態を確定した表を指定してください。');if(!old||String(r.stageDate||r.date)>=String(old.stageDate||old.date))latest.set(r.projectId,r);}if(latest.size<records.length)warnings.push('同じ案件IDは更新日の最新状態で集計しました。過去ステージの履歴を成約件数へ重複計上しません。');if(!records.some(r=>r.closedDate))warnings.push('契約日がすべて空欄です。空欄は未契約として集計します。単なる未記録でないか確認してください。');records.splice(0,records.length,...latest.values());}if(missing)issues.push('日付・年月を判定できない行が'+missing+'行あります。');if(!records.length)issues.push('対象データがありません。期間や列の対応を見直してください。');
  if(totals)warnings.push('合計・小計 '+totals+'行を除外しました。');if(duplicates)warnings.push('完全一致の重複候補 '+duplicates+'行を除外しました。明細データの場合は同一行の意味を確認してください。');
  if(c.grain&&['day','week','month','year'].includes(c.grain)){const rank={day:0,week:1,month:2,year:4};if(records.some(r=>rank[r.grain]>rank[c.grain]))issues.push('元データより細かい期間へ分解できません。');else records.forEach(r=>r.grain=c.grain);}const pf=profile(records,map,mode);if(c.grain){pf.grain=c.grain;pf.grainInferred=false;}if(pf.grainInferred)warnings.push('記録間隔から粒度を推定しました。元データが日次・週次・月次・年次のどれか確認し、違う場合は詳細設定で修正してください。');let selected=records;
  if(pf.grain==='mixed')issues.push('日次・月次などの粒度が混在しています。同じ期間単位の表へ分離して取り込んでください。');
  if(scope==='latest'&&records.every(r=>r.date)&&pf.grain==='week'&&pf.dates>1){selected=records.filter(r=>r.date===pf.end);warnings.push('診断対象は最新の週。以前の週も期間比較用に保持します。');}
  else if(scope==='latest'&&records.every(r=>r.date)&&pf.months>1){const latest=pf.end.slice(0,pf.grain==='year'?4:7);selected=records.filter(r=>r.date?.startsWith(latest));warnings.push('診断対象は最新の'+(pf.grain==='year'?'年':'月')+'。以前のデータも期間比較用に保持します。');}
  if(records.some(r=>!r.date)&&records.some(r=>r.date))warnings.push('日付なしの行を含むため、今回の診断は全行の実績です。時系列は日付のある行だけを使用します。');const dayGroups=new Set();for(const r of records){const k=seriesKey(r)+'|'+r.date;if(dayGroups.has(k)&&!pipeline){if(mode==='cumulative')issues.push('同一系列・同一日付の累計値が複数あります。商品・地域の対応も確認してください。');else if(!warnings.some(w=>w.startsWith('同一系列')))warnings.push('同一系列・同一日に複数行があります。重複集計がないか確認してください。');}dayGroups.add(k);}
  if(mode==='cumulative'&&cumulativeBase==='continuous')warnings.push('通算累計は最新時点の残高として表示し、期間実績・成長率・前期比を計算しません。期間内累計に変換すると比較できます。');
  if(pf.dimensions.product>1&&pf.hasTarget)warnings.push('商材別の目標か担当者全体の目標か、目標の単位を確認してください。');
  pf.sourceRows=rows.slice(header+1).filter(r=>r.some(v=>String(v??'').trim())&&!r.some(total)).length;const allValues=aggregate(records,keys,mode,cumulativeBase);const allStages=keys.map((key,i)=>({key,name:String(rows[header][ci(key)]||key).slice(0,40),actual:allValues[i]}));const values=aggregate(selected,keys,mode,cumulativeBase);const stages=keys.map((key,i)=>({key,name:pipeline?'成約':String(rows[header][ci(key)]||key).slice(0,40),actual:values[i]}));
  const goals=new Map();for(const r of selected){const k=targetLevel==='segment'?seriesKey(r):targetLevel==='global'?'all':r.person||'all';const old=goals.get(k);if(!old||String(r.date)>=String(old.date))goals.set(k,r);}
  const goalRows=targetMode==='sum'?selected:[...goals.values()];const target=ci('target')<0||!goalRows.every(r=>Number.isFinite(r.values.target))?null:targetMode==='sum'?selected.reduce((n,r)=>n+(r.values.target||0),0):[...goals.values()].reduce((n,r)=>n+(r.values.target||0),0);
  if(target===null)warnings.push('目標がないため、目標達成率・残目標・目標逆算は追加入力まで表示しません。');
  if(stages.some(s=>!Number.isSafeInteger(s.actual)||s.actual>1e8)||target>1e8)issues.push('集計値が1億件を超えます。期間を絞ってください。');
  const dates=selected.map(r=>r.date).filter(Boolean).sort();
  return {issues:[...new Set(issues)].slice(0,25),warnings,records,selectedCount:selected.length,allStages,allTarget:targetMode==='sum'&&records.every(r=>Number.isFinite(r.values.target))?records.reduce((n,r)=>n+r.values.target,0):null,stages,target,dates:dates.length?[dates[0],dates.at(-1)]:[],profile:pf,mode,cumulativeBase,scope,pipeline,duplicates,totals,targetApplicable:!(scope==='all'&&pf.months>1&&targetMode==='latest'),stageKeys:keys};
 }

 function inputShape(rows,c){const map=c.map||[],dateIndex=map.indexOf('date'),dims=['person','product','team','region'].map(k=>map.indexOf(k)),metrics=map.map((k,i)=>/^stage\d+$/.test(k)?i:-1).filter(i=>i>=0),data=[...new Map(rows.slice(c.header+1).filter(r=>r.some(v=>String(v??'').trim())&&!r.some(total)).map(r=>[JSON.stringify(r.map(v=>String(v??'').trim())),r])).values()],groups=new Map(),slots=new Set(),grains=new Set();let duplicateSlot=false,badDate=false;
 for(const r of data){const p=dateIndex>=0?period(r[dateIndex]):null,series=JSON.stringify(dims.map(i=>i<0?'':String(r[i]??'').trim())),slot=series+'|'+(p?.date||'');if(slots.has(slot))duplicateSlot=true;slots.add(slot);if(dateIndex>=0&&!p)badDate=true;if(p)grains.add(p.grain);const key=series+'|'+(p?.date.slice(0,p.grain==='day'?7:4)||'');if(!groups.has(key))groups.set(key,[]);groups.get(key).push({date:p?.date,values:metrics.map(i=>legacy.numeric(r[i]))});}
 let counterLike=false;for(const group of groups.values()){if(group.length<3||!group.every(r=>r.date))continue;group.sort((a,b)=>a.date.localeCompare(b.date));let counters=0;for(let j=0;j<metrics.length;j++){const v=group.map(r=>r.values[j]);if(!v.every(Number.isFinite)||v[0]<=0||v.at(-1)<v[0]*3)continue;const diff=v.slice(1).map((x,i)=>x-v[i]),mean=diff.reduce((a,b)=>a+b,0)/diff.length;if(diff.every(x=>x>0)&&mean>0&&Math.sqrt(diff.reduce((a,b)=>a+(b-mean)**2,0)/diff.length)/mean<.15)counters++;}if(counters>=Math.min(2,metrics.length)&&metrics.length)counterLike=true;}
 return {rows:data.length,dateIndex,duplicateSlot,badDate,grains:[...grains],grain:grains.size===1?[...grains][0]:null,counterLike,dated:dateIndex>=0&&!badDate&&data.length>0};}
 function formatPeriod(start,end,grain){if(!start)return '期間不明';end=end||start;const year=d=>String(d).slice(0,4),month=d=>Number(String(d).slice(5,7));if(grain==='month'){if(start.slice(0,7)===end.slice(0,7))return year(start)+'年'+month(start)+'月';return year(start)+'年'+month(start)+'月〜'+(year(start)===year(end)?'':year(end)+'年')+month(end)+'月';}if(grain==='year')return year(start)+'年'+(year(start)===year(end)?'':'〜'+year(end)+'年');if(grain==='week')return start+(start===end?'の週':'の週〜'+end+'の週');return start+(start===end?'':' 〜 '+end);}
 function resolveSemantics(rows,c){
  if(c.mode==='')return {ready:false,kind:'meaning',reason:'値の意味を選んでください。'};
  if(c.mode==='cumulative'&&c.cumulativeBase==='')return {ready:false,kind:'range',reason:'累計の範囲だけ確認してください。'};
  if(c.mode&&c.mode!=='auto')return {ready:true,mode:c.mode,base:c.cumulativeBase||'period',reason:'選択した値の意味を使用'};
  const headers=rows[c.header]||[],map=c.map||[],metric=headers.filter((h,i)=>/^stage\d+$/.test(map[i]||'')),context=[c.sheetName||'',...rows.slice(0,c.header).flat()].join(' '),signal=[context,...metric].join(' ').normalize('NFKC'),clean=signal.replace(/非累計/g,'期間実績');
  const cumulative=/累計|累積|cumulative/i.test(clean),daily=/日次|日別|当日|期間実績|月別実績|月次実績|週次実績|年次実績|週次(?!累計)|月次(?!累計)|年次(?!累計)|daily|period.actual/i.test(clean);
  if(cumulative&&daily)return {ready:false,kind:'mixed',reason:'期間実績と累計の指定が混在しています。詳細設定で、同じ意味のKPI列だけを選んでください。'};
  if(cumulative){if(/月内累計|当月累計|月間累計|月次累計/.test(clean))return {ready:true,mode:'cumulative',base:'period',reason:'見出しの月内累計を使用'};if(/通算累計|全期間累計|開始以来|running.total/i.test(clean))return {ready:true,mode:'cumulative',base:'continuous',reason:'見出しの通算累計を使用（成長比較は保留）'};return {ready:false,kind:'range',reason:'累計の範囲だけ確認してください。'};}
  if(daily)return {ready:true,mode:'daily',base:'period',reason:'表の期間実績の指定を使用'};
  if(!metric.length&&map.includes('projectId')&&map.includes('caseStage'))return {ready:true,mode:'daily',base:'period',reason:'案件IDごとの最新状態を集計'};
  const shape=inputShape(rows,c);
  if(shape.grains.length>1)return {ready:false,kind:'mixed',reason:'期間粒度が混在しています。対象表を同じ期間単位に分けてください。'};
  if(shape.badDate)return {ready:false,kind:'date',reason:'日付を解釈できない行があります。日付列を確認してください。'};
  if(shape.duplicateSlot)return {ready:false,kind:'meaning',reason:'同じ対象・同じ時点に複数の値があります。加算する明細か、累計の更新値か確認してください。'};
  if(shape.dated){if(shape.counterLike)return {ready:false,kind:'meaning',reason:'累計カウンターに似た大きな連続増加があります。期間実績か累計かだけ確認してください。'};const label={day:'日次',week:'週次',month:'月次',year:'年次'}[shape.grain]||'期間';return {ready:true,mode:'daily',base:'period',provisional:true,confidence:'structural',grain:shape.grain,evidence:['日時・期間列','対象系列ごとに1時点1行','数値KPI列'],reason:label+'実績として暫定集計。各行を合算します。変更は「読込内容を確認（任意）」。'};}
  if(shape.rows)return {ready:true,mode:'daily',base:'period',snapshot:true,reason:'対象系列ごとに1時点の件数を集計'};
  return {ready:false,kind:'meaning',reason:'集計可能なデータ行がありません。'};

 }
 function actionData(rows,header){const patterns={askCount:/打診数|打診有無/,activityTime:/活動時間|架電時間|営業時間/,timeSlots:/時間帯|送信時刻|架電時刻|訪問時刻/,rejectionReasons:/断り理由|未打診理由/,talkVariant:/トーク案|トーク種別/,messageVariant:/文面案|文面種別/,subjectVariant:/件名案/,customerAttributes:/顧客属性|業種|顧客規模/,contactHistory:/接触履歴|前回接触/,contactId:/顧客ID|連絡先ID/,retryCount:/再架電数|接触回数/,consent:/連絡可否|再接触許可|配信可否/,visitOutcome:/訪問結果|不在理由/,visitHistory:/再訪履歴|訪問回数/,travelTime:/移動時間/,location:/訪問先住所|所在地/,appointmentStatus:/アポ状況|未移行理由/,cancelReason:/キャンセル理由|延期理由/,proposalOutcome:/提案結果|失注理由/,heldMeetings:/実施商談数|商談実施数/,openCounts:/開封数/,qualifiedReplies:/有効返信数/,decisionContacts:/決裁者接触数/};return Object.fromEntries(Object.entries(patterns).map(([key,pattern])=>[key,(rows[header]||[]).some((h,i)=>pattern.test(String(h))&&rows.slice(header+1).some(r=>String(r[i]??'').trim()!==''))]));}
 function interpretAdaptive(rows,c){const semantics=resolveSemantics(rows,c),shape=inputShape(rows,c),targetHeader=String((rows[c.header]||[])[(c.map||[]).indexOf('target')]||''),explicitDaily=/日次目標|日別目標|当日目標|目標.*日次/.test(targetHeader),periodConflict=shape.grain==='day'&&/月間|月次|年間|年次|チーム全体/.test(targetHeader),rowGoal=c.intake&&shape.dated&&!shape.duplicateSlot&&!periodConflict&&(c.map||[]).includes('target'),targetMode=c.targetConfirmed?c.targetMode:explicitDaily?'sum':rowGoal?'sum':null,targetProvisional=!c.targetConfirmed&&!explicitDaily&&rowGoal,config={...c,mode:semantics.mode||'daily',cumulativeBase:semantics.base||c.cumulativeBase||'period',targetMode:targetMode||c.targetMode};const r=interpret(rows,config);
 if(c.intake&&!c.targetConfirmed&&!targetMode&&r.target!==null&&r.selectedCount>1){r.targetApplicable=false;r.warnings.push('目標単位が未確定のため目標分析は保留。任意設定で変更できます。');}
 if(semantics.provisional)r.warnings.push(semantics.reason);if(targetProvisional&&r.target!==null)r.warnings.push('目標も各行の値を暫定合算。期間目標の繰返しなら任意設定で「最新値」へ変更してください。');if(!semantics.ready)r.issues=[semantics.reason,...r.issues];return {...r,actionData:actionData(rows,c.header),semantics,targetProvisional,targetMode:config.targetMode,targetResolution:targetMode?(targetProvisional?'各行の目標を暫定合算':'各行の目標を合算'):null,needsConfirmation:!semantics.ready};}


 const api={...legacy,infer,headerIndex,interpret:interpretAdaptive,resolveSemantics,inputShape,formatPeriod,period,profile,aggregate,seriesKey};root.ForecastImportCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
