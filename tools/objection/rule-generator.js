/* Local rule composition. No model inference, external research, or commercial facts. */
(function(root){'use strict';
const VERSION='local-rule-composition-20261031-v1';
const stop=/連絡停止|(?:電話|連絡|メール)(?:は|が|も)?(?:今後|一切|もう)?(?:は|も)?(?:不要|要りません|いりません|結構です)|連絡(?:し|をし|してこ)ないで|電話(?:し|をし|してこ)ないで|連絡を(?:やめ|止め|控え)|電話を(?:やめ|止め|控え)|二度と.*(?:電話|連絡)|今後.*(?:連絡|電話|メール).*(?:不要|いらない|しないで)|営業(?:電話|メール).*不要/;
const refusal=/お断りします|はっきり断|きっぱり断|これ以上.*(?:話|説明).*(?:不要|いらない)|話を(?:終わり|終了)|興味(?:が|は)?(?:全く|まったく)?(?:ない|ありません)|もう(?:結構です|話したくない)/;
const definitions={
 price:[['比較の基準を聞く','何と比べて高いと感じるかを確認したいとき','価格の基準が提案側と異なる可能性があります。','価格差や優位性を断定せず、まず比べている対象をそろえます。','料金が高いと感じられたのですね。何と比べて、どの費用が高いと感じられましたか？','今の支払いと比べて、月々の費用が気になります。'],['必要な範囲を整理する','利用範囲と料金の関係を確認したいとき','不要な範囲まで含む提案だと感じている可能性があります。','値下げやプラン変更を約束せず、必要な利用範囲と正式な料金条件を確認します。','費用が気になるのですね。今回、必要な利用範囲と、なくても困らない部分を分けて伺ってもよろしいですか？','まずは必要な業務の範囲だけで考えたいです。'],['費用に見合うかを確かめる','料金に対して価値が伝わっていないとき','支払う費用に対して得られる価値が見えていない可能性があります。','効果を約束せず、顧客が費用をかけてでも解決したい課題があるか確認します。','費用に見合うかが大切ですよね。費用をかけてでも見直したい困りごとはありますか？','手間を減らせるなら、内容を詳しく知りたいです。']],
 competitor:[['今の運用で困る点を聞く','利用中のサービスに改善したい点があるか確認するとき','今のサービスで足りており、変更する理由がないと感じている可能性があります。','他社の欠点を決めつけず、顧客自身が挙げた不便だけを次の確認につなげます。','すでにご利用中なのですね。今の運用で便利な点と、もし見直せるなら変えたい点はありますか？','便利ですが、日々の管理には少し手間がかかります。'],['比較するときの条件を聞く','比較対象にするための判断基準を知りたいとき','比較の手間に見合う理由がまだない可能性があります。','競合より優れているとは言わず、顧客にとって比較する価値のある条件を確認します。','今のサービスをすぐ変えていただく話ではありません。もし比べるなら、費用・使い方・サポートのうち、何を重視されますか？','費用だけでなく、使い方も確認したいです。'],['見直す時期を聞く','今すぐの変更を求めず検討可能な時期を知りたいとき','今は変更を考える時期ではない可能性があります。','更新時期や違約金を推測せず、顧客が見直しを考える時期を尋ねます。','ご利用中とのこと、承知しました。見直しを考えるとしたら、どんな時期やきっかけになりますか？','次に契約内容を確認するときに、考えたいです。']],
 budget:[['予算の状況を聞く','予算がない理由を確認してよいとき','予算の確保時期と提案の時期が合っていない可能性があります。','予算超過を勧めず、今期の制約か検討対象外なのかを確認します。','ご予算の事情があるのですね。今は予算が確保できていないということでしょうか。それとも、今回は検討の対象外でしょうか？','今期の予算がまだ確保できていません。'],['優先している課題を聞く','他の投資を優先している場合','ほかに優先したい課題がある可能性があります。','投資回収や売上増を約束せず、優先順位に合う話かを確認します。','無理なご負担はお願いしません。今、費用をかけるなら優先したいことは何でしょうか？','まずは今の仕事の手間を減らすことです。']],
 noneed:[['今の状況を確認する','必要性が伝わっているか確かめるとき','現在の方法で足りている、または用途が伝わっていない可能性があります。','不要という判断を尊重し、説明を続ける前に一つだけ確認の許可を得ます。','承知しました。不要とのご判断を尊重します。一点だけ、今の方法で不便がないか伺ってもよろしいですか？','一点だけなら大丈夫です。受付の手間は気になっています。'],['検討するきっかけを聞く','今は不要でも将来の判断基準を確認してよいとき','現時点では優先する必要がないと感じている可能性があります。','将来の連絡を当然とせず、検討する条件があるかだけを確認します。','今すぐの導入をお願いする話ではありません。どのような変化があれば検討の対象になるか、伺ってもよろしいですか？','今の方法で対応しきれなくなったときですね。']],
 consider:[['判断に足りない点を聞く','検討の理由がまだ分からないとき','判断に必要な情報や納得できない点が残っている可能性があります。','検討を同意と捉えず、残る疑問を明らかにしてから次の行動を相談します。','ご検討ありがとうございます。判断するために、まだ確認したい点はどのあたりでしょうか？','契約条件をもう少し確認したいです。'],['判断する人と手順を聞く','関係者への確認が必要なとき','関係者の確認が必要で、その場で決められない可能性があります。','決裁権限を推測せず、必要な人と確認の手順を聞きます。','承知しました。ご判断までに、どなたと、どの点を確認されるご予定でしょうか？','社内の担当者と利用条件を確認します。'],['検討の時期を聞く','判断するタイミングを整理したいとき','検討の優先順位や時期がまだ定まっていない可能性があります。','期限を押しつけず、判断に必要な確認と時期を一緒に整理します。','ありがとうございます。何を確認できたら、いつ頃を目安にご判断できそうでしょうか？','必要な条件を確認してから、時期を決めたいです。']],
 unknown:[['気になる点を確かめる','断りの理由がまだ分からないとき','言葉だけでは、費用・必要性・時期のどれが気になるか分からない状態です。','意図を決めつけず、顧客の言葉で懸念を聞いてから次に進みます。','承知しました。差し支えなければ、いちばん気になっている点を教えていただけますか？','内容と条件をもう少し確認したいです。'],['話を続けてよいか確かめる','説明を続ける前に相手の意向を確認するとき','今は説明を受ける余裕や意向がない可能性があります。','説明への同意と契約への同意を分け、断られたら終了します。','ご意向を尊重します。確認を一つだけ続けてもよろしいでしょうか。ここで終えることもできます。','確認を一つだけなら大丈夫です。']]
};
function classify(phrase,fallback){if(stop.test(phrase))return 'stop';if(refusal.test(phrase))return 'nointerest';if(/高い|高すぎ|割高|費用が.*重|料金|金額/.test(phrase))return 'price';if(/予算|お金がない|資金/.test(phrase))return 'budget';if(/他社|別の会社|別会社|利用中|使っている|契約中/.test(phrase))return 'competitor';if(/検討|考えます|迷って|社内.*確認|持ち帰/.test(phrase))return 'consider';if(/必要ない|要らない|いらない|不要|間に合|必要ありません/.test(phrase))return 'noneed';return phrase?'unknown':fallback||'unknown';}
function normalize(input,V){const i=JSON.parse(JSON.stringify(input));i.phrase=(i.phrase||'').trim();i.objection=classify(i.phrase,i.objection);if(!V.objections.objections[i.objection])i.objection='other';return i;}
function generate(input,P,V,E){const i=normalize(input,V),raw=E.generate(i,P,V);if(raw.issues.length)return raw;
 const product=(input.productName||'').trim()||(!['*','other',''].includes(input.category)?input.category:'ご提案のサービス');
 const context={product,industry:input.industry||'',target:input.target||'',scene:i.scene};
 const provenance={version:VERSION,mode:'approved-reference',classification:i.objection,context,reference_ids:raw.patterns.map(p=>p.pattern_id),limits:['AI推論・外部調査は実施していません。','料金・機能・競合比較は入力された確認済み情報だけを使用します。']};
 // A full authored route takes precedence. No source wording is altered here.
 if(raw.patterns.length&&raw.patterns.every(p=>p.goal_flow||p.ends)){raw.generation=provenance;return raw;}
 const key=classify(i.phrase,input.objection),family=definitions[key]?key:'unknown';
 const stopText=P.cases.stop.byCategory['*'].patterns[0].opening,endText=P.cases.nointerest.byCategory['*'].patterns[0].opening;
 const phrase=i.phrase||raw.label||V.objections.objections[input.objection]?.label||'入力した断り文句';
 const goal={key:i.scene==='teleapo'?'appointment':i.scene==='existing'?'purpose':'contract',label:i.scene==='teleapo'?'内容を確認する機会と日程の相談':i.scene==='existing'?(input.purpose?.trim()||'目的を確認して次の行動を相談'):'判断条件・決裁権限を確認して次の行動を相談'};
 const c=(text,tone='neutral')=>({speaker:'customer',text,tone});
 const s=(text,stage='reply',extra={})=>({speaker:'sales',text,stage,why:'顧客の意向と未確認の条件を確かめ、同意前に確定扱いにしません。',direction:'事実の確認と相手の同意が必要です。',value:'',requires_material_confirmation:false,...extra});
 const close=s(endText,'end'),halt=s(stopText,'end');
 function pattern(d,n){const [name,when,hyp,reason,opening,answer]=d,id='RULE-'+family.toUpperCase()+'-'+(n+1),paths=[];
  const add=(suffix,turns,outcome,label)=>paths.push({id:id+'-'+suffix,reaction_label:suffix,when:'顧客がこの想定例に相当する返答をした場合のみ',turns,outcome,outcome_label:label,reaches_goal:false,customer_initiated:false});
  const topical=/予約/.test(product)?'予約の受付や管理':/MEO|マップ/i.test(product)?'店舗情報の運用や来店のきっかけ':/携帯/.test(product)?'社用携帯の利用や管理':/決済/.test(product)?'決済の運用':'現在の業務';
  const bridge='伺った点について、'+product+'で対応できるかは、実際の利用条件と正式な情報で確認する必要があります。';
  const invite=i.scene==='teleapo'?bridge+' '+topical+'の状況と利用条件が合うかを確認する機会として、一度お話ししてもよろしいですか？':i.scene==='existing'?'今回のご相談で目指すことを確認させてください。'+(input.purpose?'「'+input.purpose+'」を目的として、必要な条件を一緒に整理してもよろしいですか？':'どのようなことを解決したいとお考えでしょうか？'):bridge+' '+(/担当|従業員|スタッフ/.test(input.target||'')?'ご判断される方と、社内で確認が必要な条件を教えていただけますか？':'今回のご判断はご自身でされますか。それとも、ほかの方への確認も必要でしょうか？');
  const prefix=[c(answer,'positive'),s(invite,'ask')];
  if(i.scene==='teleapo')add('positive',[...prefix,c('内容を確認する機会なら、相談してもよいです。','positive'),s('ありがとうございます。ご希望の日程について、具体的な日付と開始時刻、対面・オンラインなどの商談方法を確認させてください。','close')],'appointment','日程の確認待ち');
  else if(i.scene==='existing')add('positive',[...prefix,c('まずは目的と条件を整理したいです。','positive'),s('承知しました。確認する内容と、ご連絡してよい具体的な日付・時刻を、一緒に決めてもよろしいですか？','close')],'next_action','目的・次回行動の確認待ち');
  else{
   add('positive',[...prefix,c('私が判断しますが、契約条件はこれから確認します。','positive'),s('お申し込みの前に、料金・契約期間・解約条件を正式な資料で確認し、ご納得いただいてから進めるか相談してもよろしいですか？','ask',{kind:'contract'}),c('まず条件の確認をお願いします。','positive'),s('ありがとうございます。まず決裁される方と契約条件の確認を進めます。お申し込みは、その確認とご同意をいただいてからです。','close')],'contract','決裁権限・条件・申込意思の確認待ち');
   add('approval',[...prefix,c('ほかの担当者への確認が必要です。','hesitant'),s('承知しました。どなたに何を確認するかと、次にお話ししてよい具体的な日付・時刻を、一緒に決めてもよろしいですか？','close')],'next_action','次回の内容・日時・同意の確認待ち');
  }
  add('later-refusal',[...prefix,c('やはり、今回はお断りします。','refusal'),close],'end','会話終了');
  add('later-stop',[...prefix,c('今後は連絡しないでください。','stop'),halt],'end','連絡停止・再勧誘しない');
  const hesitation=[c('まだ判断できません。確認してから考えたいです。','hesitant'),s('承知しました。判断するために、今いちばん確認したい点を教えていただけますか？','confirm')];
  add('hesitation',[...hesitation,c('料金や契約条件を確認したいです。','hesitant'),s('料金と契約条件を、正式な情報で確認してお答えします。確認する内容と、ご連絡してよい具体的な日付・時刻を相談してもよろしいですか？','close')],'next_action','料金・契約条件の確認待ち');
  add('hesitation-refusal',[...hesitation,c('今回はお断りします。','refusal'),close],'end','会話終了');
  add('satisfied',[c('今のままで特に困っていません。','satisfied'),s('承知しました。今の方法で足りているのですね。ほかに見直したい点がなければ、ここで失礼します。','end')],'end','現状の意向を尊重して終了');
  add('refusal',[c('今回はお断りします。','refusal'),close],'end','会話終了');
  add('stop',[c('今後は連絡しないでください。','stop'),halt],'end','連絡停止・再勧誘しない');
  add('price',[c('先に料金を教えてください。','question'),s('料金の正式な情報を確認してからお答えします。','reply')],'hold','料金確認待ち');
  return {pattern_id:id,pattern_name:name,axis:name,status:'option',condition:'',condition_check:'',use_when:when,not_for:'明確な拒否・連絡停止希望がある場合は使わず、終了します。',insight:{hyp},strategy:{aim_logic:reason},script:[c(phrase),s(opening)],answers:[],goal_flow:{goal:goal.key,pursue:true,paths},ends:'',recommend:{is:false},provenance:{kind:'local-common-rule',rule_version:VERSION,reference_ids:provenance.reference_ids}};
 }
 let ps;
 if(key==='stop'||key==='nointerest'){
  ps=[{pattern_id:key==='stop'?'RULE-STOP':'RULE-END',pattern_name:'意向を尊重して終了する',axis:'終了',use_when:'明確な拒否や連絡停止希望があるとき',not_for:'終了後の再勧誘はしません。',condition:'',condition_check:'',insight:{hyp:'これ以上の案内を希望していないという意思表示です。理由の推測より意向を優先します。'},strategy:{aim_logic:'質問や営業ゴールの打診を追加せず、丁寧に終了します。'},script:[c(phrase),s(key==='stop'?stopText:endText,'end')],answers:[],ends:'end',goal_flow:null,recommend:{is:false},provenance:{kind:'local-common-rule',rule_version:VERSION}}];
 }else ps=definitions[family].map(pattern);
 return {...raw,version:VERSION,objection:key==='stop'?'stop':key==='nointerest'?'nointerest':family,category:product,label:phrase,goal,patterns:ps,primary:{kind:'none',pattern_id:null},notes:['共通ルールで構成した確認用台本です。顧客の返答は想定例で、合意や効果を保証するものではありません。',family==='unknown'?'断りの意図を特定できないため、確認する返し方を表示しています。':'心理は仮説です。実際の返答に応じて確認してください。'],generation:{...provenance,mode:'common-rule',classification:family,reference_patterns:raw.patterns}};
}
const API={VERSION,generate,classify,normalize};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.RuleGenerator=API;
})(typeof window!=='undefined'?window:globalThis);
