import {AstronautOrbit} from './astronaut.js?v=20261104-ascent1';
import {Horizons} from './horizons.js?v=20261104-ascent1';
import {OrbitalIntro} from './intro.js?v=20261104-ascent1';
import {SpaceEffects} from './space-effects.js?v=20261104-effects1';
const media=matchMedia('(prefers-reduced-motion: reduce)');
const motion=document.querySelector('#motion');
let paused=media.matches;
const background=new Horizons(document.querySelector('#horizons'),{order:[2,3,4,0,1],orbitalStart:true});
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}},{threshold:.08});
for(const element of document.querySelectorAll('.reveal'))observer.observe(element);
document.body.classList.add('js-motion');
function applyMotion(){
 document.body.classList.toggle('paused',paused);
 motion.textContent=paused?'Activar movimiento':'Pausar movimiento';
 motion.setAttribute('aria-pressed',String(paused));background.setPaused(paused);
 if(paused)for(const element of document.querySelectorAll('.reveal'))element.classList.add('visible');
}
motion.addEventListener('click',()=>{paused=!paused;applyMotion();});
media.addEventListener('change',()=>{paused=media.matches;applyMotion();});applyMotion();
let progressFrame=0;
function progress(){progressFrame=0;const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);document.querySelector('#progress').style.transform=`scaleX(${Math.min(1,scrollY/max)})`;}
addEventListener('scroll',()=>{if(!progressFrame)progressFrame=requestAnimationFrame(progress);},{passive:true});addEventListener('resize',progress);progress();

new AstronautOrbit(background);
new OrbitalIntro(background);
new SpaceEffects();
