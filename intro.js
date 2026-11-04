const SESSION_KEY='ziv-orbital-entry-v1';
const DURATION=9600;
const clamp=n=>Math.min(1,Math.max(0,n));
const smooth=(a,b,n)=>{n=clamp((n-a)/(b-a));return n*n*(3-2*n);};

export class OrbitalIntro {
 constructor(background){
  this.background=background;this.root=document.documentElement;
  this.element=document.querySelector('#launch-intro');
  this.skip=document.querySelector('#flight-skip');this.pause=document.querySelector('#flight-pause');
  this.replay=document.querySelector('#launch-replay');
  if(!background.gl||background.failed)this.replay.hidden=true;
  this.content=[...document.querySelectorAll('body>header,body>main,body>footer')];
  this.media=matchMedia('(prefers-reduced-motion: reduce)');
  this.frame=0;this.elapsed=0;this.active=false;this.paused=false;
  this.skip.addEventListener('click',()=>this.finish());
  this.pause.addEventListener('click',()=>this.togglePause());
  this.replay.addEventListener('click',()=>this.start(true).catch(()=>this.finish()));
  this.onKey=event=>{
   if(!this.active)return;
   if(event.key==='Escape'){event.preventDefault();this.finish();}
   if(event.key==='Tab'){
    const first=this.skip,last=this.pause;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  addEventListener('keydown',this.onKey);
  document.addEventListener('visibilitychange',()=>{
   if(!this.active)return;
   if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}
   else if(!this.paused){this.last=0;this.schedule();}
  });
  this.media.addEventListener('change',()=>{if(this.media.matches&&this.active)this.finish();});
  background.canvas.addEventListener('webglcontextlost',()=>{if(this.active)this.finish();});
  if(this.root.classList.contains('flight-pending'))this.start(false).catch(()=>this.finish());
 }
 async start(replay=false){
  if(this.active)return;
  clearTimeout(this.exitTimer);
  if(this.media.matches||!this.background.gl||this.background.failed){this.openPage();return;}
  if(!replay&&(!this.root.classList.contains('flight-pending')||document.hidden)){this.openPage();return;}
  this.active=true;this.paused=false;this.elapsed=0;this.last=0;this.lastDraw=0;
  this.previousPaused=this.background.paused;
  this.root.classList.remove('flight-revealing');this.root.classList.add('flight-active');
  this.element.dataset.state='loading';this.element.setAttribute('aria-hidden','false');
  this.content.forEach(node=>{node.inert=true;});
  scrollTo({top:0,left:0,behavior:'instant'});
  this.pause.setAttribute('aria-pressed','false');this.pause.textContent='Pausar';
  this.skip.focus({preventScroll:true});
  this.background.setPaused(true);this.background.setFlight(0);
  this.paint(0);
  let timer;
  const ready=await Promise.race([this.background.ready,new Promise(resolve=>{timer=setTimeout(()=>resolve(false),2700);})]);
  clearTimeout(timer);
  if(!this.active)return;
  if(!ready||(!replay&&!this.root.classList.contains('flight-pending'))){this.finish();return;}
  clearTimeout(window.zivFlightFallback);
  this.root.classList.remove('flight-pending');this.element.dataset.state='playing';
  this.element.querySelector('#flight-status').textContent='SISTEMAS LISTOS';
  if(!this.paused)this.schedule();
 }
 schedule(){if(!this.frame&&this.active&&!this.paused&&!document.hidden)this.frame=requestAnimationFrame(time=>this.tick(time));}
 tick(time){
  this.frame=0;if(!this.active||this.paused)return;
  if(this.last)this.elapsed+=time-this.last;
  this.last=time;
  const p=clamp(this.elapsed/DURATION);
  if(time-this.lastDraw>32||p===1){this.lastDraw=time;this.background.setFlight(p);this.paint(p);}
  if(p>=1)this.finish();else this.schedule();
 }
 paint(p){
  this.element.style.setProperty('--brand-opacity',1-smooth(.66,.88,p));
  this.element.style.setProperty('--brand-shift',`${-18*smooth(.60,.88,p)}px`);
  this.element.style.setProperty('--cockpit-opacity',1-smooth(.77,.99,p));
  this.element.style.setProperty('--cockpit-scale',1+.08*smooth(.70,1,p));
  const vibration=Math.sin(p*193)*Math.sin(Math.PI*p)*(.2+smooth(.08,.25,p))*(1-smooth(.52,.78,p));
  this.element.style.setProperty('--shake-x',`${vibration*.65}px`);
  this.element.style.setProperty('--shake-y',`${Math.cos(p*257)*vibration*.45}px`);
  this.element.style.setProperty('--flight-progress',p);
  this.element.style.setProperty('--glass-opacity',.22*(1-smooth(.45,.85,p)));
  const phase=p<.14?'SISTEMAS LISTOS':p<.51?'ASCENSO ATMOSFÉRICO':p<.77?'CRUZANDO EL LÍMITE':'ÓRBITA ALCANZADA';
  const status=this.element.querySelector('#flight-status');
  if(status.textContent!==phase)status.textContent=phase;
  this.element.querySelector('#flight-percent').textContent=String(Math.round(p*100)).padStart(2,'0');
 }
 togglePause(){
  if(!this.active)return;
  this.paused=!this.paused;this.last=0;
  this.pause.setAttribute('aria-pressed',String(this.paused));
  this.pause.textContent=this.paused?'Continuar':'Pausar';
  if(this.paused){cancelAnimationFrame(this.frame);this.frame=0;}else if(this.element.dataset.state==='playing')this.schedule();
 }
 openPage(){
  clearTimeout(window.zivFlightFallback);
  this.root.classList.remove('flight-pending','flight-active');
  this.element.setAttribute('aria-hidden','true');this.element.dataset.state='hidden';
  this.content.forEach(node=>{node.inert=false;});
 }
 finish(){
  if(!this.active){this.openPage();return;}
  this.active=false;cancelAnimationFrame(this.frame);this.frame=0;
  clearTimeout(window.zivFlightFallback);
  this.background.setFlight(null);
  this.background.current=0;this.background.target=0;
  this.background.setPaused(this.media.matches||this.previousPaused);this.background.schedule();
  this.root.classList.remove('flight-pending','flight-active');
  this.root.classList.add('flight-revealing');
  this.element.dataset.state='leaving';this.element.setAttribute('aria-hidden','true');
  this.content.forEach(node=>{node.inert=false;});
  try{sessionStorage.setItem(SESSION_KEY,'seen');}catch{}
  const heading=document.querySelector('.hero h1');heading.tabIndex=-1;heading.focus({preventScroll:true});
  this.exitTimer=setTimeout(()=>{this.element.dataset.state='hidden';this.root.classList.remove('flight-revealing');},1050);
 }
}
