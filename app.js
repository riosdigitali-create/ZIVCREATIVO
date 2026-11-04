const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let paused=reduced;
if(!reduced)document.body.classList.add('js-motion');
const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});document.querySelectorAll('.reveal').forEach(e=>obs.observe(e));
const canvas=document.querySelector('#stars'),ctx=canvas.getContext('2d'),phone=matchMedia('(max-width: 700px)');let w,h,stars=[],last=0;
function resize(){if(phone.matches)return;w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio,2);canvas.width=w*d;canvas.height=h*d;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);stars=Array.from({length:w<700?70:160},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.1+.2,s:Math.random()*.4+.1,o:Math.random()}));draw(0)}
function draw(t){ctx.clearRect(0,0,w,h);stars.forEach(s=>{ctx.globalAlpha=.25+s.o*.6;ctx.fillStyle='#e1d8ff';ctx.beginPath();ctx.arc(s.x,((s.y-t*s.s*.015)%h+h)%h,s.r,0,7);ctx.fill()})}
function frame(t){if(phone.matches)return;if(!paused&&t-last>32){draw(t);last=t}requestAnimationFrame(frame)}
function scroll(){const y=scrollY,max=document.documentElement.scrollHeight-innerHeight;document.querySelector('#progress').style.width=(max?y/max*100:0)+'%'}

const motion=document.querySelector('#motion');function setMotion(){document.body.classList.toggle('paused',paused);motion.textContent=paused?'Activar movimiento':'Pausar movimiento';motion.setAttribute('aria-pressed',String(paused));if(paused){document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible'))}}
motion.addEventListener('click',()=>{paused=!paused;setMotion()});addEventListener('resize',resize);addEventListener('scroll',scroll,{passive:true});resize();scroll();setMotion();requestAnimationFrame(frame);

const movies = [...document.querySelectorAll('[data-movie]')];
const visible = new Set();
const cached = new Map();
const loads = new Map();
let active = null;
let generation = 0;

async function phoneSource(video) {
  if (cached.has(video)) return cached.get(video);
  const controller = new AbortController();
  loads.set(video, controller);
  try {
    const response = await fetch(video.dataset.mobile, {signal: controller.signal});
    if (!response.ok) throw new Error('Video unavailable');
    const url = URL.createObjectURL(await response.blob());
    cached.set(video, url);
    return url;
  } finally {
    if (loads.get(video) === controller) loads.delete(video);
  }
}
async function syncMovies() {
  const connection = navigator.connection;
  const posterOnly = paused || document.hidden || connection?.saveData ||
    (phone.matches && ['slow-2g','2g'].includes(connection?.effectiveType));
  const next = posterOnly ? null : [...visible].pop() || null;
  const mobile = phone.matches;
  if (next === active && (!next || next.dataset.display === String(mobile))) return;
  const request = ++generation;
  if (active) {
    active.pause();
    active.classList.remove('playing');
  }
  loads.forEach(controller => controller.abort());
  active = next;
  if (!next) return;
  next.dataset.display = String(mobile);
  try {
    const url = mobile ? await phoneSource(next) : next.dataset.movie;
    if (request !== generation) return;
    if (next.getAttribute('src') !== url) next.src = url;
    next.playbackRate = mobile ? 1 : (next.dataset.movie.includes('/deep-') ? 0.8 : 0.45);
    await next.play();
    if (request === generation) next.classList.add('playing');
  } catch {
    if (request === generation) next.classList.remove('playing');
  }
}
const movieObserver = new IntersectionObserver(entries => {
  entries.forEach(({target, isIntersecting}) => {
    if (isIntersecting) visible.add(target);
    else visible.delete(target);
  });
  syncMovies();
});
movies.forEach(video => movieObserver.observe(video));
motion.addEventListener('click', syncMovies);
phone.addEventListener('change', syncMovies);
document.addEventListener('visibilitychange', syncMovies);
navigator.connection?.addEventListener('change', syncMovies);
