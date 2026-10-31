/* Adapter only: no sales text is authored here. Every spoken line comes from W001 v0.7. */
(function(root){'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
function generate(input,P,V,E){const out=E.generate(input,P,V);if(out.issues.length)throw Error('原稿の安全性チェックにより表示を停止しました。'+out.issues.join(' / '));return out;}
const get=(out,state)=>out.patterns.find(p=>p.pattern_id===state.patternId);
const equal=(a,b)=>a.speaker===b.speaker&&a.text===b.text;
function material(p,turn,out){return ['first','proposal','closing'].includes(out.scene)&&((turn.stage==='resolve')||/比較|並べ|資料|見積|手順書|プラン|対応エリア|サポート/.test(turn.direction||'')||/お見せ|並べると|ご覧|資料で|この比較|この部分は/.test(turn.text));}
function start(out,pid,documentsReady=false){if(!out.patterns.some(p=>p.pattern_id===pid))throw Error('未対応の返し方です。');const p=out.patterns.find(p=>p.pattern_id===pid);return {patternId:pid,turns:[],openingStep:0,documentsReady:!!documentsReady,openingReady:!material(p,p.script[1],out)||!!documentsReady,pending:null,ended:!!p.ends,stop:out.objection==='stop',landing:p.ends?'会話終了（想定例）':'',pathId:null,safety:null,actions:[]};}
function paths(out,state){const p=get(out,state);return(p.goal_flow?.paths||[]).filter(path=>state.turns.every((t,i)=>path.turns[i]&&equal(t,path.turns[i])));}
function choices(out,state){const p=get(out,state);if(state.stop||state.safety||!state.openingReady||(p.script[1].steps&&state.openingStep<p.script[1].steps.length-1))return [];
 const groups=new Map();const candidates=paths(out,state);
 for(const path of candidates){if(state.ended&&(!path.customer_initiated||state.turns.length))continue;const c=path.turns[state.turns.length],s=path.turns[state.turns.length+1];if(!c||c.speaker!=='customer'||!s||s.speaker!=='sales')continue;const key=JSON.stringify([c.text,s.text]);if(!groups.has(key))groups.set(key,{key,customer:c,sales:s,pathIds:[],conditions:[],reactionLabels:[]});const g=groups.get(key);g.pathIds.push(path.id);if(path.when&&!g.conditions.includes(path.when))g.conditions.push(path.when);if(!g.reactionLabels.includes(path.reaction_label))g.reactionLabels.push(path.reaction_label);}
 // Base answers remain usable when no authored goal flow exists. They never imply a goal was completed.
 if(!p.goal_flow&&!state.turns.length&&!state.ended)for(const [i,a]of p.answers.entries()){const key='answer:'+i;groups.set(key,{key,customer:{speaker:'customer',text:a.customer,tone:null},sales:{speaker:'sales',text:a.reply,stage:'reply',why:a.why||'',direction:'',value:''},pathIds:[],conditions:[],reactionLabels:[],baseAnswer:true});}
 return [...groups.values()];}
function act(out,state,event,safety){const p=get(out,state),next=clone(state);
 if(state.stop)throw Error('連絡停止後の再勧誘はできません。');
 if(event.type==='stop'||event.type==='refusal'){next.stop=event.type==='stop';next.ended=true;next.pending=null;next.safety={speaker:'sales',stage:'end',text:safety[next.stop?'stop':'refusal'],sourcePattern:next.stop?'S0':'E3'};next.landing=next.stop?'連絡停止・再勧誘しない':'会話終了（想定例）';next.actions.push(event);return next;}
 if(state.safety)throw Error('終了した経路です。');
 if(event.type==='documents'){next.documentsReady=event.ready===true;next.openingReady=!material(p,p.script[1],out)||next.documentsReady;next.actions.push(event);return next;}
 if(event.type==='opening'){if(!state.openingReady||!p.script[1].steps||state.openingStep>=p.script[1].steps.length-1)throw Error('この操作は不要です。');next.openingStep++;next.actions.push(event);return next;}
 if(event.type==='unavailable'){if(!state.pending)throw Error('確認待ちの台詞はありません。');next.landing='正式資料の確認待ち。未確認の比較結果は表示していません。';next.actions.push(event);return next;}
 if(event.type!=='choose')throw Error('未対応の操作です。');
 const c=choices(out,state).find(c=>c.key===event.key);if(!c)throw Error('直前の会話に対応しない返答です。');
 if(material(p,c.sales,out)&&(!state.documentsReady||event.performed!==true)){next.pending={key:c.key,customer:c.customer.text,direction:c.sales.direction||'この台詞の前提となる正式な資料・料金条件を確認する。'};next.actions.push({...event,performed:false});return next;}
 next.turns.push(c.customer,c.sales);next.pending=null;next.actions.push(event);next.ended=false;next.landing='';
 const matches=paths(out,next),terminal=matches.find(x=>x.turns.length===next.turns.length);
 // Shared spoken prefixes may carry route-specific annotations in the source.
 // Once a route is resolved, retain that route's exact metadata as well as its words.
 const canonical=terminal||matches[0];if(canonical)next.turns=clone(canonical.turns.slice(0,next.turns.length));
 if(terminal){next.ended=true;next.pathId=terminal.id;next.landing=terminal.outcome_label+'（想定例）';if(terminal.turns.some(t=>t.tone==='stop'))next.stop=true;}
 if(c.baseAnswer){next.ended=true;next.landing='この先のゴールへのつなげ方は未作成です';}
 return next;
}
function transcript(out,state){const p=get(out,state),op=p.script[1],lines=[p.script[0]];if(state.openingReady){const steps=op.steps?op.steps.slice(0,state.openingStep+1):[op.text];for(const text of steps)lines.push({speaker:'sales',text});}
 lines.push(...state.turns);if(state.safety)lines.push(state.safety);return lines;}
function copy(out,state,all=false){return transcript(out,state).filter(t=>all||t.speaker==='sales').map(t=>(t.speaker==='sales'?'営業':'顧客（想定例）')+'：「'+t.text+'」').join('\r\n\r\n');}
function replay(out,record,safety){let s=start(out,record.patternId,record.initialDocuments===true);for(const event of record.actions)s=act(out,s,event,safety);return s;}
const API={generate,start,choices,act,transcript,copy,replay,material,paths,get};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.LegacyConversation=API;
})(typeof window!=='undefined'?window:globalThis);
