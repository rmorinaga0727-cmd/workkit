'use strict';
importScripts('./import-core.js');
importScripts('./adaptive-import.js');
importScripts('./transport.js');
self.onmessage=({data:{rows,config}})=>{
  try{const result=packForecastResult(ForecastImportCore.interpret(rows,config));self.postMessage({result});}
  catch(e){self.postMessage({error:'集計できません。'+String(e.message).slice(0,180)});}
};
