/* Original V2 mathematical engine, extracted without changing its formulas. */
(function(root){'use strict';const MAX_STAGE=12;
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

const legacyValidate=validate,legacyCalculate=calculate;
function validateV3(d){const copy={...d,stages:d.stages.map(s=>({...s,rate:s.rate==null?100:s.rate}))};for(const [key,fallback]of [['target',0],['elapsed',0],['remaining',0],['members',1]])if(copy[key]==null)copy[key]=fallback;const errors=legacyValidate(copy);return d.stages.length===1?errors.filter(e=>e!=='ファネルは2〜12ステージで設定してください。'):errors;}
function calculateV3(d){const goal=d.targetKnown!==false&&Number.isSafeInteger(d.target),plans=d.stages.slice(0,-1).every(s=>Number.isFinite(s.rate)&&s.rate>0&&s.rate<=100),context=['elapsed','remaining','members'].every(k=>Number.isSafeInteger(d[k]));if(goal&&plans&&context)return legacyCalculate(d);
 const gap=goal?Math.max(0,d.target-d.achieved):null,total=Number.isSafeInteger(d.elapsed)&&Number.isSafeInteger(d.remaining)?d.elapsed+d.remaining:null,projected=total!==null&&d.elapsed>0?d.achieved/d.elapsed*total:null,attainment=goal?(d.target>0?100*d.achieved/d.target:100):null,required=goal&&plans?reverse(gap,d.stages):null;
 const daily=Number.isSafeInteger(d.remaining)&&d.remaining>0,people=Number.isSafeInteger(d.members)&&d.members>0;
 const rows=d.stages.map((s,i)=>({name:s.name,actual:s.actual,required:required?.[i]??null,teamDaily:required&&daily?Math.ceil(required[i]/d.remaining):null,personDaily:required&&daily&&people?Math.ceil(required[i]/d.remaining/d.members):null,actualRate:i<d.stages.length-1&&s.actual>0?d.stages[i+1].actual/s.actual*100:null,planRate:s.rate??null}));
 const warnings=[];for(let i=0;i<rows.length-1;i++)if(rows[i+1].actual>rows[i].actual)warnings.push('「'+rows[i].name+' → '+rows[i+1].name+'」の実績が増えています。異なる期間の案件や定義を確認してください。');
 let best=null;if(required)for(let i=0;i<d.stages.length-1;i++){const improved=reverse(gap,d.stages,i,5);if(improved&&(!best||required[0]-improved[0]>best.save))best={index:i,save:required[0]-improved[0],improved:improved[0]};}
 return {d,gap,total,attainment,projected,needed:goal&&daily&&people?gap/d.remaining/d.members:null,required,rows,warnings,best};}
const api={validate:validateV3,legacyValidate,calculate:calculateV3,legacyCalculate,reverse};root.ForecastEngine=api;if(typeof module!=='undefined')module.exports=api;})(typeof self!=='undefined'?self:globalThis);
