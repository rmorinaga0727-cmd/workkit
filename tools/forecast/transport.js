/* Called inside Workers: large datasets cross the main thread as flat text. */
self.packForecastResult=function(result){
 const records=result.records||[];result.dimensionValues={};
 for(const key of ['person','product','team','region']){const values=new Set();for(const r of records){if(r[key]&&values.size<200)values.add(r[key]);}result.dimensionValues[key]=[...values].sort();}
 if(records.length>1000){result.packedRecords=JSON.stringify(records);result.recordCount=records.length;delete result.records;}
 return result;
};
