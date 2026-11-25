'use strict';
importScripts('./vendor/xlsx.full.min.js','./import-core.js','./adaptive-import.js','./transport.js');
const MAX_ROWS=50000,MAX_COLS=120;
let cached=[];
self.onmessage=async({data:q})=>{
  try{
    if(q.kind==='header'){self.postMessage({kind:'header',revision:q.revision,header:q.header,rows:cached[q.sheet]?.rows.slice(q.header,q.header+9)||[]});return;}
    if(q.kind==='interpret'){const result=packForecastResult(ForecastImportCore.interpret(cached[q.sheet]?.rows||[],q.config));self.postMessage({revision:q.revision,result});return;}
    const {buffer,name}=q;
    const bytes=new Uint8Array(buffer);let workbook;
    self.postMessage({phase:'読み込み済み。表構造を解析しています。'});
    if(/\.(csv|tsv|txt)$/i.test(name)){
      let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('shift-jis',{fatal:true}).decode(bytes);}
      workbook=XLSX.read(text,{type:'string',raw:true});
    }else{
      if(bytes[0]!==0x50&&!(bytes[0]===0xd0&&bytes[1]===0xcf))throw new Error('Excelのファイル構造を確認できません。');
      workbook=XLSX.read(bytes,{type:'array',cellDates:false,cellNF:true,sheetRows:MAX_ROWS+2});
    }
    const sheets=[];
    if(workbook.SheetNames.length>50)throw new Error('シートは50枚まで対応しています。必要なシートだけのファイルを指定してください。');
    for(const name of workbook.SheetNames){
      const sheet=workbook.Sheets[name];const full=sheet['!fullref']||sheet['!ref'];if(!full)continue;
      const range=XLSX.utils.decode_range(full);if(range.e.r>=MAX_ROWS||range.e.c>=MAX_COLS)throw new Error('表は50,000行未満・120列以内に分割してください。省略しての反映は行いません。');
      // Decode Excel calendar dates directly from serial numbers. JS Date would
      // shift midnight to the preceding day in timezones such as Asia/Tokyo.
      for(const address of Object.keys(sheet)){
        const cell=sheet[address];if(address.startsWith('!')||cell.t!=='n')continue;
        if(!XLSX.SSF.is_date(cell.z||'')){if(/%/.test(cell.z||'')&&Number.isFinite(cell.v)){cell.t='s';cell.v=String(cell.v*100)+'%';cell.z='@';delete cell.w;}continue;}
        const format=(cell.z||'').toLowerCase().replace(/\[[^\]]*\]|"[^"]*"/g,'');
        const d=XLSX.SSF.parse_date_code(cell.v,{date1904:!!workbook.Workbook?.WBProps?.date1904});
        if(d){cell.t='s';const y=String(d.y).padStart(4,'0'),m=String(d.m).padStart(2,'0'),day=String(d.d).padStart(2,'0');cell.v=/d/.test(format)?y+'-'+m+'-'+day:/y/.test(format)?(/m/.test(format)?y+'-'+m:y):'時刻のみ（年月日なし）';cell.z='@';delete cell.w;}
      }
      const rows=XLSX.utils.sheet_to_json(sheet,{header:1,range:0,defval:'',raw:true,blankrows:true}).map(r=>r.map(v=>v instanceof Date?v.toISOString().slice(0,10):v));
      if(rows.length)sheets.push({name,rows});
      self.postMessage({phase:'シート「'+name+'」を認識しました。',recognized:sheets.length});
    }
    if(!sheets.length)throw new Error('読み込める表がありません。');
    cached=sheets;self.postMessage({sheets:sheets.map(s=>({name:s.name,rowCount:s.rows.length,rows:s.rows.slice(0,31)}))});
  }catch(e){self.postMessage({revision:q.revision,error:'ファイルを解析できません。'+String(e.message).slice(0,180)});}
};
