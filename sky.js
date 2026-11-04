const word = document.querySelector('.gravity-word');
const sky = document.querySelector('.sky-event');
const quietSky = () => document.hidden || document.body.classList.contains('paused') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const letters=[...word.querySelectorAll('span')];
letters.forEach((letter,i)=>{
  letter.style.setProperty('--dx',(letters.length/2-i-.5)*.48+'em');
  letter.style.setProperty('--tilt',(i%2?1:-1)*(14+i*2)+'deg');
});
let gravityTimer;
new IntersectionObserver(([entry])=>{
  clearTimeout(gravityTimer);
  if(entry.isIntersecting && !quietSky() && !word.dataset.played){
    gravityTimer=setTimeout(()=>{if(quietSky())return;word.dataset.played='1';word.classList.add('lensing');},1250);
  }
},{threshold:.8}).observe(word);
let passes=0;
function fly(){
  if(!quietSky()){
    sky.className='sky-event '+(++passes%3===0?'asteroid':'meteor');
    sky.style.top=(12+Math.random()*48)+'vh';
    sky.animate([{transform:'translate(0,0)',opacity:0},{opacity:.8,offset:.15},{transform:'translate(118vw,21vh)',opacity:0}],{duration:passes%3===0?3700:1400});
  }
  setTimeout(fly,16000+Math.random()*8500);
}
setTimeout(fly,6500);
