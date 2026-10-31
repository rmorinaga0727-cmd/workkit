/* C000 approved local editorial delta. W001 source data and source IDs are immutable. */
(function(root){'use strict';const EDITION='C000-sales-quality-20261030-v1',clone=x=>JSON.parse(JSON.stringify(x));
const comparisonRisk=/同じ(?:台数|条件|20台)|契約書と同じ|このようになります|並べると、この部分|含まれる内容をそろえて並べ/;
const priceQuestion=/いくら|幾ら|料金.*(?:教え|分か|わか|知り|払)|金額.*(?:教え|分か|わか|知り)|月額.*[?？]/;
const stopRequest=/もう(?:電話|連絡)(?:してこないで|しないで|しないでください)|今後(?:は)?(?:電話|連絡)(?:しないで|は不要)|連絡を(?:やめて|控えて)|電話を(?:やめて|控えて)/;
function pricing(input){const p=input.pricing||{},known=p.confirmed===true&&typeof p.text==='string'&&p.text.trim()&&typeof p.reference==='string'&&p.reference.trim();return {known:!!known,text:known?p.text.trim():'',reference:known?p.reference.trim():'',mode:known&&['fixed','variable'].includes(p.mode)?p.mode:'unknown',reason:known&&typeof p.reason==='string'?p.reason.trim():''};}
const sentence=x=>/[。？！!?]$/.test(x)?x:x+'。';
function priceReply(input,source){const p=pricing(input),question=source.match(/[^。？！!?]*[?？]/g)?.at(-1)?.trim()||'';
 if(!p.known)return {text:'料金の正式な情報がまだ確認できていないため、ここで金額はお伝えできません。確認してからお答えします。',blocked:true};
 const first='確認できている料金情報をお伝えします。'+sentence(p.text);
 if(p.mode==='variable'&&p.reason){const match=!question.includes('何人')||/人数|利用者|ユーザー|アカウント|ライセンス/.test(p.reason);return {text:first+' 料金が変わる条件は、'+sentence(p.reason)+(match?question:'その条件について、現在のご状況を伺えますか？'),blocked:!match};}
 if(p.mode==='fixed')return {text:first+(question?' ご利用内容の確認として、'+question:''),blocked:false};
 return {text:first+' 料金が変わる条件は未確認のため、確認してからお答えします。',blocked:true};
}
function lastQuestion(text){return text.match(/[^。？！!?]*[?？]/g)?.at(-1)?.trim()||'';}
function editText(text,turn,p,out){let s=text;const meeting=['first','proposal','closing'].includes(out.scene),q=lastQuestion(s);
 if(comparisonRisk.test(s)){
  if(turn.stage==='resolve')s='比較資料の対象と条件を確認し、比べられる点と異なる条件をご説明します。'+q;
  else if(turn.kind==='appointment')s='確認できる条件を整理し、比較できる点と違う条件を一緒に確認する場として、一度お時間をいただけませんか？';
  else if(!turn.stage&&p.pattern_id==='A2'&&meeting)s='現在のご契約とご提案を比べる前に、台数・プラン・含まれる費用の違いを一緒に確認してもよろしいですか？';
  else s='比べる前に、台数・利用範囲・含まれる費用などの条件を確認します。'+q;
 }
 if(/料金は台数やプランで変わる/.test(s))s='費用が気になるんですね。確認済みの料金情報があれば先にお伝えし、そのうえで比べられる条件を整理します。';
 if(/最初から全員分.*必要|広げることもできます/.test(s))s='必要な人数から始められるか、人数を増やす際の手続きや料金を、正式な契約条件で確認します。';
 if(/問題がなければ.*お申し込み/.test(s))s='次回は、ご担当の方に手順をご説明し、決裁される方と契約条件も確認したうえで、次に進めるか相談させてください。ご都合のよい日はありますか？';
 return s;
}
function apply(raw,input){const out=clone(raw),changes=[],price=pricing(input);out.editorial={edition:EDITION,source_version:raw.version,price_information:price};
 for(const p of out.patterns){const original=raw.patterns.find(x=>x.pattern_id===p.pattern_id),record=(scope,before,after,rule)=>{if(before!==after)changes.push({pattern_id:p.pattern_id,scene:out.scene,scope,rule,before,after});};
  const op=p.script[1],before=op.text;op.text=editText(op.text,op,p,out);
  if(out.objection==='price'&&price.known)op.text='確認できている料金情報をお伝えします。'+sentence(price.text)+' '+op.text;
  record('opening',before,op.text,'C000-PRICE/COMPARE');
  const oldAim=p.strategy.aim_logic;
  p.strategy.aim_logic=p.strategy.aim_logic.replace('値下げは約束せず、まだ料金の話もしない。','値下げは約束しない。料金を質問された場合は、確認済みの情報から先に答える。').replace('値段の話をせずに済む','予算の時期と料金の確認事項を切り分けられる').replace('商談の場では、提案の中身はすでに伝えてある。','商談では、提案内容を伝えているかを先に確かめる。').replace('今の契約の台数・プラン・含まれるものをそろえて比べれば、差があるかがその場で分かる。','現在の契約と提案の台数・プラン・含まれる費用を確認し、比べられる項目と条件の違いを整理する。資料や条件が不足していれば、比較結果を提示したことにせず確認待ちにする。');
  if(p.pattern_id==='C5')p.strategy.aim_logic='料金が分からないままでは判断できないため、確認済みの料金を先に伝える。未確認なら確認して回答する。料金と条件を理解したうえで、必要な場合だけ利用方法を確認する機会を提案する。';
  if(p.pattern_id==='C7')p.strategy.aim_logic+='料金を聞かれた場合は、確認済み情報から先に答える。';
  if(oldAim!==p.strategy.aim_logic){op.theory=p.strategy.aim_logic;record('strategy.aim_logic',oldAim,p.strategy.aim_logic,'C000-REASON-ALIGNMENT');}
  for(const [i,a]of(p.answers||[]).entries()){const before=a.reply;a.reply=editText(a.reply,{stage:'reply'},p,out);if(priceQuestion.test(a.customer)){const x=priceReply(input,a.reply);a.reply=x.text;a.c000_price_blocked=x.blocked;}record('answer:'+i,before,a.reply,'C000-PRICE/COMPARE');}
  if(!p.goal_flow)continue;
  for(const route of p.goal_flow.paths){const source=original.goal_flow.paths.find(x=>x.id===route.id);route.c000={edition:EDITION,source_pattern_id:p.pattern_id,source_path_id:route.id,source_outcome:route.outcome,source_outcome_label:route.outcome_label,source_reaches_goal:route.reaches_goal};
   // Explicit refusal/stop endings remain byte-for-byte intact.
   for(let i=0;i<route.turns.length;i++){const t=route.turns[i];if(t.speaker!=='sales'||t.stage==='end')continue;const before=t.text;t.text=editText(t.text,t,p,out);
    if(t.kind==='contract')t.text='お申し込みの前に、今回の決裁をされる方と、料金・契約期間・解約条件を正式資料で確認させてください。内容をご確認いただいてから、申し込みに進むか伺ってもよろしいですか？';
    if(p.pattern_id==='C5'&&t.kind==='appointment'&&price.known)t.text='お伝えした料金情報を踏まえて、今のお仕事の進め方と利用条件が合うかを確認するため、一度お話しする機会をいただけませんか？ 合わなければ、その旨をお伝えします。';
    if(t.stage==='close'&&route.c000.source_outcome==='contract')t.text='ありがとうございます。まず決裁される方と契約条件の確認を進めます。お申し込みは、その確認とご同意をいただいてからです。';
    if(t.stage==='close'&&route.c000.source_outcome==='appointment')t.text='ありがとうございます。ご希望の日程について、具体的な日付と開始時刻、対面・オンラインなどの商談方法を確認させてください。';
    if(t.stage==='close'&&route.c000.source_outcome==='next_action')t.text='次に確認する内容と、ご連絡してよい具体的な日付・時刻を、ここで一緒に決めてもよろしいですか？';
    if(route.turns[i-1]?.speaker==='customer'&&priceQuestion.test(route.turns[i-1].text)){const pr=priceReply(input,source.turns[i].text);t.text=pr.text;t.c000={price_reply:true,price_blocked:pr.blocked};}
    const oldWhy=t.why,oldDirection=t.direction;
    if(t.c000?.price_reply){t.why='確認できている料金情報を先に伝える。変動する条件は確認済みの理由だけを説明し、情報不足ならアポに誘導せず確認して回答する。';t.direction='料金の対象・適用条件・期間・税込税抜・出典を確認する。必要な条件が未確認なら続きを打診しない。';}
    else if(t.kind==='contract'){t.why='前向きな返答だけでは決裁権限や契約条件への同意は確認できないため、申し込みの前に確認する。';t.direction='決裁者、料金、契約期間、解約条件、最終申込同意を確認する。確認完了前は申し込み済みと記録しない。';}
    else if(t.stage==='close'&&route.c000.source_outcome==='appointment'){t.why='希望する曜日・時間帯だけでは日時・方法の合意にならないため、具体的な日付・開始時刻・方法・同意を確認する。';t.direction='未確認なら日程調整中として保持する。';}
    else if(t.stage==='close'&&route.c000.source_outcome==='contract'){t.why='確認・説明への了承と申込同意を区別し、未確認条件が残る間は申込未確定として扱う。';t.direction='決裁権限・契約条件・申込同意が確認できているかを確認する。';}
    else if(t.stage==='close'&&route.c000.source_outcome==='next_action'){t.why='次回の確認内容・具体的な日時・同意が不足しているため、合意済みにしない。';t.direction='確認する内容・日付・時刻・同意をそろえる。連絡停止希望があれば次回連絡を提案しない。';}
    else if(comparisonRisk.test(before)&&t.text!==before)t.why='条件の一致や優位性は資料で確認するまで断定しない。比較できる項目と異なる条件を分けて伝える。';
    record(route.id+':turn:'+i+':why',oldWhy,t.why,'C000-REASON-ALIGNMENT');record(route.id+':turn:'+i+':direction',oldDirection,t.direction,'C000-CONFIRMATION');
    if(t.value){const vBefore=t.value;t.value=editText(t.value,{stage:'reply'},p,out);record(route.id+':turn:'+i+':value',vBefore,t.value,'C000-COMPARE');}
    if(t.text!==before||t.why!==oldWhy||t.direction!==oldDirection){t.editorial={edition:EDITION,source_pattern_id:p.pattern_id,source_path_id:route.id,source_turn:i,source_text:before,source_why:oldWhy,source_direction:oldDirection};record(route.id+':turn:'+i,before,t.text,'C000-QUALITY');}
   }
   if(route.c000.source_outcome==='appointment'){route.outcome='appointment_pending';route.outcome_label='日程調整中（日付・時刻・商談方法・同意の確認待ち）';route.reaches_goal=false;route.end_condition='具体的な日付・開始時刻・商談方法と顧客の同意が未確認のため、アポ確定としない。';}
   if(route.c000.source_outcome==='contract'){route.outcome='contract_pending';route.outcome_label='決裁権限・契約条件・申込意思の確認待ち（申込未確定）';route.reaches_goal=false;route.end_condition='決裁権限、料金・契約期間・解約条件、最終的な申込同意を確認するまで契約成立としない。';}
   if(route.c000.source_outcome==='next_action'){route.outcome='followup_pending';route.outcome_label='次回行動の内容・日付・時刻・同意の確認待ち';route.reaches_goal=false;route.end_condition='次回確認する内容・具体的な日時・相手の同意がそろうまで合意済みにしない。';}
   route.lands=route.outcome_label;record(route.id+':landing',route.c000.source_outcome_label,route.outcome_label,'C000-GOAL-ESTABLISHMENT');
  }
 }
 out.editorial.changes=changes;return out;
}
function goalStatus(route,confirmed={}){if(!route)return {established:false,status:'未確認'};const source=route.c000?.source_outcome||route.outcome;
 const parsed=new Date(confirmed.date+'T00:00:00Z'),validDate=/^\d{4}-\d{2}-\d{2}$/.test(confirmed.date||'')&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===confirmed.date;
 const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(confirmed.time||'');const consent=confirmed.consent===true;
 if(source==='appointment')return {established:!!(validDate&&time&&confirmed.method?.trim()&&consent),status:validDate&&time&&confirmed.method?.trim()&&consent?'日時・方法・同意確認済み':'日程調整中'};
 if(source==='contract'){const established=confirmed.authority===true&&confirmed.terms===true&&confirmed.applicationConsent===true;return {established,status:established?'決裁権限・契約条件・申込意思確認済み':'決裁権限・契約条件・申込意思の確認が必要'};}
 if(source==='next_action'){const established=!!(validDate&&time&&confirmed.subject?.trim()&&consent);return {established,status:established?'次回内容・日時・同意確認済み':'次回内容・日時・同意の確認が必要'};}
 return {established:false,status:'終了・保留'};
}
const API={EDITION,apply,pricing,priceReply,priceQuestion,stopRequest,goalStatus};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.C000Editorial=API;
})(typeof window!=='undefined'?window:globalThis);
