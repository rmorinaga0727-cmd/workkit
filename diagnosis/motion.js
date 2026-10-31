'use strict';
// Local presentation layer only. It never scores, rewrites answers, or calls APIs.
window.WorkKitMotion=(()=>{
 const media=matchMedia('(prefers-reduced-motion: reduce)'),$=s=>document.querySelector(s);
 let off=false,observer,animations=[],pendingFrames=[],previousProgress=0;
 const events=[];
 // V3.3 presentation timing only. Delays never gate answers, navigation or storage.
 const timing=(label,duration,delay)=>{
  const rules=[
   [/^button-press$|^answer-select$|^answer-check$/,300,1],
   [/^question-forward$|^question-backward$/,600,1],
   [/^question-number$/,500,1], [/^answer-stagger-/,580,1.2],
   [/^answer-progress$/,650,1], [/^intro-title-/,1050,1.35],
   [/^intro-gradient$/,1800,1], [/^answer-gather-/,1250,1],
   [/^analysis-axis-/,850,.9], [/^type-mask-reveal$/,1100,1],
   [/^character-depth-arrival$/,1100,1.5], [/^catch-stage$/,950,1.6],
   [/^type-background$/,1800,1], [/^radar-line-draw$/,1600,1],
   [/^radar-area-form$/,1500,1.2], [/^radar-axis-point-/,600,1.1],
   [/^axis-bar-/,1300,1.1], [/^report-/,850,1],
   [/^conversation-customer$/,680,1], [/^conversation-sales-reply$/,780,1.65],
   [/^conversation-phrase$/,780,1.55], [/^conversation-response-point$/,650,1.9],
   [/^habit-scene-mask$/,800,1], [/^habit-key-phrase$/,750,1.35],
   [/^habit-strength-perspective$/,720,1.3], [/^habit-insight-line$/,900,1.3],
   [/^habit-condition-highlight$/,850,1.3], [/^habit-.*-expand$/,650,1],
   [/^practice-line-progress$/,700,1], [/^practice-step-content$/,600,1],
   [/^practice-action-highlight$/,650,1.4], [/^practice-step-\d$/,550,1.4],
   [/^practice-line-draw$/,1000,1.25], [/^practice-tool-accent$/,1000,1.4],
   [/^guide-interaction-/,300,1], [/^guide-02-arrival$/,900,1],
   [/^guide-03-arrival$/,850,1], [/^guide-04-step-/,800,1],
   [/^guide-.*-cue$/,650,1.4], [/^navigation-line-shift$/,480,1],
   [/^navigation-section-arrival$/,800,1], [/^details-expand$/,550,1.2],
   [/^evidence-dialog-expand$/,350,1]
  ];
  const rule=rules.find(([pattern])=>pattern.test(label));
  return rule?{duration:rule[1],delay:Math.round(delay*rule[2])}:{duration,delay};
 };

 const reduced=()=>off||media.matches;
 const note=(label,duration)=>{events.push({label,duration,time:performance.now()});if(events.length>400)events.shift();};
 function play(el,frames,duration=480,delay=0,label='interaction',easing='cubic-bezier(.25,.65,.3,1)'){
  if(!el||reduced())return;
  const baseDuration=duration;({duration,delay}=timing(label,duration,delay));
  const a=el.animate(frames,{duration,delay,easing,fill:'backwards'});animations.push(a);note(label,duration);Object.assign(events.at(-1),{baseDuration,delay,easing});
  a.finished.then(()=>{animations=animations.filter(x=>x!==a);}).catch(()=>{});return a;
 }
 function reset(full=true){if(full)window.WorkKitReport?.reset();observer?.disconnect();animations.forEach(a=>a.cancel());animations=[];pendingFrames.forEach(cancelAnimationFrame);pendingFrames=[];}
 function count(el){const end=Number(el.dataset.count),start=performance.now();if(reduced()){el.textContent=end;return;}note('score-count-up',1500);
  const tick=now=>{if(!el.isConnected)return;const t=Math.min(1,(now-start)/1500);el.textContent=Math.round(end*(1-(1-t)**3));if(t<1)pendingFrames.push(requestAnimationFrame(tick));};pendingFrames.push(requestAnimationFrame(tick));
 }
 function chart(el){if(!el||reduced())return;
  const shape=el.querySelector('.radar-shape'),points=el.querySelectorAll('.radar-point');
  play(el.querySelector('.radar-outline'),[{strokeDasharray:1,strokeDashoffset:1},{strokeDasharray:1,strokeDashoffset:0}],1450,0,'radar-line-draw');
  play(shape,[{transform:'scale(.06)',opacity:.08},{transform:'scale(1)',opacity:1}],1300,80,'radar-area-form');
  points.forEach((p,i)=>play(p,[{r:0,opacity:0},{r:6,opacity:1,offset:.7},{r:4,opacity:1}],420,200+i*120,'radar-axis-point-'+i));
  el.querySelectorAll('[data-count]').forEach(count);
  el.querySelectorAll('.score-bar i').forEach((p,i)=>play(p,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],950,i*100,'axis-bar-'+i));
 }
 function reveal(el,kind){
  const variants={strength:[{transform:'translateY(20px)',opacity:.35},{transform:'none',opacity:1}],caution:[{borderLeftColor:'#2477df',background:'#deebfc'},{borderLeftColor:'#91a7c3',background:'#edf2f8'}],conversation:[{clipPath:'inset(0 0 12% 0)',transform:'translateX(-16px)',opacity:.4},{clipPath:'inset(0)',transform:'none',opacity:1}],habit:[{backgroundPosition:'100% 0',transform:'translateY(12px)'},{backgroundPosition:'0 0',transform:'none'}],growth:[{boxShadow:'inset 4px 0 #27a3c5',transform:'translateY(16px)'},{boxShadow:'inset 0px 0 #27a3c5',transform:'none'}]};
  play(el,variants[kind],kind==='habit'?850:650,0,'report-'+kind);
 }
 function customers(){const grid=$('.conversation-grid');if(!grid)return;const cards=[...grid.children];cards.forEach((c,i)=>c.id='customer-panel-'+i);
  const tabs=document.createElement('div');tabs.className='customer-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','会話の場面を切り替える');
  tabs.innerHTML=['両方を見る','得意な会話','ひと工夫が必要な会話'].map((t,i)=>`<button data-customer="${i}" aria-pressed="${i===0}">${t}</button>`).join('');
  grid.before(tabs);tabs.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=Number(b.dataset.customer);tabs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));cards.forEach((c,j)=>{c.hidden=i!==0&&j!==i-1;if(!c.hidden)play(c,[{opacity:.5,transform:'translateX(8px)'},{opacity:1,transform:'none'}],360,0,'customer-card-switch');});grid.classList.toggle('single',i!==0);});
  if(innerWidth<=650){cards[1].hidden=true;grid.classList.add('single');tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.customer==='1'));}
 }
 function mount(){
  if($('.intro')){
   document.querySelectorAll('.title-piece').forEach((el,i)=>play(el,[{clipPath:'inset(0 0 100% 0)',transform:'translateY(20px)'},{clipPath:'inset(0)',transform:'none'}],850,i*160,'intro-title-'+i));
   play($('.intro-visual'),[{backgroundPosition:'0% 50%',transform:'translateY(16px)'},{backgroundPosition:'100% 50%',transform:'none'}],1500,0,'intro-gradient');
  }
  if($('.question-page')){const dir=Number(document.documentElement.dataset.direction)||1;
   play($('.question-content'),[{opacity:.4,transform:`translateX(${dir*36}px)`},{opacity:1,transform:'none'}],420,0,dir<0?'question-backward':'question-forward');
   play($('.question-counter'),[{transform:`translateY(${dir*14}px)`,opacity:.1},{transform:'none',opacity:1}],350,0,'question-number');
   document.querySelectorAll('.answer-option').forEach((el,i)=>play(el,[{opacity:.15,transform:'translateY(12px)'},{opacity:1,transform:'none'}],400,80+i*55,'answer-stagger-'+i));
   play($('.question-page .progress-track'),[{boxShadow:'0 0 0 0 #276ddd00'},{boxShadow:'0 0 0 3px #276ddd18',offset:.45},{boxShadow:'0 0 0 0 #276ddd00'}],650,0,'question-progress-focus');
   const now=Number($('.progress-track').getAttribute('aria-valuenow'))*5;progress(now);previousProgress=now;
  }
  if($('.analysis')){
   document.querySelectorAll('.answer-particles i').forEach((el,i)=>{const angle=i/20*Math.PI*2;play(el,[{transform:`translate(${Math.cos(angle)*125}px,${Math.sin(angle)*90}px) scale(1)`,opacity:.1},{opacity:.9,offset:.3},{transform:'translate(0px,0px) scale(.3)',opacity:0}],1050,i*24,'answer-gather-'+i);});
   document.querySelectorAll('.analysis-bars>span>i').forEach((el,i)=>play(el,[{transform:'scaleY(0)'},{transform:'scaleY(1)'}],650,750+i*130,'analysis-axis-'+i));
  }
  if($('.report')){
   WorkKitReport.mount();const enter=$('.report').classList.contains('enter');
   const replay=document.createElement('button');replay.className='text-button';replay.textContent='グラフを再生';replay.id='chart-replay';$('.score-heading>span').replaceWith(replay);replay.onclick=()=>{animations.filter(a=>$('.score-panel').contains(a.effect?.target)).forEach(a=>a.cancel());chart($('.score-panel'));};
   if(enter){
    play($('.type-dot'),[{transform:'scaleY(.15)',opacity:.3},{transform:'scaleY(1)',opacity:1}],850,200,'type-signature-line');
    play($('.type-line h1'),[{clipPath:'inset(0 100% 0 0)',transform:'translateX(-12px)'},{clipPath:'inset(0)',transform:'none'}],900,60,'type-mask-reveal');
    play($('.character-window'),[{opacity:0,transform:'perspective(900px) translateX(42px) translateY(12px) rotateY(-12deg) scale(.91)'},{opacity:1,transform:'perspective(900px) translateX(0) translateY(0) rotateY(0) scale(1)'}],1100,120,'character-depth-arrival');
    play($('.result-heading h2'),[{opacity:.1,transform:'translateY(14px)'},{opacity:1,transform:'none'}],750,350,'catch-stage');
    play($('.character-panel'),[{backgroundPosition:'0% 50%'},{backgroundPosition:'100% 50%'}],1300,0,'type-background');
   }
   mountCharacter();
   const targets=new Map([[$('.strength-grid'),'strength'],[$('.caution-panel'),'caution'],[$('.score-panel'),'chart'],[$('.report-footer'),'footer']]);
   observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){const kind=targets.get(e.target);if(kind==='chart'&&e.intersectionRatio<.55)return;if(kind==='chart')chart(e.target);else if(kind==='footer')play(e.target,[{boxShadow:'inset 0 2px #5bb7ed00'},{boxShadow:'inset 0 2px #5bb7ed99',offset:.5},{boxShadow:'inset 0 2px #5bb7ed00'}],1200,0,'footer-once-accent');else reveal(e.target,kind);observer.unobserve(e.target);}}),{threshold:[.13,.55]});
   targets.forEach((_,el)=>{if(el)observer.observe(el);});
  }
 }
 function mountCharacter(){const el=$('.character-window');if(!el)return;
  el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','キャラクターの動きを再生');el.title='キャラクターの動きを再生';
  function react(){if(el.getAnimations().length)return;play(el,[{transform:'translateY(0) rotate(0)'},{transform:'translateY(-3px) rotate(-.6deg)',offset:.45},{transform:'translateY(0) rotate(0)'}],850,0,'character-greeting');}
  el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')react();});el.addEventListener('click',react);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();react();}});
 }
 function progress(now){const el=$('.progress-track span');if(el)play(el,[{width:previousProgress+'%'},{width:now+'%'}],520,0,'answer-progress');previousProgress=now;}
 function axis(button){if(!window.WorkKitCore)return;const name=button.dataset.axis,ids=WorkKitCore.AXES[name];const description={前進力:'次の行動を決め、会話を前に進める傾向',深掘り:'背景を聞き、質問で課題を探る傾向',構造化:'情報と商談の流れを整理する傾向',柔軟性:'相手の反応に合わせて進め方を変える傾向',関係構築:'話しやすさと信頼を重視する傾向',仮説提案:'仮説や比較を通して提案を考える傾向'};
  $('#axis-explanation').textContent=`${name}：${description[name]}。Q${ids.map(i=>i+1).join('・Q')}の自己申告を平均し、20倍した値です。能力の評価ではありません。`;
  document.querySelectorAll('.axis-button').forEach(b=>b.classList.toggle('active',b===button));const i=Object.keys(WorkKitCore.AXES).indexOf(name),dot=$('.score-panel').querySelectorAll('.radar-point')[i];play(dot,[{r:4},{r:9},{r:4}],500,0,'axis-focus');
 }
 document.addEventListener('change',e=>{if(e.target.name==='answer'){const label=e.target.closest('label');play(label,[{transform:'perspective(600px) translateY(0) rotateX(0)'},{transform:'perspective(600px) translateY(-2px) rotateX(1deg)',boxShadow:'0 8px 18px #2467d824',offset:.5},{transform:'none'}],340,0,'answer-select');play(label.querySelector('.answer-check'),[{transform:'scale(.15) rotate(-25deg)',opacity:0},{transform:'scale(1.25)',opacity:1,offset:.7},{transform:'none',opacity:1}],380,0,'answer-check');requestAnimationFrame(()=>{const track=$('.progress-track');if(track)progress(Number(track.getAttribute('aria-valuenow'))*5);});}});
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.axis)axis(b);if(b.id==='motion-toggle'){off=!off;sync();if(off){reset(false);document.querySelectorAll('[data-count]').forEach(e=>e.textContent=e.dataset.count);}return;}play(b,[{transform:'scale(1)'},{transform:'scale(.965)',offset:.4},{transform:'scale(1)'}],180,0,'button-press');if(['review-save','deepen-apply','copy-memo'].includes(b.id))requestAnimationFrame(()=>play($('#review-status')||$('#deepen-output'),[{background:'#d6f3ed',opacity:.5},{background:'transparent',opacity:1}],700,0,'save-confirmation'));});
 document.addEventListener('pointerover',e=>{const b=e.target.closest('.axis-button');if(b)axis(b);});
 document.addEventListener('focusin',e=>{if(e.target.matches('.axis-button'))axis(e.target);});
 document.addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS'&&e.target.open&&!e.target.hasAttribute('data-report-detail'))[...e.target.children].slice(1).forEach((el,i)=>play(el,[{opacity:.2,transform:'translateY(-8px)'},{opacity:1,transform:'none'}],350,i*25,'details-expand'));},true);
 function sync(){document.documentElement.classList.toggle('motion-off',reduced());const b=$('#motion-toggle');if(b){b.textContent=reduced()?'演出をオン':'演出をオフ';b.setAttribute('aria-pressed',reduced());b.disabled=media.matches;if(media.matches)b.textContent='端末設定：演出オフ';}}
 media.addEventListener('change',()=>{sync();if(reduced()){reset(false);document.querySelectorAll('[data-count]').forEach(e=>e.textContent=e.dataset.count);}});
 function modal(el){play(el,[{opacity:.4,transform:'translateY(18px) scale(.985)'},{opacity:1,transform:'none'}],280,0,'evidence-dialog-expand');}
 sync();return {mount,reset,modal,reduced,events,play,timing};
})();
