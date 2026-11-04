const byId = id => document.getElementById(id);
const destinations = [
  ['Tu web', ''], ['Liverpool','liverpool.com.mx'], ['Walmart','walmart.com.mx'],
  ['Mercado Libre','mercadolibre.com.mx'], ['Amazon','amazon.com.mx'], ['Coppel','coppel.com'],
  ['TikTok Shop','tiktok.com'], ['Claro Shop','claroshop.com'], ['eBay','ebay.com'],
  ['Etsy','etsy.com'], ['AliExpress','aliexpress.com']
];
const initialChannels = destinations.map((_, index) => index);
const selected = new Set(initialChannels);
const action = byId('seller-action');
let mode = 'upload';
const logo = (domain) => domain ? '<img alt="" src="assets/canales/'+domain+'.png">' : '<span aria-hidden="true">◎</span>';
function renderChoices() {
  byId('channel-list').innerHTML = destinations.map(([name,domain],i) =>
    '<button type="button" data-index="'+i+'" aria-pressed="'+selected.has(i)+'" '+(i===0?'disabled':'')+'>'+logo(domain)+name+'<b>'+(selected.has(i)?'✓':'+')+'</b></button>'
  ).join('');
}
byId('channel-list').onclick = event => {
  const button = event.target.closest('button');
  if (!button || mode !== 'select') return;
  const index = Number(button.dataset.index);
  if (index === 0) return;
  if (selected.has(index)) selected.delete(index); else selected.add(index);
  button.setAttribute('aria-pressed',String(selected.has(index)));
  button.querySelector('b').textContent=selected.has(index)?'✓':'+';
  renderSolarSystem();
};
function renderSolarSystem(launch = false) {
  const svg = byId('dispatch-map');
  svg.setAttribute('viewBox','0 0 410 350');
  const channels = destinations.map(([name, domain], index) => ({name, domain, index}))
    .filter(channel => channel.index && selected.has(channel.index));
  const palette = ['#83caff', '#a6d9ff', '#4a9fff', '#b3e6ff', '#72d1ed'];
  const positions = [[120,40],[276,46],[342,100],[351,157],[337,218],[280,284],[158,302],[66,250],[52,179],[64,101]];
  const orbits = channels.map(({name,domain,index}) => {
    const [x,y] = positions[index-1];
    const radius = Math.hypot(x-205, (y-178+.25*(x-205))/.75);
    const color = palette[(index-1) % palette.length];
    const path = 'M205 178 Q'+(205+.36*(x-205))+' '+(y+35)+' '+x+' '+y;
    const width = name === 'Mercado Libre' ? 109 : 86;
    const size = radius * 2.55;
    const ring = `<g transform="translate(205 178) matrix(1,-.25,0,.75,0,0)"><ellipse cx="0" cy="0" rx="${radius}" ry="${radius}" fill="none" stroke="${color}" stroke-width=".65" opacity=".23"/></g>`;
    const badge = '<g transform="translate('+x+' '+y+')"><rect x="'+(-width/2)+'" y="-12" width="'+width+'" height="24" rx="12" fill="#081725" stroke="'+color+'"/><image href="assets/canales/'+domain+'.png" x="'+(5-width/2)+'" y="-8" width="16" height="16"/><text x="9" y="4" text-anchor="middle" fill="#fff" font-size="11" font-family="system-ui">'+name+'</text></g>';
    const travel = launch ? '<g opacity="0"><image href="assets/chancla.webp" x="-12" y="-13" width="24" height="26"/><animateMotion begin="indefinite" dur="2s" path="'+path+'"/><animate attributeName="opacity" begin="indefinite" dur="2s" values="0;1;1;0" keyTimes="0;.08;.94;1"/></g>' : '';
    return {ring,badge,travel};
  });
  svg.setAttribute('aria-label','Tu web en el centro. '+channels.map(c=>c.name).join(', '));
  svg.innerHTML = orbits.map(o=>o.ring).join('') +
    '<image class="solar-body" href="assets/sol-ia.webp" x="139" y="112" width="132" height="132"/><rect x="174" y="166" width="62" height="24" rx="12" fill="#0a263d" opacity=".85"/><text x="205" y="183" fill="#fff7e6" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="14">Tu web</text>' +
    orbits.map(o=>o.badge).join('') + orbits.map(o=>o.travel).join('');
  if (launch) requestAnimationFrame(() => svg.querySelectorAll('animate,animateMotion').forEach(el=>el.beginElement()));
}
function showRoute() {
  const entries = destinations.filter((_,i)=>selected.has(i));
  const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches && !document.body.classList.contains('paused');
  renderSolarSystem(animate);
  byId('shelves').innerHTML=entries.map(([name,domain],i)=>'<article style="--delay:'+ (animate?1.65+i*.16:0)+'s"><div>'+logo(domain)+' '+name+'</div><img src="assets/chancla.webp" alt=""><b>Chancla Azul</b><span>$890 MXN</span></article>').join('');
  byId('dispatch').hidden=false;
}
action.onclick=()=>{
  if(mode==='upload'){
    mode='select';
    byId('product-sheet').hidden=false; byId('targets').hidden=false;
    byId('phase').textContent='02 / CANALES'; byId('seller-title').textContent='Ficha lista';
    byId('seller-hint').textContent='Elige tus escaparates.'; action.textContent='Publicar mercancía';
    renderChoices();
    byId('dispatch').hidden=false;
    byId('shelves').replaceChildren();
    renderSolarSystem();
  } else if(mode==='select'){
    mode='done'; byId('targets').hidden=true; byId('phase').textContent='03 / PUBLICACIÓN';
    byId('seller-title').textContent='Del panel al escaparate'; byId('seller-hint').textContent='Una ficha. '+selected.size+' '+(selected.size===1?'destino.':'destinos.');
    showRoute(); byId('seller-status').textContent='Demostración de publicación completada.'; action.textContent='Volver a probar ↺';
    action.focus({preventScroll:true});
  } else {
    mode='upload'; selected.clear();initialChannels.forEach(index => selected.add(index));
    for(const id of ['dispatch','targets','product-sheet']) byId(id).hidden=true;
    byId('phase').textContent='01 / PRODUCTO';byId('seller-title').textContent='Nueva mercancía';
    byId('seller-hint').textContent='Prueba con esta chancla.';action.textContent='Subir mercancía';
    byId('seller-status').textContent='Simulación · Sin publicaciones reales';
  }
};
