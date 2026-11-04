const clamp=n=>Math.min(1,Math.max(0,n));
const smooth=(a,b,n)=>{n=clamp((n-a)/(b-a));return n*n*(3-2*n);};
const mix=(a,b,t)=>a+(b-a)*t;

export class AstronautOrbit {
 constructor(background){
  this.background=background;
  this.element=document.querySelector('#hero-astronaut');
  this.depth=this.element.querySelector('.astronaut-depth');
  this.image=this.element.querySelector('img');
  this.hero=document.querySelector('#inicio');
  this.title=this.hero.querySelector('h1');
  this.media=matchMedia('(prefers-reduced-motion: reduce)');
  this.lastFrame=null;
  const previousFrame=background.onFrame;
  background.onFrame=frame=>{previousFrame?.(frame);this.lastFrame=frame;this.render(frame);};
  this.refresh=()=>{
   this.width=document.documentElement.clientWidth;this.height=innerHeight;
   this.heroHeight=this.hero.getBoundingClientRect().height;
   const bounds=this.title.getBoundingClientRect();
   this.titleTop=bounds.top+scrollY;this.titleHeight=bounds.height;
   this.render(this.lastFrame);
   background.schedule();
  };
  this.image.addEventListener('load',this.refresh);
  addEventListener('resize',this.refresh);
  this.media.addEventListener('change',this.refresh);
  this.resizeObserver=new ResizeObserver(this.refresh);this.resizeObserver.observe(this.hero);
  // Without WebGL, the portrait is a static part of the hero and scrolls away naturally.
  if(!background.gl||background.failed)this.element.classList.add('astronaut-static');
  this.refresh();
 }
 render(frame){
  if(!this.image.complete||!this.image.naturalWidth||this.background.flight!==null){this.element.style.visibility='hidden';return;}
  const w=this.width,h=this.height,mobile=w<700;
  const first=this.background.bodies(0,w,h).a;
  const world=[frame?.a,frame?.b].find(body=>body?.index===2)||first;
  const maxScroll=Math.max(1,document.documentElement.scrollHeight-h);
  const progress=frame?.progress??this.background.current;
  const staticPortrait=this.media.matches||this.background.paused||!this.background.gl||this.background.failed;
  const q=staticPortrait?0:clamp(progress*maxScroll/(this.heroHeight*1.12));
  const depth=smooth(0,1,q);
  const baseX=mobile?first.x+w*.22:first.x-w*.085;
  const baseY=mobile?this.titleTop+this.titleHeight*.30:first.y-h*.015;
  const x=mix(baseX,world.x,depth*.94);
  const y=mix(baseY,world.y,depth*.94);
  const scale=1-.87*depth;
  const alpha=1-smooth(.38,1,q);
  this.depth.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) scale(${scale.toFixed(4)}) rotate(${(-5*depth).toFixed(2)}deg)`;
  this.depth.style.opacity=alpha.toFixed(4);
  this.element.dataset.distant=String(q>=1);
  this.element.style.visibility=q>=1?'hidden':'visible';
 }
}
