'use strict';
(()=>{
const data=window.FUTURE_TOOLS,stage=document.getElementById('orbit-stage'),nodes=[...stage.querySelectorAll('[data-node]')],shortcuts=[...document.querySelectorAll('[data-select]')];
const $=s=>document.querySelector(s),reduce=matchMedia('(prefers-reduced-motion: reduce)'),mod=n=>((n%8)+8)%8;
const OMEGA=8,DRAG_TAU=.032;let position=0,velocity=0,selected=-1,motion=0,destination=0,lastFrame=0,drag=null,suppressClickUntil=0,lastTrigger=null,parallax=0;const events=[];
const text=(id,value)=>document.getElementById(id).textContent=value;
function select(index,announce=false,animate=true){index=mod(index);if(selected===index){if(announce)text('selection-announcer',data[index].name+'を選択しました。');return;}
 selected=index;const d=data[index];nodes.forEach((e,i)=>e.setAttribute('aria-pressed',String(i===index)));shortcuts.forEach((e,i)=>e.setAttribute('aria-pressed',String(i===index)));
 text('orbit-count',String(index+1).padStart(2,'0'));text('selected-number',String(index+1).padStart(2,'0')+' / 08');text('selected-category',d.category);text('selected-name',d.name);text('selected-description',d.description);text('selected-outcome',d.action);$('#selected-icon').innerHTML=nodes[index].querySelector('svg').outerHTML;$('#future-use').dataset.open=d.key;
 if(animate&&!reduce.matches){for(const e of [$('#selected-icon'),$('#selected-content')]){e.getAnimations().forEach(a=>a.cancel());e.animate([{opacity:.45,transform:'translateY(9px)',filter:'blur(1px)'},{opacity:1,transform:'translateY(0)',filter:'blur(0px)'}],{duration:620,easing:'cubic-bezier(.2,.7,.2,1)'});}
 const ball=nodes[index].querySelector('.node-ball');ball.getAnimations().forEach(a=>a.cancel());ball.animate([{filter:'brightness(1)'},{filter:'brightness(1.27)',offset:.35},{filter:'brightness(1)'}],{duration:750,easing:'ease-out'});
 $('#future-use').animate([{filter:'brightness(1.18)'},{filter:'brightness(1)'}],{duration:700,easing:'ease-out'});}
 if(announce)text('selection-announcer',d.name+'を選択しました。「このツールを使う」で開始できます。');
}
function render(){const w=stage.clientWidth,h=stage.clientHeight,mobile=w<500,rx=w*(mobile?.32:.35),ry=h*(mobile?.275:.265);nodes.forEach((e,i)=>{const angle=(i-position)*Math.PI/4,depth=Math.cos(angle),front=(depth+1)/2,near=Math.pow(Math.max(0,depth),6),x=Math.sin(angle)*rx,y=depth*ry,scale=.64+front*.4+near*(mobile?.14:.22),z=depth*(mobile?26:48)+near*(mobile?25:42);
 e.style.transform=`translate(-50%,-50%) translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,${z.toFixed(3)}px) scale(${scale.toFixed(5)})`;e.style.zIndex=String(20+Math.round(front*80));e.style.opacity=String(.69+front*.31);e.style.setProperty('--frontness',near.toFixed(4));});}
function stop(){cancelAnimationFrame(motion);motion=0;lastFrame=0;}
function frame(now){const dt=Math.min(.032,Math.max(.001,(now-lastFrame)/1000||1/60));lastFrame=now;
 if(drag?.moved){const before=position;position+=(drag.target-position)*(1-Math.exp(-dt/DRAG_TAU));velocity=(position-before)/dt;select(mod(Math.round(position)),false,false);render();motion=requestAnimationFrame(frame);return;}
 const x=position-destination,d=velocity+OMEGA*x,decay=Math.exp(-OMEGA*dt);position=destination+(x+d*dt)*decay;velocity=(velocity-OMEGA*d*dt)*decay;
 if(Math.abs(position-destination)<.0015&&Math.abs(velocity)<.016){position=destination;velocity=0;motion=0;lastFrame=0;render();return;}
 render();motion=requestAnimationFrame(frame);
}
function settle(target,kind='snap',initialVelocity=null){destination=target;if(initialVelocity!==null)velocity=initialVelocity;select(mod(Math.round(target)),true);events.push({kind,from:position,to:target,reduced:reduce.matches,velocity});if(events.length>120)events.shift();
 if(reduce.matches){stop();position=target;velocity=0;render();return;}
 if(!motion){lastFrame=performance.now();motion=requestAnimationFrame(frame);}
}
function choose(index,kind='direct'){const current=mod(Math.round(position));let delta=mod(index)-current;if(delta>4)delta-=8;if(delta< -4)delta+=8;settle(Math.round(position)+delta,kind);}
$('#orbit-next').addEventListener('click',()=>settle((motion?destination:Math.round(position))+1,'next'));
$('#orbit-prev').addEventListener('click',()=>settle((motion?destination:Math.round(position))-1,'previous'));
nodes.forEach((e,i)=>e.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();return;}choose(i,'node');}));
shortcuts.forEach((e,i)=>e.addEventListener('click',()=>choose(i,'shortcut')));
stage.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();if(e.key==='Home')choose(0,'keyboard');else if(e.key==='End')choose(7,'keyboard');else settle((motion?destination:Math.round(position))+(e.key==='ArrowRight'?1:-1),'keyboard');if(e.target.closest('[data-node]'))nodes[selected].focus({preventScroll:true});});
stage.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;stop();drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,time:performance.now(),target:position,sampleVelocity:0,moved:false,vertical:false};});
stage.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;if(!drag.moved){if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.15){drag.vertical=true;return;}if(drag.vertical||Math.abs(dx)<7||Math.abs(dx)<Math.abs(dy)*1.1)return;drag.moved=true;stage.classList.add('is-dragging');stage.setPointerCapture(e.pointerId);}
 e.preventDefault();const now=performance.now(),step=e.clientX-drag.x,unit=stage.clientWidth<500?96:132,sample=-step/unit/Math.max(.008,(now-drag.time)/1000);drag.target-=step/unit;drag.sampleVelocity=drag.sampleVelocity*.65+Math.max(-6,Math.min(6,sample))*.35;drag.x=e.clientX;drag.time=now;
 if(reduce.matches){position=drag.target;select(mod(Math.round(position)),false,false);render();}else if(!motion){lastFrame=now;motion=requestAnimationFrame(frame);}
},{passive:false});
function finish(e,cancel=false){if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;stage.classList.remove('is-dragging');if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
 if(d.moved){suppressClickUntil=performance.now()+400;const v=cancel||performance.now()-d.time>120?0:Math.max(-5.5,Math.min(5.5,d.sampleVelocity*.7+velocity*.3)),coast=reduce.matches?0:Math.max(-1.2,Math.min(1.2,v*.16));settle(Math.round((cancel?position:d.target)+coast),cancel?'cancel-snap':'inertia-snap',v);}
 else if(Math.abs(position-Math.round(position))>.001)settle(Math.round(position),'cancel-snap',0);
}
stage.addEventListener('pointerup',e=>finish(e));stage.addEventListener('pointercancel',e=>finish(e,true));stage.addEventListener('lostpointercapture',e=>{if(e.target===stage&&drag?.id===e.pointerId)finish(e,true);});
stage.addEventListener('pointerleave',e=>{if(drag&&!drag.moved&&drag.id===e.pointerId){drag=null;if(Math.abs(position-Math.round(position))>.001)settle(Math.round(position),'cancel-snap',0);}});
stage.addEventListener('pointermove',e=>{if(drag||reduce.matches||e.pointerType!=='mouse')return;cancelAnimationFrame(parallax);parallax=requestAnimationFrame(()=>{const rect=stage.getBoundingClientRect();stage.style.setProperty('--p-x',((e.clientX-rect.left)/rect.width-.5)*8+'px');stage.style.setProperty('--p-y',((e.clientY-rect.top)/rect.height-.5)*5+'px');});});
stage.addEventListener('pointerleave',()=>{stage.style.setProperty('--p-x','0px');stage.style.setProperty('--p-y','0px');});
new ResizeObserver(render).observe(stage);reduce.addEventListener('change',()=>{stop();velocity=0;position=Math.round(position);destination=position;select(mod(position),false,false);render();});
const observer=new IntersectionObserver(entries=>{for(const x of entries)if(x.isIntersecting){if(!reduce.matches)x.target.classList.add('future-reveal');observer.unobserve(x.target);}},{threshold:.14});document.querySelectorAll('.future-catalog,.future-guide').forEach(e=>observer.observe(e));
document.querySelectorAll('.future-home a[href^="#"],.future-header a[href^="#"],.future-footer a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(target){e.preventDefault();target.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});}}));
document.addEventListener('click',e=>{const button=e.target.closest('[data-open]');if(button&&button.closest('.future-home,.future-header,.future-footer'))lastTrigger=button;},true);
const background=[...document.querySelectorAll('.future-home,.future-header,.future-footer,.future-skip')],shell=$('#appShell');let wasOpen=false;
new MutationObserver(()=>{const open=shell.style.display==='block';document.body.classList.toggle('future-tool-open',open);background.forEach(e=>{e.inert=open;});if(wasOpen&&!open){FutureWorkKitTheme.refresh();if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});}wasOpen=open;}).observe(shell,{attributes:true,attributeFilter:['style']});
select(0,false,false);render();
Object.defineProperty(window,'FutureWorkKit',{value:Object.freeze({get selected(){return selected;},get position(){return position;},get velocity(){return velocity;},get animating(){return !!motion;},events,tools:data.map(d=>d.key),version:'future-home-v1.1',physics:{model:'critically-damped spring',omega:OMEGA,dragTau:DRAG_TAU}})});
})();
