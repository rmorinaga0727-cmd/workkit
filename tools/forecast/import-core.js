/* Pure import interpretation. No network, storage or DOM access. */
(function(root){
  'use strict';
  const aliases={date:['日付','年月日','実績日','date','day'],person:['担当者','担当','社員名','氏名','person','owner','member'],target:['目標','契約目標','成約目標','最終目標','target','goal'],stage0:['架電','架電数','発信数','calls'],stage1:['接続','接続数','connects'],stage2:['有効会話','有効会話数'],stage3:['アポイント','アポ','アポ数','アポイント数','appointments'],stage4:['商談','商談数','meetings'],stage5:['契約','契約数','成約','成約数','受注','受注数','実績','actual','won']};
  const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[\s_（）()\[\]【】]/g,'').replace(/^(日次|累計|累積|当日)/,'').replace(/(件数|数|件)$/,'');
  const total=v=>/^(総?合計|小計|総計|total|subtotal)$/i.test(String(v??'').trim());
  function numeric(v){if(typeof v==='number')return Number.isSafeInteger(v)&&v>=0?v:null;const s=String(v??'').normalize('NFKC').trim().replace(/,/g,'').replace(/件$/,'');if(!/^\d+(?:\.0+)?$/.test(s))return null;const n=Number(s);return Number.isSafeInteger(n)&&n<=100000000?n:null;}
  function date(v){const s=String(v??'').trim();const m=s.match(/^(\d{4})[年/.-](\d{1,2})[月/.-](\d{1,2})(?:日|(?:[T ].*)?)$/);if(!m)return null;const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return d.getUTCFullYear()===+m[1]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[3]?d.toISOString().slice(0,10):null;}
  function infer(headers){const used=new Set();return headers.map(h=>{const n=norm(h);const matches=Object.entries(aliases).filter(([,xs])=>xs.some(x=>norm(x)===n));const role=matches.length===1?matches[0][0]:'';if(!role||used.has(role))return '';used.add(role);return role;});}
  function headerIndex(rows){let best=0,score=-1;rows.slice(0,30).forEach((r,i)=>{const s=infer(r).filter(Boolean).length;if(s>score){score=s;best=i;}});return best;}
  function interpret(rows,config){
    const {header,map,mode,targetMode='latest',person='',from='',to=''}=config;
    const issues=[],warnings=[],data=[],seen=new Set();let duplicates=0,totals=0,missing=0;
    if(!Number.isInteger(header)||header<0||header>=rows.length)return {issues:['見出し行を指定してください。'],warnings:[],records:[]};
    const roles=map.filter(Boolean);if(new Set(roles).size!==roles.length)issues.push('同じ指標へ複数の列を割り当てられません。');
    const stageKeys=roles.filter(x=>/^stage\d+$/.test(x)).sort((a,b)=>+a.slice(5)-+b.slice(5));
    if(stageKeys.length<2)issues.push('2つ以上の営業KPI列を対応付けてください。');
    if(!['daily','cumulative'].includes(mode))issues.push('日次値か累計値か、集計方法を選択してください。');
    if(mode==='cumulative'&&!roles.includes('date'))issues.push('累計値には日付列が必要です。同じ担当者の最新日を採用します。');
    if((from&&!date(from))||(to&&!date(to))||(from&&to&&from>to))issues.push('集計期間を正しく指定してください。');
    const ci=role=>map.indexOf(role);
    rows.slice(header+1).forEach((r,offset)=>{
      if(r.every(v=>String(v??'').trim()===''))return;
      if(r.some(total)){totals++;return;}
      const rec={row:header+offset+2,person:ci('person')<0?'':String(r[ci('person')]??'').trim(),date:ci('date')<0?null:date(r[ci('date')]),values:{}};
      if(person&&rec.person!==person)return;
      if(ci('date')>=0&&!rec.date){missing++;return;}
      if(rec.date&&((from&&rec.date<from)||(to&&rec.date>to)))return;
      for(const role of [...stageKeys,...(ci('target')>=0?['target']:[])]){rec.values[role]=numeric(r[ci(role)]);if(rec.values[role]===null)issues.push(rec.row+'行目「'+String(rows[header][ci(role)])+'」は0以上の整数が必要です。');}
      const signature=JSON.stringify([rec.date,rec.person,rec.values]);if(seen.has(signature)){duplicates++;return;}seen.add(signature);data.push(rec);
    });
    if(missing)issues.push('日付を解釈できない行が'+missing+'行あります。列対応または元ファイルを修正してください。');
    if(!data.length)issues.push('反映可能なデータ行がありません。');
    if(totals)warnings.push('合計・小計行 '+totals+'行を除外しました。');
    if(duplicates)warnings.push('完全一致データ '+duplicates+'行を重複候補として除外しました。明細単位の表の場合は事前に日次集計してください。');
    if(ci('person')<0)warnings.push('担当者列がありません。全行を1つの集計単位として扱います。');
    if(ci('date')<0)warnings.push('日付列がありません。期間は判定できず、時系列表示は利用できません。');
    if(!roles.includes('target'))warnings.push('目標列がありません。現在の目標を保持します。');
    const groups=new Map(),personDays=new Set();for(const rec of data){const pd=JSON.stringify([rec.person,rec.date]);if(mode==='cumulative'&&personDays.has(pd))issues.push('累計値の同一担当者・同一日が複数あります（'+rec.row+'行）。集計済みの表を指定してください。');personDays.add(pd);const prev=groups.get(rec.person);if(!prev||String(rec.date)>=String(prev.date))groups.set(rec.person,rec);}
    if(mode==='daily'&&ci('date')>=0&&personDays.size<data.length)warnings.push('同一担当者・同一日のデータが複数行あります。日次値の二重集計や累計値の混在がないか確認してください。');
    const selected=mode==='cumulative'?[...groups.values()]:data;
    const sum=key=>selected.reduce((n,r)=>n+(r.values[key]??0),0);
    const stageValues=stageKeys.map(k=>({key:k,name:String(rows[header][ci(k)]||k).slice(0,40),actual:sum(k)}));
    const target=ci('target')<0?null:targetMode==='sum'?sum('target'):[...groups.values()].reduce((n,r)=>n+(r.values.target??0),0);
    if(stageValues.some(s=>!Number.isSafeInteger(s.actual)||s.actual>100000000)||target>100000000)issues.push('集計結果が入力上限1億件を超えています。期間を絞ってください。');
    const dated=data.filter(r=>r.date).sort((a,b)=>a.date.localeCompare(b.date));
    const timeline=new Map();const last=stageKeys.at(-1);for(const rec of dated){const key=rec.date;timeline.set(key,(timeline.get(key)||0)+(rec.values[last]??0));}
    // For cumulative records carry each person's latest observation forward to each date.
    if(mode==='cumulative'){const carried=new Map();let sum=0;for(const r of dated){sum-=carried.get(r.person)||0;carried.set(r.person,r.values[last]??0);sum+=r.values[last]??0;timeline.set(r.date,sum);}}
    return {issues:[...new Set(issues)].slice(0,25),warnings,records:data,selectedCount:selected.length,stages:stageValues,target,dates:dated.length?[dated[0].date,dated.at(-1).date]:[],people:[...new Set(data.map(r=>r.person).filter(Boolean))],timeline:[...timeline].map(([date,value])=>({date,value})),mode,duplicates,totals};
  }
  const api={infer,headerIndex,interpret,numeric,date};root.ForecastImportCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
