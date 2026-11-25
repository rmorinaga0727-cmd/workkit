/* File -> preview -> explicit confirmation -> atomic replacement. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),core=ForecastImportCore,api=WorkKitForecast;
  let currentFile='',preparedRevision=-1,revealReview=false,targetConfirmed=false;
  let sheets=[],map=[],result=null,worker=null,aggregation=null,revision=0,task=null,token=0,fingerprint='',undo=null,applied=new Set(),pdfWarning=false,headerLoading=false;
  const roles=[['','使用しない'],['date','日付'],['person','担当者'],['target','最終目標'],['product','商材・サービス'],['team','部署・チーム'],['region','地域'],['workdays','営業日数'],['staff','人数'],['projectId','案件ID'],['caseStage','案件ステージ'],['openedDate','商談日・案件開始日'],['closedDate','契約日'],['stageDate','ステージ更新日'],['dueDate','契約予定日'],['probability','成約確率 %'],['lossReason','失注理由'],['stage0','工程 1'],['stage1','工程 2'],['stage2','工程 3'],['stage3','工程 4'],['stage4','工程 5'],['stage5','工程 6'],...Array.from({length:6},(_,i)=>['stage'+(i+6),(i+7)+' · 追加ステージ'])];
  const text=(id,s)=>$(id).textContent=s;
  const el=(tag,s)=>{const e=document.createElement(tag);if(s!==undefined)e.textContent=s;return e;};
  function log(s){text('importStatus',s);const li=el('li',s);$('importEvents').append(li);while($('importEvents').children.length>8)$('importEvents').firstChild.remove();ForecastMotion.enter([li]);}
  function stop(){headerLoading=false;token++;revision++;worker?.terminate();worker=null;aggregation?.terminate();aggregation=null;task?.destroy();task=null;$('cancelImport').hidden=true;$('dropZone').classList.remove('processing','drag-over');$('dropZone').removeAttribute('aria-busy');}
  function failure(s){stop();text('importStatus',s);$('importReview').hidden=true;result=null;}
  async function pdfSheets(buffer,id){
    const pdfjs=await import('./vendor/pdf.mjs');if(id!==token)return [];
    pdfjs.GlobalWorkerOptions.workerSrc='./vendor/pdf.worker.mjs';
    task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,useSystemFonts:true});
    const doc=await task.promise;const pages=[];
    if(doc.numPages>50)throw new Error('PDFは50ページ以内に分割してください。');
    for(let n=1;n<=doc.numPages;n++){
      if(id!==token)return [];
      const page=await doc.getPage(n),content=await page.getTextContent();const groups=[];
      for(const item of content.items){if(!item.str?.trim())continue;const y=item.transform[5];let row=groups.find(r=>Math.abs(r.y-y)<3);if(!row){row={y,items:[]};groups.push(row);}row.items.push({x:item.transform[4],s:item.str});}
      groups.sort((a,b)=>b.y-a.y);
      const rows=groups.map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.s.trim()));
      if(rows.length)pages.push({name:'PDF '+n+'ページ',rows});
      log('PDF '+n+' / '+doc.numPages+'ページの文字抽出完了');page.cleanup();
    }
    await doc.destroy();task=null;
    if(!pages.length)throw new Error('文字を抽出できません。スキャンPDF・画像のOCRには対応していません。CSVまたはExcelを指定してください。');
    return pages;
  }
  async function read(file){
    stop();const id=token;sheets=[];result=null;map=[];undo=null;currentFile=file?.name||'';preparedRevision=-1;revealReview=true;$('fileDetails').open=false;$('analyzeFile').disabled=true;$('importReview').hidden=true;$('importEvents').replaceChildren();$('importFile').value='';
    if(!file)return;targetConfirmed=false;for(const id of ['importPerson','importProduct','importRegion','importFrom','importTo','sourceGrain'])$(id).value='';$('importScope').value='latest';$('targetLevel').value='person';$('targetMode').value='latest';
    if(!/\.(csv|tsv|txt|xlsx|xls|pdf)$/i.test(file.name)){failure('対応形式はCSV・TSV・Excel・文字PDFです。');return;}
    if(!file.size||file.size>15*1024*1024){failure('空のファイル、または15 MBを超えるファイルは読み込めません。');return;}
    $('dropZone').classList.add('processing');$('dropZone').setAttribute('aria-busy','true');$('cancelImport').hidden=false;if(!ForecastMotion.reduced())$('dropZone').animate([{transform:'scale(1.012)'},{transform:'scale(.985)',offset:.35},{transform:'scale(1)'}],{duration:520,easing:'cubic-bezier(.16,1,.3,1)'});log('「'+file.name+'」を読み込んでいます。');
    try{
      const buffer=await file.arrayBuffer();if(id!==token)return;
      fingerprint=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');if(id!==token)return;
      pdfWarning=/\.pdf$/i.test(file.name);
      if(pdfWarning){if(new TextDecoder().decode(buffer.slice(0,5))!=='%PDF-')throw new Error('PDFの構造を確認できません。');sheets=await pdfSheets(buffer,id);}
      else sheets=await new Promise((resolve,reject)=>{
        worker=new Worker('./import-worker.js');worker.onmessage=e=>{if(id!==token)return;if(e.data.error)reject(new Error(e.data.error));else if(e.data.sheets)resolve(e.data.sheets);else if(e.data.phase)log(e.data.phase);};worker.onerror=()=>reject(new Error('解析Workerを起動できません。HTTPでページを開き、ライブラリの配置を確認してください。'));worker.postMessage({buffer,name:file.name},[buffer]);
      });
      if(id!==token)return;$('cancelImport').hidden=true;$('dropZone').classList.remove('processing');$('dropZone').removeAttribute('aria-busy');
      $('importSheet').replaceChildren(...sheets.map((s,i)=>{const o=el('option',s.name+' · '+(s.rowCount||s.rows.length)+'行');o.value=i;return o;}));
      $('aggregateMode').value='auto';$('semanticsChoice').value='';$('cumulativeBase').value='';$('importFrom').value='';$('importTo').value='';$('importReview').hidden=false;
      const ranked=sheets.map((sheet,i)=>({i,score:core.infer(sheet.rows[core.headerIndex(sheet.rows)]||[]).filter(k=>/^stage/.test(k)||k==='projectId').length})).sort((a,b)=>b.score-a.score);$('importSheet').value=ranked[0]?.i||0;log('ファイルを読み込みました。');selectSheet();
    }catch(e){if(id===token)failure('取り込みを中断しました。'+String(e.message).slice(0,250));}
  }
  function rows(){return sheets[Number($('importSheet').value)]?.rows||[];}
  function config(){return {intake:true,targetConfirmed,header:Number($('headerRow').value)-1,map,mode:$('aggregateMode').value,sheetName:sheets[Number($('importSheet').value)]?.name||'',targetMode:$('targetMode').value,person:$('importPerson').value,product:$('importProduct').value.trim(),region:$('importRegion').value.trim(),scope:$('importScope').value,cumulativeBase:$('cumulativeBase').value,targetLevel:$('targetLevel').value,grain:$('sourceGrain').value,from:$('importFrom').value,to:$('importTo').value};}
  function selectSheet(){targetConfirmed=false;$('aggregateMode').value='auto';$('semanticsChoice').value='';$('cumulativeBase').value='';const rs=rows();$('headerRow').value=core.headerIndex(rs)+1;mapHeaders();}
  function mapHeaders(){
    const rs=rows(),index=Number($('headerRow').value)-1;if(worker&&!rs[index]&&index>=31&&index<(sheets[Number($('importSheet').value)]?.rowCount||0)){headerLoading=true;const current=++revision;worker.onmessage=({data})=>{if(data.revision!==current)return;if(data.kind==='header'){data.rows.forEach((r,i)=>rs[index+i]=r);headerLoading=false;mapHeaders();}};worker.postMessage({kind:'header',revision:current,sheet:Number($('importSheet').value),header:index});return;}headerLoading=false;const headers=rs[index]||[];map=core.infer(headers);$('columnMapping').replaceChildren();
    headers.forEach((h,i)=>{const label=el('label');label.className='mapping-item';label.append(el('span',(i+1)+'. '+String(h||'名称なし').slice(0,80)));const select=el('select');select.setAttribute('aria-label','列'+(i+1)+'「'+String(h)+'」の対応');roles.forEach(([value,label])=>{const o=el('option',label);o.value=value;select.append(o);});select.value=map[i];select.addEventListener('change',()=>{map[i]=select.value;updatePeople();preview();});label.append(select);if(map[i])label.classList.add('recognized');$('columnMapping').append(label);});
    updatePeople();preview();ForecastMotion.enter([...$('columnMapping').children]);
  }
  function updatePeople(){const old=$('importPerson').value,idx=map.indexOf('person');const people=idx<0?[]:[...new Set(rows().slice(Number($('headerRow').value)).filter(r=>!r.some(v=>/^(合計|小計|total)$/i.test(String(v)))).map(r=>String(r[idx]??'').trim()).filter(Boolean))].sort();$('importPeople').replaceChildren();people.slice(0,200).forEach(p=>{const o=el('option',p);o.value=p;$('importPeople').append(o);});$('importPerson').value=idx>=0?old:'';}
  function preview(){
    if(headerLoading){$('analyzeFile').disabled=true;text('importSummary','指定した見出し行を読み込んでいます。');return;}
    result=null;$('analyzeFile').disabled=true;
    aggregation?.terminate();const current=++revision;
    const preview=$('importPreview');preview.replaceChildren();const rs=rows(),head=Number($('headerRow').value)-1;
    rs.slice(head,head+9).forEach((r,i)=>{const tr=el('tr');r.forEach(v=>tr.append(el(i===0?'th':'td',String(v).slice(0,120))));preview.append(tr);});
    text('importSummary','一時データを整理しています。');
    const receive=data=>{if(current!==revision||data.revision!==undefined&&data.revision!==current)return;if(data.error){text('importErrors',data.error);$('importErrors').hidden=false;return;}result=data.result;renderPreview(head);};
    if(worker){worker.onmessage=({data})=>receive(data);worker.postMessage({kind:'interpret',revision:current,sheet:Number($('importSheet').value),config:config()});}
    else{aggregation=new Worker('./interpret-worker.js');aggregation.onmessage=({data})=>{aggregation?.terminate();aggregation=null;receive(data);};aggregation.onerror=()=>{if(current!==revision)return;text('importErrors','集計Workerを起動できません。');$('importErrors').hidden=false;};aggregation.postMessage({rows:rs,config:config()});}
  }

  function renderPreview(head){
    const pf=result.profile||{},sem=result.semantics||{},issues=[...(result.issues||[])];
    text('fileName',currentFile);text('fileFacts',core.formatPeriod(pf.start,pf.end,pf.grain)+' / '+(pf.count||0).toLocaleString()+'行 / '+(sheets[Number($('importSheet').value)]?.name||''));
    text('fileKpis','全期間のKPI合計：'+(result.allStages||result.stages||[]).slice(0,12).map(s=>s.name+(sem.ready?' '+s.actual.toLocaleString()+'件':'')).join(' · '));
    text('fileBasis',sem.ready?sem.reason+(result.targetProvisional?' / 目標も行ごとに暫定合算。':'')+(result.selectedCount<(pf.count||0)?' / 分析対象は最新期間の'+result.selectedCount+'行、全期間は比較に使用':''):'');text('importSummary',sem.ready?'集計内容：'+(result.stages||[]).map(s=>s.name+' '+s.actual+'件').join(' / '):'値の意味を確認するまで分析しません。');
    const simple=result.needsConfirmation&&sem.kind!=='mixed';$('semanticsPrompt').hidden=!simple;text('semanticsQuestion',sem.reason||'');
    const blocking=simple?issues.filter(i=>i!==sem.reason):issues;$('importErrors').hidden=!blocking.length;text('importErrors',blocking.join('\n'));
    $('importWarnings').replaceChildren(...(result.warnings||[]).map(w=>el('li',w)));
    if(pdfWarning)$('importWarnings').prepend(el('li','PDFは文字位置から表を認識しています。詳細で抽出した列と数値を確認できます。'));
    text('detectedProfile','認識した列・数値と、対象シート／ページの設定です。');$('analyzeFile').disabled=issues.length>0||!sem.ready;
    if(blocking.length&&!simple)$('fileDetails').open=true;
    text('importStatus',issues.length?'データを読み込みました。要確認項目があります。':'データを読み込みました。「分析する」を押してください。');
    if(revealReview){revealReview=false;$('importReview').scrollIntoView({behavior:ForecastMotion.reduced()?'instant':'smooth',block:'start'});}ForecastMotion.enter([$('fileName'),$('fileFacts'),$('fileKpis')],{distance:10,duration:450});
  }
  function prepare(){
    if(!result||result.issues.length||!result.semantics?.ready){text('importStatus','表示された解釈・列の項目を確認してください。');return false;}
    if(preparedRevision===revision&&api.getDataset()?.fingerprint===fingerprint&&api.signature(api.getInput())===api.getDataset()?.snapshot)return true;
    const next={...api.getInput(),target:result.target??0,targetKnown:result.target!==null&&result.targetApplicable!==false,achieved:result.stages.at(-1).actual,elapsed:null,remaining:null,members:null,daysConfirmed:false,period:'',periodStart:'',periodEnd:'',stages:result.stages.map(s=>({name:s.name,actual:s.actual,rate:null}))};
    if(result.dates.length){const b=ForecastIntelligence.bounds(result.dates.at(-1),['year','week'].includes(result.profile.grain)?result.profile.grain:'month');next.periodStart=result.scope==='latest'?b.start:result.dates[0];next.periodEnd=result.scope==='latest'?b.end:result.dates.at(-1);next.period=core.formatPeriod(result.dates[0],result.dates.at(-1),result.profile.grain);}
    const errors=api.validate(next);if(errors.length){text('importErrors',errors.join('\n'));$('importErrors').hidden=false;return false;}
    api.setData(next);const active={actionData:result.actionData,records:result.records,packedRecords:result.packedRecords,recordCount:result.recordCount,dimensionValues:result.dimensionValues,stageKeys:result.stageKeys,recognition:{fileName:currentFile,fileSha256:fingerprint,rows:result.profile.count,periodLabel:core.formatPeriod(result.profile.start,result.profile.end,result.profile.grain),grain:result.profile.grain,provisional:!!result.semantics.provisional||!!result.targetProvisional,aggregationNote:result.semantics.reason,sourceRows:result.profile.sourceRows,start:result.profile.start,end:result.profile.end,allStages:result.allStages,allTarget:result.allTarget,targetResolution:result.targetResolution},stageNames:result.stages.map(s=>s.name),profile:result.profile,mode:result.mode,cumulativeBase:result.cumulativeBase,scope:result.scope,targetLevel:config().targetLevel,targetMode:result.targetMode||config().targetMode,targetApplicable:result.targetApplicable,source:'file',warnings:result.warnings,snapshot:api.signature(api.getInput()),input:api.getInput(),fingerprint,semantics:result.semantics};api.setDataset(active);preparedRevision=revision;return true;
  }
  $('analyzeFile').onclick=()=>api.analyze();
  $('semanticsChoice').onchange=()=>{const value=$('semanticsChoice').value;$('aggregateMode').value=value==='daily'?'daily':value?'cumulative':'auto';$('cumulativeBase').value=value==='continuous'?'continuous':'period';preview();};
  $('importSheet').addEventListener('change',selectSheet);$('headerRow').addEventListener('change',mapHeaders);
  for(const id of ['aggregateMode','targetMode','importPerson','importFrom','importTo','importScope','cumulativeBase','targetLevel','importProduct','importRegion','sourceGrain'])$(id).addEventListener('change',()=>{if(['targetMode','targetLevel'].includes(id))targetConfirmed=true;preview();});
  $('importFile').addEventListener('change',e=>read(e.target.files[0]));$('cancelImport').onclick=()=>{stop();result=null;$('analyzeFile').disabled=true;log('読み込みを中止しました。保存済みデータは変更していません。');};
  const zone=$('dropZone');let dragDepth=0;zone.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;zone.classList.add('drag-over');});zone.addEventListener('dragover',e=>e.preventDefault());zone.addEventListener('dragleave',e=>{e.preventDefault();if(--dragDepth<=0)zone.classList.remove('drag-over');});zone.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;zone.classList.remove('drag-over');if(e.dataTransfer.files.length!==1){failure('1ファイルずつ指定してください。');return;}read(e.dataTransfer.files[0]);});
  window.ForecastImport={prepare};window.addEventListener('pagehide',stop);
  document.addEventListener('forecast:reset',()=>{stop();sheets=[];result=null;preparedRevision=-1;$('importReview').hidden=true;$('importEvents').replaceChildren();text('importStatus','ファイルはまだ読み込まれていません。');});
})();
