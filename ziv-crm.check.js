
/* ============================================================
   ZIV CRM — almacenamiento local
   Leads en localStorage · Fotos en IndexedDB
   La landing (ziv-web-quest.html) escribe en la MISMA llave.
   ============================================================ */
const KEY = 'ziv_crm_v1';
const ETAPAS = [
  { id:'nuevo',      nm:'Nuevo',      c:'#57c7ff' },
  { id:'proceso',    nm:'En proceso', c:'#F5A800' },
  { id:'calificado', nm:'Calificado', c:'#a78bfa' },
  { id:'venta',      nm:'Venta ✅',   c:'#2EDC6E' },
  { id:'perdido',    nm:'Perdido',    c:'#6b6b85' }
];
const eInfo = id => ETAPAS.find(e => e.id === id) || ETAPAS[0];

const DEF = {
  leads: [],
  cfg: { pin:'1234', metaMensual:100000, ticket:15000, equipo:['Ismael'], wa:'5215539480470',
         metaAct:'', metaTok:'', metaPix:'', demoMeta:false }
};
let DB = load();
let metaCache = null;
let charts = {};
let cur = null;      // lead abierto
let curPics = [];    // fotos del lead abierto

function load(){
  try{
    const raw = JSON.parse(localStorage.getItem(KEY));
    if(!raw) return structuredClone(DEF);
    return { leads: raw.leads || [], cfg: Object.assign(structuredClone(DEF.cfg), raw.cfg || {}) };
  }catch(e){ return structuredClone(DEF); }
}
function save(){
  localStorage.setItem(KEY, JSON.stringify(DB));
  try{ bc.postMessage('sync'); }catch(e){}
}
const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('ziv_crm') : { postMessage(){} };
if('BroadcastChannel' in window){
  bc.onmessage = () => { DB = load(); renderAll(); };
}
window.addEventListener('storage', e => { if(e.key === KEY){ DB = load(); renderAll(); } });

/* ---------- IndexedDB para fotos ---------- */
let idb = null;
function openIDB(){
  return new Promise(res => {
    const rq = indexedDB.open('ziv-crm', 1);
    rq.onupgradeneeded = () => {
      const d = rq.result;
      if(!d.objectStoreNames.contains('fotos')){
        const s = d.createObjectStore('fotos', { keyPath:'id' });
        s.createIndex('leadId','leadId',{unique:false});
      }
    };
    rq.onsuccess = () => { idb = rq.result; res(idb); };
    rq.onerror = () => res(null);
  });
}
function picsOf(leadId){
  return new Promise(res => {
    if(!idb) return res([]);
    const tx = idb.transaction('fotos','readonly');
    const rq = tx.objectStore('fotos').index('leadId').getAll(leadId);
    rq.onsuccess = () => res(rq.result || []);
    rq.onerror = () => res([]);
  });
}
function picPut(p){ return new Promise(res => { const tx = idb.transaction('fotos','readwrite'); tx.objectStore('fotos').put(p); tx.oncomplete = res; }); }
function picDel(id){ return new Promise(res => { const tx = idb.transaction('fotos','readwrite'); tx.objectStore('fotos').delete(id); tx.oncomplete = res; }); }
function picsCount(){ return new Promise(res => { if(!idb) return res(0); const tx = idb.transaction('fotos','readonly'); const rq = tx.objectStore('fotos').count(); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(0); }); }

/* comprime la imagen antes de guardarla para no reventar el navegador */
function comprimir(file, max=1100, q=0.72){
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        let { width:w, height:h } = im;
        const sc = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * sc); h = Math.round(h * sc);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h);
        res(cv.toDataURL('image/jpeg', q));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* ---------- helpers ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const mny = n => '$' + Math.round(n||0).toLocaleString('es-MX');
const mnyK = n => n >= 1000000 ? '$'+(n/1000000).toFixed(1)+'M' : n >= 1000 ? '$'+Math.round(n/1000)+'k' : '$'+Math.round(n||0);
const ini = s => (s||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const fecha = d => new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});
const fechaH = d => new Date(d).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const esc = s => (s==null?'':String(s)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m){ const t = document.getElementById('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._x); t._x = setTimeout(()=>t.classList.remove('on'), 2600); }
function dias(){ const v = +document.getElementById('rango').value; return v; }
function enRango(l){
  const d = dias(); if(!d) return true;
  return (Date.now() - new Date(l.creado).getTime()) <= d*864e5;
}

/* score automático: qué tan caliente está el lead */
function score(l){
  let s = 20;
  if(l.whatsapp) s += 25;
  if(l.giro) s += 8;
  if(l.productos) s += 8;
  if(l.dominio && /s[ií]/i.test(l.dominio)) s += 12;
  if(l.logo && /s[ií]/i.test(l.logo)) s += 5;
  if(l.valor > 0) s += 10;
  if((l.actividad||[]).length > 1) s += 7;
  if((l.fotosN||0) > 0) s += 5;
  if(l.etapa === 'calificado') s += 10;
  if(l.etapa === 'venta') s = 100;
  if(l.etapa === 'perdido') s = 0;
  return Math.min(100, s);
}

/* ============================================================
   LOGIN
   ============================================================ */
const pinI = document.getElementById('pin');
pinI.addEventListener('input', () => {
  document.getElementById('pinErr').textContent = '';
  if(pinI.value.length >= String(DB.cfg.pin).length){
    if(pinI.value === String(DB.cfg.pin)) entrar();
    else if(pinI.value.length >= 4){ document.getElementById('pinErr').textContent = 'PIN incorrecto'; pinI.value=''; }
  }
});
pinI.addEventListener('keydown', e => { if(e.key==='Enter'){ if(pinI.value===String(DB.cfg.pin)) entrar(); else { document.getElementById('pinErr').textContent='PIN incorrecto'; pinI.value=''; } } });
async function entrar(){
  document.getElementById('lock').style.display = 'none';
  document.getElementById('shell').style.display = 'flex';
  sessionStorage.setItem('ziv_ok','1');
  await openIDB();
  await refrescarConteoFotos();
  renderAll();
}
function lockNow(){ sessionStorage.removeItem('ziv_ok'); location.reload(); }
if(sessionStorage.getItem('ziv_ok') === '1') entrar(); else pinI.focus();

/* ============================================================
   NAVEGACIÓN
   ============================================================ */
document.querySelectorAll('.nav').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  document.getElementById('p-' + b.dataset.p).classList.add('on');
  if(b.dataset.p === 'meta') renderMeta();
  if(b.dataset.p === 'cfg') renderCfg();
}));

/* ============================================================
   RENDER GLOBAL
   ============================================================ */
async function refrescarConteoFotos(){
  for(const l of DB.leads) l.fotosN = (await picsOf(l.id)).length;
}
function renderAll(){ renderDash(); renderBoard(); renderTable(); renderSide(); }

function renderSide(){
  const nuevos = DB.leads.filter(l=>l.etapa==='nuevo').length;
  const b = document.getElementById('bNuevo');
  b.style.display = nuevos ? 'inline-block' : 'none';
  b.textContent = nuevos;
  const ganado = DB.leads.filter(l=>l.etapa==='venta').reduce((s,l)=>s+(+l.valor||0),0);
  document.getElementById('sfStats').innerHTML =
    `<b style="color:var(--txt)">${DB.leads.length}</b> leads · <b style="color:var(--green)">${mnyK(ganado)}</b> ganados`;
}

/* ---------- DASHBOARD ---------- */
function renderDash(){
  const L = DB.leads.filter(enRango);
  const ventas = L.filter(l=>l.etapa==='venta');
  const ganado = ventas.reduce((s,l)=>s+(+l.valor||0),0);
  const abierto = L.filter(l=>['nuevo','proceso','calificado'].includes(l.etapa)).reduce((s,l)=>s+(+l.valor||0),0);
  const ticket = ventas.length ? ganado/ventas.length : 0;
  const conv = L.length ? (ventas.length/L.length*100) : 0;

  // mes actual (para meta y CPL)
  const ahora = new Date(), m0 = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
  const ventasMes = DB.leads.filter(l=>l.etapa==='venta' && new Date(l.cerradoEn||l.creado).getTime()>=m0);
  const ganadoMes = ventasMes.reduce((s,l)=>s+(+l.valor||0),0);
  const metaM = +DB.cfg.metaMensual || 0;
  const pct = metaM ? Math.min(100, ganadoMes/metaM*100) : 0;

  const inv = metaSpend();
  const leadsMeta = L.filter(l=>/meta|facebook|instagram|web quest/i.test(l.fuente||'')).length || L.length;
  const cpl = inv && leadsMeta ? inv/leadsMeta : 0;
  const roi = inv ? ((ganado - inv)/inv*100) : null;

  document.getElementById('dashSub').textContent =
    `${L.length} leads en el periodo · ${ventas.length} ventas cerradas · pipeline abierto por ${mny(abierto)}`;

  const kpi = (lab, val, foot, color) => `
    <div class="kpi" style="--accent:${color}">
      <div class="lab">${lab}</div>
      <div class="val" style="color:${color}">${val}</div>
      <div class="foot">${foot}</div>
    </div>`;

  document.getElementById('kpis').innerHTML =
    kpi('💰 Ventas cerradas', mny(ganado), `${ventas.length} proyectos ganados`, 'var(--green)') +
    kpi('🔥 Pipeline abierto', mny(abierto), `${L.filter(l=>['nuevo','proceso','calificado'].includes(l.etapa)).length} leads vivos`, 'var(--gold)') +
    kpi('🎫 Ticket promedio', mny(ticket), ticket ? `Estándar: ${mny(DB.cfg.ticket)}` : 'Aún sin ventas', 'var(--blue)') +
    kpi('📈 Tasa de conversión', conv.toFixed(1)+'%', `${ventas.length} de ${L.length} leads`, 'var(--purple)') +
    kpi('🎯 Costo por lead', cpl ? mny(cpl) : '—', inv ? `Inversión: ${mny(inv)}` : 'Conecta Meta Ads', 'var(--pink)') +
    kpi('⚡ ROI publicitario', roi===null ? '—' : (roi>0?'+':'')+roi.toFixed(0)+'%',
        roi===null ? 'Conecta Meta Ads' : (roi>0 ? `Ganas ${mny((ganado/inv)||0)} por cada ${mny(1)} invertido` : 'Por debajo del punto de equilibrio'),
        roi===null ? 'var(--mut)' : (roi>0 ? 'var(--green)':'var(--red)'));

  // meta del mes
  document.getElementById('metaSub').textContent = ahora.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  document.getElementById('metaVal').textContent = mny(ganadoMes);
  document.getElementById('metaVal').style.color = pct>=100 ? 'var(--green)' : 'var(--txt)';
  document.getElementById('metaBar').style.width = pct + '%';
  document.getElementById('metaTop').textContent = mnyK(metaM);
  document.getElementById('metaFalta').innerHTML = pct >= 100
    ? `<span style="color:var(--green);font-weight:700">🏆 ¡Meta superada! +${mny(ganadoMes-metaM)}</span>`
    : `Faltan <b style="color:var(--gold)">${mny(metaM-ganadoMes)}</b> · ${pct.toFixed(0)}% de la meta`;

  // embudo
  const orden = ['nuevo','proceso','calificado','venta'];
  const cont = orden.map(e => L.filter(l=>l.etapa===e).length);
  // acumulado: un lead en "venta" ya pasó por todas
  const acum = orden.map((_,i) => L.filter(l => orden.indexOf(l.etapa) >= i && l.etapa!=='perdido').length);
  const max = Math.max(...acum, 1);
  document.getElementById('funnel').innerHTML = orden.map((e,i)=>{
    const info = eInfo(e);
    const w = Math.max(6, acum[i]/max*100);
    const cv = i===0 ? '100%' : (acum[i-1] ? (acum[i]/acum[i-1]*100).toFixed(0)+'%' : '0%');
    return `<div class="fstep">
      <div class="nm">${info.nm}</div>
      <div class="track"><div class="fill" style="width:${w}%;background:${info.c}">${acum[i]}</div></div>
      <div class="cv">${cv}</div>
    </div>`;
  }).join('');

  // top fuentes
  const srcs = {};
  L.forEach(l => { const f = l.fuente || 'Sin fuente'; srcs[f] = (srcs[f]||0)+1; });
  const top = Object.entries(srcs).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const mx = Math.max(1, ...top.map(t=>t[1]));
  document.getElementById('rankSrc').innerHTML = top.length ? top.map(([f,n])=>`
    <div class="r"><span style="width:104px;font-size:12px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f)}</span>
    <span class="bar2"><i style="width:${n/mx*100}%"></i></span><span class="v">${n}</span></div>`).join('')
    : '<div style="color:var(--mut2);font-size:12px">Sin datos aún</div>';

  // feed
  const ev = [];
  DB.leads.forEach(l => (l.actividad||[]).forEach(a => ev.push({...a, neg:l.negocio, id:l.id})));
  ev.sort((a,b)=> new Date(b.fecha) - new Date(a.fecha));
  document.getElementById('feed').innerHTML = ev.slice(0,8).map(a=>`
    <li><div class="t"><b style="cursor:pointer" onclick="openLead('${a.id}')">${esc(a.neg)}</b> — ${esc(a.texto)}</div>
    <div class="d">${fechaH(a.fecha)}${a.por?' · '+esc(a.por):''}</div></li>`).join('')
    || '<li><div class="t" style="color:var(--mut2)">Todavía no hay actividad registrada</div></li>';

  chartVentas();
}

function chartVentas(){
  const meses = [], data = [];
  const now = new Date();
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    meses.push(d.toLocaleDateString('es-MX',{month:'short'}));
    const a = d.getTime(), b = new Date(now.getFullYear(), now.getMonth()-i+1, 1).getTime();
    data.push(DB.leads.filter(l=>{
      if(l.etapa!=='venta') return false;
      const t = new Date(l.cerradoEn||l.creado).getTime();
      return t>=a && t<b;
    }).reduce((s,l)=>s+(+l.valor||0),0));
  }
  const cv = document.getElementById('chVentas');
  charts.v?.destroy();
  charts.v = new Chart(cv, {
    type:'bar',
    data:{ labels:meses, datasets:[{
      data, backgroundColor:'rgba(46,220,110,.55)', hoverBackgroundColor:'#2EDC6E',
      borderRadius:7, borderSkipped:false, barPercentage:.6
    }]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: c => mny(c.parsed.y) } } },
      scales:{
        x:{ grid:{display:false}, ticks:{ color:'#8b8ba7', font:{size:11} }, border:{color:'#26263a'} },
        y:{ grid:{color:'#1c1c27'}, border:{display:false}, ticks:{ color:'#8b8ba7', font:{size:11}, callback:v=>mnyK(v) } }
      }
    }
  });
}

/* ---------- PIPELINE ---------- */
function renderBoard(){
  const q = (document.getElementById('pipeQ').value||'').toLowerCase();
  const b = document.getElementById('board');
  b.innerHTML = ETAPAS.map(e => {
    const ls = DB.leads
      .filter(l => l.etapa === e.id)
      .filter(l => !q || (l.negocio+' '+(l.giro||'')+' '+(l.contacto||'')).toLowerCase().includes(q))
      .sort((x,y)=> new Date(y.creado) - new Date(x.creado));
    const tot = ls.reduce((s,l)=>s+(+l.valor||0),0);
    return `<div class="col" data-e="${e.id}">
      <div class="col-h" style="flex-wrap:wrap">
        <span class="dot" style="background:${e.c}"></span>
        <b>${e.nm}</b><span class="n">${ls.length}</span>
        <span class="mny">${mny(tot)}</span>
      </div>
      <div class="drops">
        ${ls.map(cardHTML).join('') || '<div class="empty">Sin leads aquí</div>'}
      </div>
    </div>`;
  }).join('');
  wireDrag();
}
function cardHTML(l){
  const e = eInfo(l.etapa);
  const sc = score(l);
  return `<div class="lead" draggable="true" data-id="${l.id}" style="--c:${e.c}" onclick="openLead('${l.id}')">
    <div class="nm">${esc(l.negocio||'Sin nombre')}</div>
    <div class="gi">${esc(l.giro || l.contacto || 'Sin giro')}</div>
    <div class="row">
      ${+l.valor ? `<span class="pill money">${mny(l.valor)}</span>` : ''}
      <span class="pill src">${esc((l.fuente||'—').slice(0,14))}</span>
      ${l.fotosN ? `<span class="pill pic">📸 ${l.fotosN}</span>` : ''}
      <span class="pill" title="Score del lead" style="color:${sc>70?'var(--green)':sc>40?'var(--gold)':'var(--mut)'}">🔥${sc}</span>
      <span class="who" title="${esc(l.responsable||'')}">${ini(l.responsable)}</span>
    </div>
  </div>`;
}
function wireDrag(){
  let dragId = null;
  document.querySelectorAll('.lead').forEach(c => {
    c.addEventListener('dragstart', e => { dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.effectAllowed='move'; });
    c.addEventListener('dragend', () => { c.classList.remove('drag'); document.querySelectorAll('.col').forEach(x=>x.classList.remove('over')); });
  });
  document.querySelectorAll('.col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', e => {
      e.preventDefault(); col.classList.remove('over');
      if(!dragId) return;
      mover(dragId, col.dataset.e);
      dragId = null;
    });
  });
}
function mover(id, etapa){
  const l = DB.leads.find(x=>x.id===id);
  if(!l || l.etapa === etapa) return;
  const antes = eInfo(l.etapa).nm;
  l.etapa = etapa;
  if(etapa === 'venta'){
    l.cerradoEn = new Date().toISOString();
    if(!+l.valor){ l.valor = +DB.cfg.ticket || 0; }
  }
  (l.actividad = l.actividad||[]).unshift({
    fecha:new Date().toISOString(), texto:`Movido de ${antes} a ${eInfo(etapa).nm}`, por:l.responsable||''
  });
  save(); renderAll();
  toast(etapa==='venta' ? `🎉 ¡Venta cerrada! ${l.negocio} · ${mny(l.valor)}` : `${l.negocio} → ${eInfo(etapa).nm}`);
}
document.getElementById('pipeQ').addEventListener('input', renderBoard);

/* ---------- TABLA ---------- */
function fillSelects(){
  const fe = document.getElementById('fEtapa');
  fe.innerHTML = '<option value="">Todas las etapas</option>' + ETAPAS.map(e=>`<option value="${e.id}">${e.nm}</option>`).join('');
  const fs = new Set(DB.leads.map(l=>l.fuente).filter(Boolean));
  document.getElementById('fFuente').innerHTML = '<option value="">Todas las fuentes</option>' + [...fs].map(f=>`<option>${esc(f)}</option>`).join('');
  const r = document.getElementById('lResp');
  r.innerHTML = (DB.cfg.equipo||['Ismael']).map(n=>`<option>${esc(n)}</option>`).join('');
}
function renderTable(){
  fillSelects();
  const q  = (document.getElementById('q').value||'').toLowerCase();
  const fe = document.getElementById('fEtapa').value;
  const ff = document.getElementById('fFuente').value;
  const or = document.getElementById('fOrden').value;
  let L = DB.leads.slice();
  if(q)  L = L.filter(l => (l.negocio+' '+(l.whatsapp||'')+' '+(l.giro||'')+' '+(l.contacto||'')).toLowerCase().includes(q));
  if(fe) L = L.filter(l => l.etapa === fe);
  if(ff) L = L.filter(l => l.fuente === ff);
  if(or==='valor') L.sort((a,b)=>(+b.valor||0)-(+a.valor||0));
  else if(or==='score') L.sort((a,b)=>score(b)-score(a));
  else L.sort((a,b)=> new Date(b.creado)-new Date(a.creado));

  document.getElementById('leadsSub').textContent =
    `${L.length} de ${DB.leads.length} leads · valor total ${mny(L.reduce((s,l)=>s+(+l.valor||0),0))}`;

  document.getElementById('tbody').innerHTML = L.map(l=>{
    const e = eInfo(l.etapa);
    return `<tr onclick="openLead('${l.id}')">
      <td><b>${esc(l.negocio||'Sin nombre')}</b><div style="color:var(--mut2);font-size:11.5px">${esc(l.giro||'')}</div></td>
      <td>${l.whatsapp ? `<span style="color:var(--blue)">${esc(l.whatsapp)}</span>` : '<span style="color:var(--mut2)">—</span>'}<div style="color:var(--mut2);font-size:11.5px">${esc(l.contacto||'')}</div></td>
      <td><span class="tag" style="background:${e.c}22;color:${e.c}">● ${e.nm}</span></td>
      <td>${+l.valor ? `<b style="color:var(--green)">${mny(l.valor)}</b>` : '<span style="color:var(--mut2)">—</span>'}</td>
      <td style="color:var(--mut)">${esc(l.fuente||'—')}</td>
      <td><span class="who" style="width:24px;height:24px;display:inline-grid">${ini(l.responsable)}</span></td>
      <td>${l.fotosN ? `<span class="pill pic">📸 ${l.fotosN}</span>` : '<span style="color:var(--mut2)">—</span>'}</td>
      <td style="color:var(--mut2)">${fecha(l.creado)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--mut2);padding:34px">Sin leads. Crea uno o carga la demo desde Ajustes.</td></tr>';
}
['q','fEtapa','fFuente','fOrden'].forEach(id => document.getElementById(id).addEventListener('input', renderTable));
document.getElementById('rango').addEventListener('change', renderDash);

/* ============================================================
   MODAL LEAD
   ============================================================ */
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', ()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.pane').forEach(x=>x.classList.remove('on'));
  t.classList.add('on');
  document.getElementById('pane-'+t.dataset.t).classList.add('on');
}));

async function openLead(id){
  fillSelects();
  cur = id ? DB.leads.find(l=>l.id===id) : {
    id:uid(), creado:new Date().toISOString(), etapa:'nuevo', negocio:'', valor:'',
    responsable:(DB.cfg.equipo||['Ismael'])[0], fuente:'WhatsApp directo', actividad:[]
  };
  if(!cur) return;
  const nuevo = !id;
  document.getElementById('mTitle').textContent = nuevo ? 'Nuevo lead' : (cur.negocio || 'Lead');
  document.getElementById('mMeta').innerHTML = nuevo ? 'Alta manual' :
    `Alta: ${fechaH(cur.creado)} · Score <b style="color:var(--gold)">${score(cur)}/100</b>${cur.campania?' · '+esc(cur.campania):''}`;
  document.getElementById('mDel').style.display = nuevo ? 'none' : 'inline-flex';

  ['lNegocio','lContacto','lWA','lGiro','lProd','lValor','lCamp','lNotas'].forEach(x=>{});
  document.getElementById('lNegocio').value  = cur.negocio || '';
  document.getElementById('lContacto').value = cur.contacto || '';
  document.getElementById('lWA').value       = cur.whatsapp || '';
  document.getElementById('lGiro').value     = cur.giro || '';
  document.getElementById('lProd').value     = cur.productos || '';
  document.getElementById('lValor').value    = cur.valor || '';
  document.getElementById('lCamp').value     = cur.campania || '';
  document.getElementById('lNotas').value    = cur.notas || '';
  const fs = document.getElementById('lFuente');
  if(cur.fuente && ![...fs.options].some(o=>o.value===cur.fuente)) fs.add(new Option(cur.fuente, cur.fuente));
  fs.value = cur.fuente || 'WhatsApp directo';
  const rs = document.getElementById('lResp');
  if(cur.responsable && ![...rs.options].some(o=>o.value===cur.responsable)) rs.add(new Option(cur.responsable, cur.responsable));
  rs.value = cur.responsable || (DB.cfg.equipo||['Ismael'])[0];

  document.getElementById('stagePick').innerHTML = ETAPAS.map(e=>
    `<button class="sp ${cur.etapa===e.id?'on':''}" data-e="${e.id}" style="${cur.etapa===e.id?`background:${e.c}`:''}">${e.nm}</button>`).join('');
  document.querySelectorAll('.sp').forEach(b => b.addEventListener('click', ()=>{
    cur.etapa = b.dataset.e;
    document.querySelectorAll('.sp').forEach(x=>{ x.classList.remove('on'); x.style.background=''; });
    b.classList.add('on'); b.style.background = eInfo(cur.etapa).c;
  }));

  renderTL();
  await renderPics();
  document.querySelector('.tab').click();
  document.getElementById('mask').classList.add('on');
}
function closeLead(){ document.getElementById('mask').classList.remove('on'); cur = null; }
document.getElementById('mask').addEventListener('click', e => { if(e.target.id==='mask') closeLead(); });

function renderTL(){
  document.getElementById('tl').innerHTML = (cur.actividad||[]).map(a=>
    `<li><div class="t">${esc(a.texto)}</div><div class="d">${fechaH(a.fecha)}${a.por?' · '+esc(a.por):''}</div></li>`
  ).join('') || '<li><div class="t" style="color:var(--mut2)">Sin actividad. Registra el primer avance.</div></li>';
}
document.getElementById('actAdd').addEventListener('click', ()=>{
  const t = document.getElementById('actTxt').value.trim();
  if(!t || !cur) return;
  (cur.actividad = cur.actividad||[]).unshift({ fecha:new Date().toISOString(), texto:t, por:document.getElementById('lResp').value });
  document.getElementById('actTxt').value = '';
  renderTL();
  toast('Avance registrado');
});
document.getElementById('actTxt').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('actAdd').click(); });

document.getElementById('mSave').addEventListener('click', async ()=>{
  const neg = document.getElementById('lNegocio').value.trim();
  if(!neg) return toast('⚠️ Ponle nombre al negocio');
  const eraVenta = cur.etapa === 'venta' && cur.cerradoEn;
  Object.assign(cur, {
    negocio:neg,
    contacto:document.getElementById('lContacto').value.trim(),
    whatsapp:document.getElementById('lWA').value.trim(),
    giro:document.getElementById('lGiro').value.trim(),
    productos:document.getElementById('lProd').value.trim(),
    valor:+document.getElementById('lValor').value || 0,
    responsable:document.getElementById('lResp').value,
    fuente:document.getElementById('lFuente').value,
    campania:document.getElementById('lCamp').value.trim(),
    notas:document.getElementById('lNotas').value.trim()
  });
  if(cur.etapa==='venta' && !eraVenta) cur.cerradoEn = new Date().toISOString();
  if(!DB.leads.find(l=>l.id===cur.id)){
    (cur.actividad = cur.actividad||[]).push({ fecha:new Date().toISOString(), texto:'Lead dado de alta', por:cur.responsable });
    DB.leads.unshift(cur);
  }
  cur.fotosN = (await picsOf(cur.id)).length;
  save(); renderAll(); closeLead();
  toast('✅ Lead guardado');
});
document.getElementById('mDel').addEventListener('click', async ()=>{
  if(!confirm('¿Eliminar este lead y su evidencia? No se puede deshacer.')) return;
  for(const p of await picsOf(cur.id)) await picDel(p.id);
  DB.leads = DB.leads.filter(l=>l.id!==cur.id);
  save(); renderAll(); closeLead(); toast('Lead eliminado');
});
document.getElementById('mWA').addEventListener('click', ()=>{
  const n = (document.getElementById('lWA').value||'').replace(/\D/g,'');
  if(!n) return toast('⚠️ Este lead no tiene WhatsApp');
  const num = n.length===10 ? '52'+n : n;
  const msg = `Hola ${document.getElementById('lContacto').value || ''}! Te escribe Ziv Creativo sobre ${document.getElementById('lNegocio').value}.`;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`,'_blank');
});

/* ---------- FOTOS ---------- */
const drop = document.getElementById('drop'), picFile = document.getElementById('picFile');
drop.addEventListener('click', ()=>picFile.click());
drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', ()=>drop.classList.remove('over'));
drop.addEventListener('drop', e=>{ e.preventDefault(); drop.classList.remove('over'); subirFotos(e.dataTransfer.files); });
picFile.addEventListener('change', ()=>subirFotos(picFile.files));

async function subirFotos(files){
  if(!cur) return;
  const list = [...files].filter(f=>f.type.startsWith('image/'));
  if(!list.length) return;
  toast(`Subiendo ${list.length} foto(s)...`);
  for(const f of list){
    const data = await comprimir(f);
    await picPut({ id:uid(), leadId:cur.id, data, nombre:f.name, fecha:new Date().toISOString() });
  }
  (cur.actividad = cur.actividad||[]).unshift({
    fecha:new Date().toISOString(),
    texto:`📸 Se subió evidencia (${list.length} foto${list.length>1?'s':''})`,
    por:document.getElementById('lResp').value
  });
  cur.fotosN = (await picsOf(cur.id)).length;
  if(DB.leads.find(l=>l.id===cur.id)) save();
  renderTL(); await renderPics(); renderAll();
  toast('📸 Evidencia guardada');
  picFile.value = '';
}
async function renderPics(){
  curPics = await picsOf(cur.id);
  curPics.sort((a,b)=> new Date(b.fecha)-new Date(a.fecha));
  document.getElementById('pics').innerHTML = curPics.map(p=>`
    <div class="pic">
      <img src="${p.data}" alt="${esc(p.nombre)}" onclick="verFoto('${p.id}')">
      <div class="cap">${fecha(p.fecha)}<br>${esc((p.nombre||'').slice(0,20))}</div>
      <button class="del" onclick="event.stopPropagation();borrarFoto('${p.id}')">×</button>
    </div>`).join('');
}
function verFoto(id){
  const p = curPics.find(x=>x.id===id); if(!p) return;
  document.getElementById('lbImg').src = p.data;
  document.getElementById('lb').classList.add('on');
}
async function borrarFoto(id){
  await picDel(id);
  cur.fotosN = (await picsOf(cur.id)).length;
  if(DB.leads.find(l=>l.id===cur.id)) save();
  await renderPics(); renderAll();
}

/* ============================================================
   META ADS
   ============================================================ */
function metaSpend(){ return metaCache ? metaCache.total.spend : 0; }

const DEMO_META = {
  total:{ spend:18420, impressions:412300, clicks:6840, leads:63 },
  campanas:[
    { nombre:'Web Quest · Prospección CDMX', estado:'ACTIVE',  spend:8240, impressions:198400, clicks:3320, leads:31 },
    { nombre:'Remarketing · Visitó y no llenó', estado:'ACTIVE',  spend:4180, impressions:84200,  clicks:2140, leads:19 },
    { nombre:'Lookalike 1% compradores',        estado:'ACTIVE',  spend:3900, impressions:96700,  clicks:980,  leads:9  },
    { nombre:'Branding · Reels',                estado:'PAUSED',  spend:2100, impressions:33000,  clicks:400,  leads:4  }
  ]
};

async function metaFetch(){
  const cfg = DB.cfg;
  if(cfg.demoMeta){ metaCache = structuredClone(DEMO_META); return { ok:true, demo:true }; }
  if(!cfg.metaAct || !cfg.metaTok) return { ok:false, msg:'Falta configurar la cuenta y el token de Meta.' };
  const act = cfg.metaAct.startsWith('act_') ? cfg.metaAct : 'act_' + cfg.metaAct.replace(/\D/g,'');
  const preset = document.getElementById('metaRange').value;
  const fields = 'campaign_name,spend,impressions,clicks,ctr,cpc,actions';
  const url = `https://graph.facebook.com/v21.0/${act}/insights?level=campaign&date_preset=${preset}`
            + `&fields=${fields}&limit=100&access_token=${encodeURIComponent(cfg.metaTok)}`;
  try{
    const r = await fetch(url);
    const j = await r.json();
    if(j.error) return { ok:false, msg:'Meta respondió: ' + j.error.message };
    const camp = (j.data||[]).map(d=>{
      const lead = (d.actions||[]).find(a=>/lead/i.test(a.action_type));
      return {
        nombre: d.campaign_name || 'Campaña',
        estado: 'ACTIVE',
        spend: +d.spend || 0,
        impressions: +d.impressions || 0,
        clicks: +d.clicks || 0,
        leads: lead ? +lead.value : 0
      };
    });
    metaCache = {
      campanas: camp,
      total: camp.reduce((t,c)=>({
        spend:t.spend+c.spend, impressions:t.impressions+c.impressions,
        clicks:t.clicks+c.clicks, leads:t.leads+c.leads
      }), {spend:0,impressions:0,clicks:0,leads:0})
    };
    return { ok:true };
  }catch(e){
    return { ok:false, msg:'No se pudo conectar con Meta. Revisa el token o tu conexión.' };
  }
}

async function renderMeta(){
  document.getElementById('mAct').value = DB.cfg.metaAct || '';
  document.getElementById('mTok').value = DB.cfg.metaTok || '';
  document.getElementById('mPix').value = DB.cfg.metaPix || '';

  const r = await metaFetch();
  const warn = document.getElementById('metaWarn');
  warn.innerHTML = !r.ok
    ? `<div class="note" style="border-left-color:var(--gold);margin-bottom:16px">⚠️ <b>Sin datos en vivo.</b> ${esc(r.msg)} Configura la conexión abajo o pulsa <b>“Usar datos de demostración”</b> para ver cómo se verá el panel.</div>`
    : (r.demo ? `<div class="note" style="border-left-color:var(--purple);margin-bottom:16px">🎲 <b>Modo demostración.</b> Estos números son de ejemplo. Conecta tu cuenta real abajo para ver tus campañas.</div>` : '');

  if(!metaCache){
    document.getElementById('metaKpis').innerHTML = '';
    document.getElementById('metaTbody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--mut2);padding:34px">Sin datos de Meta</td></tr>';
    document.getElementById('roiBox').innerHTML = '<div style="color:var(--mut2);font-size:13px">Conecta Meta para calcular el retorno.</div>';
    charts.m?.destroy(); charts.m = null;
    return;
  }

  const t = metaCache.total;
  const ctr = t.impressions ? t.clicks/t.impressions*100 : 0;
  const cpc = t.clicks ? t.spend/t.clicks : 0;
  const cpl = t.leads ? t.spend/t.leads : 0;

  // ventas atribuibles a publicidad
  const ventasAds = DB.leads.filter(l => l.etapa==='venta' && /meta|facebook|instagram|web quest|ads/i.test(l.fuente||''));
  const ingreso = ventasAds.reduce((s,l)=>s+(+l.valor||0),0);
  const roas = t.spend ? ingreso/t.spend : 0;
  const ingresoPorLead = t.leads ? ingreso/t.leads : 0;

  const kpi = (lab,val,foot,color)=>`<div class="kpi" style="--accent:${color}"><div class="lab">${lab}</div><div class="val" style="color:${color}">${val}</div><div class="foot">${foot}</div></div>`;
  document.getElementById('metaKpis').innerHTML =
    kpi('💸 Inversión', mny(t.spend), `${metaCache.campanas.length} campañas`, 'var(--red)') +
    kpi('👁 Impresiones', t.impressions.toLocaleString('es-MX'), `${t.clicks.toLocaleString('es-MX')} clics · CTR ${ctr.toFixed(2)}%`, 'var(--blue)') +
    kpi('🧲 Leads de Meta', t.leads, `CPC ${mny(cpc)}`, 'var(--gold)') +
    kpi('🎯 Costo por lead', cpl ? mny(cpl) : '—', 'Lo que te cuesta cada prospecto', 'var(--pink)') +
    kpi('💰 Ingreso atribuido', mny(ingreso), `${ventasAds.length} ventas de publicidad`, 'var(--green)') +
    kpi('⚡ ROAS', roas ? roas.toFixed(2)+'x' : '—',
        roas>=1 ? `Recuperas ${mny(roas)} por cada peso` : 'Aún no recuperas la inversión',
        roas>=1 ? 'var(--green)' : 'var(--red)');

  // ROI box
  const util = ingreso - t.spend;
  document.getElementById('roiBox').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--mut)">Inversión en Meta</span><b style="color:var(--red)">− ${mny(t.spend)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--mut)">Ventas cerradas de esos leads</span><b style="color:var(--green)">+ ${mny(ingreso)}</b></div>
      <div style="border-top:1px solid var(--line);padding-top:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;font-weight:700">Utilidad</span>
        <b style="font-size:24px;letter-spacing:-.6px;color:${util>=0?'var(--green)':'var(--red)'}">${util>=0?'+':'−'}${mny(Math.abs(util))}</b>
      </div>
      <div class="bar"><i style="width:${Math.min(100, roas*50)}%;background:${roas>=1?'linear-gradient(90deg,#F5A800,#2EDC6E)':'var(--red)'}"></i></div>
      <div style="font-size:11.5px;color:var(--mut);line-height:1.6">
        ${roas>=2 ? '🚀 Campaña rentable. Considera subir presupuesto en la campaña con menor CPL.'
          : roas>=1 ? '🟡 Estás en verde pero apretado. Optimiza creativos y mejora el seguimiento a leads en “Proceso”.'
          : t.spend ? '🔴 Estás perdiendo dinero. Revisa segmentación y velocidad de respuesta: los leads se enfrían en horas.'
          : 'Sin inversión registrada.'}
      </div>
    </div>`;

  // tabla
  document.getElementById('metaTbody').innerHTML = metaCache.campanas
    .sort((a,b)=>b.spend-a.spend)
    .map(c=>{
      const ct = c.impressions ? c.clicks/c.impressions*100 : 0;
      const cl = c.leads ? c.spend/c.leads : 0;
      const buena = cl && cpl && cl < cpl;
      return `<tr>
        <td><b>${esc(c.nombre)}</b></td>
        <td><span class="tag" style="background:${c.estado==='ACTIVE'?'rgba(46,220,110,.13)':'rgba(107,107,133,.15)'};color:${c.estado==='ACTIVE'?'var(--green)':'var(--mut)'}">● ${c.estado==='ACTIVE'?'Activa':'Pausada'}</span></td>
        <td><b>${mny(c.spend)}</b></td>
        <td style="color:var(--mut)">${c.impressions.toLocaleString('es-MX')}</td>
        <td style="color:var(--mut)">${c.clicks.toLocaleString('es-MX')}</td>
        <td style="color:var(--mut)">${ct.toFixed(2)}%</td>
        <td><b>${c.leads}</b></td>
        <td><b style="color:${buena?'var(--green)':'var(--gold)'}">${cl?mny(cl):'—'}</b></td>
      </tr>`;
    }).join('');

  // chart CPL vs ingreso por lead
  charts.m?.destroy();
  charts.m = new Chart(document.getElementById('chMeta'), {
    type:'bar',
    data:{
      labels: metaCache.campanas.map(c=>c.nombre.length>18 ? c.nombre.slice(0,18)+'…' : c.nombre),
      datasets:[
        { label:'Costo por lead', data: metaCache.campanas.map(c=>c.leads? c.spend/c.leads : 0),
          backgroundColor:'rgba(239,59,54,.6)', borderRadius:6, barPercentage:.8 },
        { label:'Ingreso por lead', data: metaCache.campanas.map(()=>ingresoPorLead),
          backgroundColor:'rgba(46,220,110,.6)', borderRadius:6, barPercentage:.8 }
      ]
    },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:'#8b8ba7', font:{size:11}, boxWidth:12 } },
                tooltip:{ callbacks:{ label: c => c.dataset.label+': '+mny(c.parsed.y) } } },
      scales:{
        x:{ grid:{display:false}, ticks:{ color:'#8b8ba7', font:{size:10} }, border:{color:'#26263a'} },
        y:{ grid:{color:'#1c1c27'}, border:{display:false}, ticks:{ color:'#8b8ba7', font:{size:11}, callback:v=>mnyK(v) } }
      }
    }
  });
  renderDash();
}
document.getElementById('metaSave').addEventListener('click', async ()=>{
  DB.cfg.metaAct = document.getElementById('mAct').value.trim();
  DB.cfg.metaTok = document.getElementById('mTok').value.trim();
  DB.cfg.metaPix = document.getElementById('mPix').value.trim();
  DB.cfg.demoMeta = false;
  save(); toast('🔌 Conexión guardada');
  await renderMeta();
});
document.getElementById('metaDemo').addEventListener('click', async ()=>{
  DB.cfg.demoMeta = true; save(); await renderMeta(); toast('🎲 Modo demostración activo');
});
document.getElementById('metaSync').addEventListener('click', async ()=>{ toast('Sincronizando con Meta...'); await renderMeta(); });
document.getElementById('metaRange').addEventListener('change', renderMeta);

/* ============================================================
   AJUSTES / DATOS
   ============================================================ */
async function renderCfg(){
  document.getElementById('cMeta').value   = DB.cfg.metaMensual;
  document.getElementById('cTicket').value = DB.cfg.ticket;
  document.getElementById('cTeam').value   = (DB.cfg.equipo||[]).join(', ');
  document.getElementById('cWA').value     = DB.cfg.wa;
  document.getElementById('cPin').value    = DB.cfg.pin;
  const nf = await picsCount();
  const kb = Math.round((localStorage.getItem(KEY)||'').length/1024);
  document.getElementById('dataStats').innerHTML =
    `📇 <b style="color:var(--txt)">${DB.leads.length}</b> leads<br>
     📸 <b style="color:var(--txt)">${nf}</b> fotos de evidencia<br>
     💾 <b style="color:var(--txt)">${kb} KB</b> en localStorage<br>
     🕐 Último respaldo: <b style="color:var(--txt)">${DB.cfg.backup ? fechaH(DB.cfg.backup) : 'nunca'}</b>`;
}
document.getElementById('cfgSave').addEventListener('click', ()=>{
  DB.cfg.metaMensual = +document.getElementById('cMeta').value || 0;
  DB.cfg.ticket      = +document.getElementById('cTicket').value || 0;
  DB.cfg.equipo      = document.getElementById('cTeam').value.split(',').map(s=>s.trim()).filter(Boolean);
  DB.cfg.wa          = document.getElementById('cWA').value.trim();
  DB.cfg.pin         = document.getElementById('cPin').value.trim() || '1234';
  if(!DB.cfg.equipo.length) DB.cfg.equipo = ['Ismael'];
  save(); renderAll(); renderCfg(); toast('⚙️ Ajustes guardados');
});

function exportJSON(){
  DB.cfg.backup = new Date().toISOString(); save();
  const blob = new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ziv-crm-respaldo-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); toast('💾 Respaldo descargado');
}
function exportCSV(){
  const cols = ['negocio','contacto','whatsapp','giro','productos','etapa','valor','fuente','campania','responsable','creado','cerradoEn','notas'];
  const rows = [cols.join(',')].concat(DB.leads.map(l =>
    cols.map(c => `"${String(l[c]??'').replace(/"/g,'""')}"`).join(',')));
  const blob = new Blob(['﻿'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ziv-leads-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); toast('⬇ CSV descargado');
}
document.getElementById('impFile').addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const j = JSON.parse(fr.result);
      const nuevos = (j.leads||[]).filter(l => !DB.leads.some(x=>x.id===l.id));
      DB.leads = DB.leads.concat(nuevos);
      if(j.cfg) DB.cfg = Object.assign(DB.cfg, j.cfg);
      save(); renderAll(); toast(`📥 ${nuevos.length} leads importados`);
    }catch(err){ toast('⚠️ Archivo inválido'); }
  };
  fr.readAsText(f);
  e.target.value = '';
});
function wipe(){
  if(!confirm('¿Borrar TODOS los leads y fotos? Descarga un respaldo antes.')) return;
  localStorage.removeItem(KEY);
  indexedDB.deleteDatabase('ziv-crm');
  location.reload();
}
function seedDemo(){
  const hoy = Date.now();
  const d = n => new Date(hoy - n*864e5).toISOString();
  const demo = [
    { negocio:'Taquería El Pixel', contacto:'Don Beto', whatsapp:'5539480470', giro:'Comida mexicana', productos:'Tacos, banquetes, envíos', etapa:'venta', valor:18000, fuente:'Super Web Quest', campania:'Web Quest · Prospección CDMX', responsable:'Ismael', creado:d(24), cerradoEn:d(9), notas:'Cerró paquete web + logo.' },
    { negocio:'Dental Sonrisa', contacto:'Dra. Karla', whatsapp:'5511223344', giro:'Consultorio dental', productos:'Ortodoncia, limpieza', etapa:'venta', valor:26000, fuente:'Meta Ads', campania:'Remarketing · Visitó y no llenó', responsable:'Ismael', creado:d(31), cerradoEn:d(4), notas:'Pagó 50% de anticipo.' },
    { negocio:'Gym Titan', contacto:'Marco', whatsapp:'5566778899', giro:'Gimnasio', productos:'Mensualidades, clases', etapa:'calificado', valor:22000, fuente:'Meta Ads', campania:'Lookalike 1% compradores', responsable:'Ismael', creado:d(6), notas:'Pidió propuesta formal el viernes.' },
    { negocio:'Boutique Luna', contacto:'Ana', whatsapp:'5544332211', giro:'Ropa de mujer', productos:'Vestidos, accesorios', etapa:'calificado', valor:15000, fuente:'Instagram', responsable:'Ismael', creado:d(11), notas:'Quiere tienda en línea.' },
    { negocio:'Cafetería Origen', contacto:'Sergio', whatsapp:'5522113344', giro:'Cafetería', productos:'Café de especialidad', etapa:'proceso', valor:12000, fuente:'Super Web Quest', campania:'Web Quest · Prospección CDMX', responsable:'Ismael', creado:d(3), notas:'Le mandamos mockup, lo está viendo.' },
    { negocio:'Autolavado Express', contacto:'Rubén', whatsapp:'5599887766', giro:'Autolavado', productos:'Lavado, encerado', etapa:'proceso', valor:9000, fuente:'Meta Ads', campania:'Branding · Reels', responsable:'Ismael', creado:d(8) },
    { negocio:'Estética Bella', contacto:'Paola', whatsapp:'5512345678', giro:'Estética', productos:'Corte, color, uñas', etapa:'nuevo', valor:0, fuente:'Super Web Quest', campania:'Web Quest · Prospección CDMX', responsable:'Ismael', creado:d(1) },
    { negocio:'Ferretería Don Chuy', contacto:'Jesús', whatsapp:'5587654321', giro:'Ferretería', productos:'Herramienta, material', etapa:'nuevo', valor:0, fuente:'Meta Ads', responsable:'Ismael', creado:d(0) },
    { negocio:'Pizzería Nonna', contacto:'Luca', whatsapp:'5533445566', giro:'Pizzería', productos:'Pizza artesanal', etapa:'perdido', valor:0, fuente:'Referido', responsable:'Ismael', creado:d(19), notas:'Se fue con un primo que "sabe de páginas".' }
  ].map(l => ({
    ...l, id:uid(),
    actividad:[{ fecha:l.cerradoEn||l.creado, texto:l.etapa==='venta'?'🎉 Venta cerrada':'Lead dado de alta', por:'Ismael' }]
  }));
  DB.leads = demo.concat(DB.leads);
  DB.cfg.demoMeta = true;
  save(); renderAll(); renderCfg();
  toast('🎲 Demo cargada: 9 leads + datos de Meta');
}

/* arranque */
renderAll();
