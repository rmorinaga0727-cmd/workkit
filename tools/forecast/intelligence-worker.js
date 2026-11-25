'use strict';
importScripts('./engine.js','./import-core.js','./adaptive-import.js','./diagnosis.js','./action-templates.js','./goal-analysis.js','./action-planner.js','./intelligence-core.js');
let current=null;
self.onmessage=({data:q})=>{
 try{
  if(q.kind==='analyze'){if(q.dataset?.packedRecords&&!q.dataset.records)q.dataset.records=JSON.parse(q.dataset.packedRecords);current=q;const result=ForecastIntelligence.build(q.d,q.dataset,q.role,q.asOf,phase=>self.postMessage({id:q.id,phase}));self.postMessage({id:q.id,kind:'report',result});}
  else if(q.kind==='compare'&&current){
   const {dataset,asOf}=current,pack=ForecastIntelligence.buckets(dataset,q.unit,asOf,q.filters),metric=q.options?.metric||dataset.stageKeys.at(-1),isRate=metric.startsWith('rate:');
   const remap=p=>!p?null:{...p,value:isRate?p.rates[Number(metric.slice(5))]:(p.values[metric]??null),target:isRate||metric!==dataset.stageKeys.at(-1)?null:p.target};pack.items=pack.items.map(remap);
   let error=pack.error;
   if(q.custom&&ForecastIntelligence.grainRank(dataset.profile.grain)>=2){const unit=dataset.profile.grain;for(const [from,to]of [[q.fromA,q.toA],[q.fromB,q.toB]]){if(!ForecastImportCore.date(from)||!ForecastImportCore.date(to)||ForecastIntelligence.bounds(from,unit).start!==from||ForecastIntelligence.bounds(to,unit).end!==to)error='月次・年次データは期間の一部へ分解できません。元データ単位の開始・終了日を指定してください。';}}
   const a=q.custom?remap(ForecastIntelligence.rangeBucket(dataset,q.fromA,q.toA,asOf,q.filters)):pack.items.find(p=>p.key===q.a),b=q.custom?remap(ForecastIntelligence.rangeBucket(dataset,q.fromB,q.toB,asOf,q.filters)):pack.items.find(p=>p.key===q.b);
   self.postMessage({id:q.id,kind:'comparison',result:{...pack,error,items:pack.items.slice(-120),count:pack.items.length,a,b,comparison:error?{status:'unavailable',reason:error}:ForecastIntelligence.compare(a,b,{...q.options,isRate})}});
  }
  else if(q.kind==='segments'&&current){const rows=ForecastIntelligence.segments(current.dataset,q.dimension,current.asOf);self.postMessage({id:q.id,kind:'segments',result:rows.slice(0,200),totalCount:rows.length});}
 }catch(e){self.postMessage({id:q.id,error:String(e.message).slice(0,1200)});}
};
