const random=(a,b)=>a+Math.random()*(b-a);
const clamp=n=>Math.min(1,Math.max(0,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};

// One lightweight, decorative layer. It never receives input or moves the page.
export class SpaceEffects {
 constructor(canvas=document.querySelector('#space-effects')){
  this.canvas=canvas;this.ctx=canvas?.getContext('2d',{alpha:true});
  if(!this.ctx)return;
  this.media=matchMedia('(prefers-reduced-motion: reduce)');
  this.time=0;this.frame=0;this.last=0;this.events=[];this.nextMeteor=random(18,26);this.nextFlare=3.4;
  this.scroll=0;this.scrollTarget=0;
  this.glow=this.makeGlow();this.nebula=this.makeNebula();
  this.tick=this.tick.bind(this);this.resize=this.resize.bind(this);this.sync=this.sync.bind(this);
  this.onScroll=()=>{this.scrollTarget=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);};
  addEventListener('resize',this.resize);addEventListener('scroll',this.onScroll,{passive:true});
  document.addEventListener('visibilitychange',this.sync);this.media.addEventListener('change',this.sync);
  this.observer=new MutationObserver(this.sync);
  this.observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  this.observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  this.resize();this.onScroll();this.sync();
 }
 makeGlow(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'#f6fcff');g.addColorStop(.035,'#d8f5ff');g.addColorStop(.13,'#76d2ff99');
  g.addColorStop(.35,'#319bff26');g.addColorStop(1,'#126fff00');
  ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return canvas;
 }
 makeNebula(){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.globalCompositeOperation='lighter';
  for(let i=0;i<36;i++){
   const x=random(90,680),y=225+Math.sin(x*.008)*70+random(-45,45),r=random(40,135);
   const g=ctx.createRadialGradient(x,y,0,x,y,r);
   g.addColorStop(0,i%3?'#1b83e24a':'#39cce54f');g.addColorStop(.4,'#126abd25');g.addColorStop(1,'#0048a000');
   ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  for(let i=0;i<240;i++){
   const x=random(80,690),y=225+Math.sin(x*.008)*70+random(-52,52);
   ctx.fillStyle=`rgba(146,213,255,${random(.02,.13)})`;ctx.fillRect(x,y,random(.3,1.1),.7);
  }
  return canvas;
 }
 resize(){
  this.w=document.documentElement.clientWidth;this.h=innerHeight;this.mobile=this.w<700;
  this.ratio=Math.min(devicePixelRatio||1,1.25,Math.sqrt(900000/(this.w*this.h)));
  this.canvas.width=Math.round(this.w*this.ratio);this.canvas.height=Math.round(this.h*this.ratio);
  this.stars=Array.from({length:this.mobile?28:56},()=>({x:random(.05,1),y:random(.03,.96),size:random(2,7),phase:random(0,6.28),speed:random(.3,.8),depth:random(.2,1)}));
  this.mask=this.ctx.createLinearGradient(0,0,this.w,0);
  this.mask.addColorStop(0,'#00000024');this.mask.addColorStop(.42,'#00000055');this.mask.addColorStop(.72,'#000000dd');this.mask.addColorStop(1,'#000');
  this.paint();
 }
 sync(){
  const root=document.documentElement;
  const blocked=this.media.matches||document.hidden||document.body.classList.contains('paused')||root.classList.contains('flight-pending')||root.classList.contains('flight-active');
  this.canvas.hidden=this.media.matches;
  this.canvas.dataset.active=String(!blocked);
  if(blocked){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;return;}
  if(!this.frame)this.frame=requestAnimationFrame(this.tick);
 }
 spawnMeteor(start=this.time,small=false){
  const w=this.w,h=this.h;
  this.events.push({kind:'meteor',start,duration:small?random(1.7,2.4):random(2.9,3.7),
   x:random(.28,.70)*w,y:-h*.12,dx:random(.55,.80)*w,dy:random(.58,.85)*h,
   curve:random(-.035,.035)*h,length:Math.min(w*(small?.27:.43),small?185:380),
   size:small?1:1.7,warm:Math.random()>.78});
 }
 spawnFlare(start=this.time){
  this.events.push({kind:'flare',start,duration:random(7,9),x:random(.68,.85)*this.w,y:random(.16,.32)*this.h,size:this.mobile?115:180});
 }
 tick(now){
  this.frame=0;
  if(this.last&&now-this.last<33){this.frame=requestAnimationFrame(this.tick);return;}
  const dt=this.last?Math.min((now-this.last)/1000,.08):0;this.last=now;this.time+=dt;
  this.scroll+=(this.scrollTarget-this.scroll)*(1-Math.exp(-dt*3));
  if(this.time>=this.nextMeteor){
   this.spawnMeteor();
   this.nextMeteor=this.time+random(40,65);
  }
  if(this.time>=this.nextFlare){this.spawnFlare();this.nextFlare=this.time+random(28,42);}
  this.events=this.events.filter(event=>this.time<event.start+event.duration);
  this.paint();this.frame=requestAnimationFrame(this.tick);
 }
 paint(){
  const ctx=this.ctx,w=this.w,h=this.h;if(!w||!h)return;
  ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.clearRect(0,0,w,h);
  ctx.globalCompositeOperation='lighter';
  // Cached, transparent gas wisps drift at a different depth from the stars.
  const swell=.50+.12*Math.sin(this.time*.16);
  ctx.globalAlpha=swell;
  const nw=Math.max(w*.85,520),nh=nw*2/3;
  ctx.drawImage(this.nebula,w*.68-nw/2+Math.sin(this.time*.04)*15,h*.30-nh/2-this.scroll*45,nw,nh);
  for(const star of this.stars){
   const y=((star.y*h-this.scroll*star.depth*45)%h+h)%h;
   ctx.globalAlpha=.22+.36*Math.pow(.5+.5*Math.sin(this.time*star.speed+star.phase),3);
   ctx.drawImage(this.glow,star.x*w-star.size/2,y-star.size/2,star.size,star.size);
  }
  const active=[];
  for(const event of this.events){
   const p=(this.time-event.start)/event.duration;if(p<0||p>1)continue;active.push(event.kind);
   if(event.kind==='meteor')this.drawMeteor(event,p);else this.drawFlare(event,p);
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-in';ctx.fillStyle=this.mask;ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation='source-over';
  const state=[...new Set(active)].join(' ')||'ambient';if(this.canvas.dataset.event!==state)this.canvas.dataset.event=state;
 }
 drawMeteor(event,p){
  const ctx=this.ctx,x=event.x+event.dx*p,y=event.y+event.dy*p+Math.sin(p*Math.PI)*event.curve;
  const angle=Math.atan2(event.dy+Math.PI*event.curve*Math.cos(p*Math.PI),event.dx);
  const alpha=ease(p/.12)*(1-ease((p-.68)/.32));
  const length=event.length*ease(p/.18),rgb=event.warm?'255,201,133':'113,208,255';
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;
  const tail=ctx.createLinearGradient(-length,0,3,0);
  tail.addColorStop(0,`rgba(${rgb},0)`);tail.addColorStop(.55,`rgba(${rgb},.12)`);tail.addColorStop(.92,`rgba(${rgb},.7)`);tail.addColorStop(1,'#effbff');
  ctx.fillStyle=tail;ctx.beginPath();ctx.moveTo(-length,-1);ctx.quadraticCurveTo(-length*.3,-event.size*2.2,2,0);ctx.quadraticCurveTo(-length*.3,event.size*2.2,-length,1);ctx.fill();
  ctx.strokeStyle=tail;ctx.lineWidth=event.size*.65;ctx.beginPath();ctx.moveTo(-length,0);ctx.lineTo(2,0);ctx.stroke();
  ctx.globalAlpha=alpha*.72;ctx.drawImage(this.glow,-31,-31,62,62);
  ctx.fillStyle=event.warm?'#fff3d8':'#f1fcff';ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(0,0,event.size,0,Math.PI*2);ctx.fill();
  for(let i=0;i<7;i++){
   const q=(p*2+i*.143)%1;
   ctx.globalAlpha=alpha*(1-q)*.38;ctx.fillRect(-q*length*.8,Math.sin(i*11.7)*q*7,1.3,1.3);
  }
  ctx.restore();
 }
 drawFlare(event,p){
  const ctx=this.ctx,alpha=Math.pow(Math.sin(p*Math.PI),2)*.86,size=event.size;
  ctx.save();ctx.translate(event.x,event.y);ctx.globalAlpha=alpha;
  // A broad corona and a slowly opening halo distinguish this from a shooting star.
  const corona=ctx.createRadialGradient(0,0,2,0,0,size*.68);
  corona.addColorStop(0,'#c6f0ff66');corona.addColorStop(.16,'#4abfff38');corona.addColorStop(.5,'#1688e810');corona.addColorStop(1,'#006aff00');
  ctx.fillStyle=corona;ctx.fillRect(-size,-size,size*2,size*2);
  ctx.drawImage(this.glow,-size/2,-size/2,size,size);
  ctx.strokeStyle='#7bccff38';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(0,0,size*(.21+.11*ease(p)),0,Math.PI*2);ctx.stroke();
  const beam=ctx.createLinearGradient(-size,0,size,0);
  beam.addColorStop(0,'#65caff00');beam.addColorStop(.46,'#77cfff33');beam.addColorStop(.5,'#d9f8ff');beam.addColorStop(.54,'#77cfff33');beam.addColorStop(1,'#65caff00');
  ctx.fillStyle=beam;ctx.fillRect(-size,-.65,size*2,1.3);
  ctx.scale(.48,1);ctx.rotate(Math.PI/2);ctx.fillRect(-size*.38,-.45,size*.76,.9);
  ctx.restore();
 }
}
