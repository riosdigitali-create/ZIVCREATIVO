/* ============================================================
   ZIV WEB QUEST · MUNDO ÚNICO: PÁGINAS WEB
   CONFIGURA AQUÍ 👇
   ============================================================ */
const CONFIG = {
  whatsappNumber: "5215539480470",
  // 👇 Los leads caen SOLOS en ziv-crm.html (mismo navegador, misma carpeta).
  crmLocal: true,
  // 👇 Opcional: si algún día quieres además mandarlos a un backend/Make, pon la URL aquí.
  crmWebhook: "",
  // 👇 Opcional: Pixel de Meta. Si lo dejas vacío, se toma el que guardes en el CRM (Ajustes → Meta Ads).
  metaPixel: "",
  // ✏️ PRUEBA SOCIAL — edita con TUS datos reales:
  socialProof: "★★★★★ Negocios reales ya subieron de nivel con Ziv"
};

/* ============================================================
   ATRIBUCIÓN — de qué anuncio/campaña vino este lead.
   Sin esto es imposible calcular costo por lead y ROI reales.
   ============================================================ */
const ATTR = (() => {
  const p = new URLSearchParams(location.search);
  const g = k => p.get(k) || "";
  const a = {
    utm_source:   g("utm_source"),
    utm_medium:   g("utm_medium"),
    utm_campaign: g("utm_campaign"),
    utm_content:  g("utm_content"),
    utm_term:     g("utm_term"),
    fbclid:       g("fbclid"),
    referrer:     document.referrer || "",
    landing:      location.pathname
  };
  // se guarda por si el usuario recarga o navega antes de convertir
  try{
    const prev = JSON.parse(sessionStorage.getItem("ziv_attr") || "{}");
    const merged = Object.assign({}, prev, Object.fromEntries(Object.entries(a).filter(([,v]) => v)));
    sessionStorage.setItem("ziv_attr", JSON.stringify(merged));
    return merged;
  }catch(e){ return a; }
})();
function fuenteDeLead(){
  if(ATTR.fbclid || /facebook|instagram|fb/i.test(ATTR.utm_source || ATTR.referrer)) return "Meta Ads";
  if(ATTR.utm_source) return ATTR.utm_source;
  return "Super Web Quest";
}
function campaniaDeLead(){
  return [ATTR.utm_campaign, ATTR.utm_content].filter(Boolean).join(" · ");
}

/* ============================================================
   META PIXEL — se carga solo si hay un Pixel ID configurado.
   ============================================================ */
(function loadPixel(){
  let pid = CONFIG.metaPixel;
  if(!pid){
    try{ pid = (JSON.parse(localStorage.getItem("ziv_crm_v1")) || {}).cfg?.metaPix || ""; }catch(e){}
  }
  if(!pid) return;
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
  (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', pid);
  fbq('track', 'PageView');
})();
function pixel(ev, data){ try{ if(window.fbq) fbq('track', ev, data || {}); }catch(e){} }

/* ============================================================
   ACCESO AL CRM — invisible para los visitantes.
   Ábrelo con ...ziv-web-quest.html?crm  ó pulsando la tecla "C" 3 veces.
   ============================================================ */
(function crmDoor(){
  const abrir = () => window.open("ziv-crm.html", "_blank");
  if(new URLSearchParams(location.search).has("crm")){
    const b = document.createElement("button");
    b.textContent = "📊 CRM";
    b.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:60;font-family:'Press Start 2P',monospace;"
      + "font-size:9px;color:#000;background:#F5A800;border:3px solid #fff;padding:9px 11px;cursor:pointer";
    b.onclick = abrir;
    document.body.appendChild(b);
  }
  let n = 0, t = 0;
  addEventListener("keydown", e => {
    if(e.key.toLowerCase() !== "c") return;
    clearTimeout(t); n++;
    t = setTimeout(() => n = 0, 700);
    if(n >= 3){ n = 0; abrir(); }
  });
})();

/* ============================================================
   COMPARTIDO
   ============================================================ */
const PAL = {
  Y:"#FFD400", F:"#F0C48C", B:"#000000", O:"#EF3B36",
  U:"#2E5FD6", N:"#5C3A1E", W:"#FFF3DC", P:"#E86A2B",
  G:"#F5A800", D:"#000000", X:"#ffffff", R:"#EF3B36",
  M:"#9aa3b2", K:"#39d98a", C:"#57c7ff", S:"#8a8aa8",
  I:"#ff5fa2", A:"#3b5998"
};
function drawSprite(ctx, map, x, y, scale, flip){
  const w = map[0].length;
  for(let r=0; r<map.length; r++){
    for(let c=0; c<w; c++){
      const ch = map[r][flip ? w-1-c : c];
      if(ch === '.') continue;
      ctx.fillStyle = PAL[ch];
      ctx.fillRect(Math.round(x + c*scale), Math.round(y + r*scale), scale, scale);
    }
  }
}
const rnd = (a,b) => a + Math.random()*(b-a);

/* Sprites compartidos */
const SPR_IDLE = [
"...YYYYYY...","..YYYYYYYY..","..YYYYYYYY..","...FFFFFF...",
"...FBFFBF...","...FFFFFF...","....FFFF....","..OOOOOOOO..",
".OOUUUUUUOO.",".FFUUUUUUFF.","...UUUUUU...","...UUUUUU...",
"...UU..UU...","...UU..UU...","..NNN..NNN..","..NNN..NNN.."];
const SPR_WALK = [
"...YYYYYY...","..YYYYYYYY..","..YYYYYYYY..","...FFFFFF...",
"...FBFFBF...","...FFFFFF...","....FFFF....","..OOOOOOOO..",
".OOUUUUUUOO.",".FFUUUUUUFF.","...UUUUUU...","...UUUUUU...",
"..UU....UU..","..UU....UU..",".NNN....NNN.","NNN......NNN"];
const SPR_JUMP = [
"...YYYYYY...","..YYYYYYYY..","..YYYYYYYY..","...FFFFFF...",
"...FBFFBF...","...FFFFFF...","FF..FFFF..FF","FFOOOOOOOOFF",
".OOUUUUUUOO.","...UUUUUU...","...UUUUUU...","...UUUUUU...",
"...UU..UU...","..NNN..NNN..","..NNN..NNN..","............"];
const SPR_SHROOM = [
"...WWWWWW...",".WWPPWWPPWW.",".WPPPWWPPPW.","WWPPWWWWPPWW",
"WWWWWWWWWWWW","WWWWWWWWWWWW","..XXXXXXXX..","..XBXXXXBX..",
"..XXXXXXXX..","..XXXXXXXX.."];
const SPR_ROBOT = [
"....CC....","....MM....",".MMMMMMMM.",".MCCCCCCM.",".MCBCCBCM.",
".MCCCCCCM.",".MMMMMMMM.","MMMKKKKMMM","M.MKKKKM.M","M.MMMMMM.M",
"..MM..MM..",".MMM..MMM."];
const SPR_SNAIL = [
"...SSSS...",
"..SSSSSS..",
".SSBSSBSS.",
".SSSSSSSS.",
"MSSSSSSSSM",
"MMMMMMMMMM"];

/* ---------- Partículas + shake ---------- */
function makeFX(){
  const parts = [];
  let shake = 0;
  return {
    burst(x, y, cols, n=14, spd=3){
      for(let i=0;i<n;i++){
        const a = Math.random()*Math.PI*2, s = rnd(spd*0.3, spd);
        parts.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 1,
          life:rnd(22,44), size:rnd(2,4), col:cols[Math.floor(Math.random()*cols.length)] });
      }
    },
    text(x, y, str, col="#FFD400", size=8){
      parts.push({ x, y, vx:0, vy:-0.8, life:55, txt:str, col, size });
    },
    shake(n){ shake = Math.max(shake, n); },
    offset(){
      if(shake < 0.4) return [0,0];
      return [rnd(-shake,shake), rnd(-shake,shake)];
    },
    update(){
      shake *= 0.82;
      for(let i=parts.length-1;i>=0;i--){
        const p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if(!p.txt) p.vy += 0.12;
        p.life--;
        if(p.life <= 0) parts.splice(i,1);
      }
    },
    draw(ctx){
      parts.forEach(p => {
        const a = Math.min(1, p.life/20);
        ctx.globalAlpha = a;
        if(p.txt){
          ctx.fillStyle = p.col;
          ctx.font = p.size + "px 'Press Start 2P', monospace";
          ctx.textAlign = "center";
          ctx.fillText(p.txt, p.x, p.y);
        } else {
          ctx.fillStyle = p.col;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
      });
    }
  };
}

/* ---------- Audio + música adaptativa ---------- */
const audio = {
  ctx: null, muted:false,
  init(){ if(!this.ctx) try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} },
  tone(freq, dur, type="square", vol=0.06, when=0){
    if(!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  },
  sfx(fn){ if(!this.muted) fn(); },
  jump(){ this.sfx(()=>{ this.tone(320,.08); this.tone(480,.1,"square",.06,.06); }); },
  bump(){ this.sfx(()=>this.tone(140,.1,"triangle",.09)); },
  bad(){ this.sfx(()=>{ this.tone(200,.12,"sawtooth",.05); this.tone(120,.16,"sawtooth",.05,.08); }); },
  coin(){ this.sfx(()=>{ this.tone(988,.06,"square",.05); this.tone(1319,.14,"square",.05,.06); }); },
  spawn(){ this.sfx(()=>[523,659,784,1046].forEach((f,i)=>this.tone(f,.09,"square",.05,i*.07))); },
  blip(){ this.sfx(()=>this.tone(880,.05,"square",.04)); },
  ping(){ this.sfx(()=>this.tone(1200,.05,"sine",.045)); },
  zap(){ this.sfx(()=>{ this.tone(1600,.05,"square",.05); this.tone(2200,.06,"square",.04,.04); }); },
  thunder(){ this.sfx(()=>{ this.tone(80,.5,"sawtooth",.08); this.tone(55,.7,"sawtooth",.06,.1); }); },
  build(){ this.sfx(()=>{ this.tone(220,.09,"triangle",.07); this.tone(330,.1,"triangle",.06,.08); this.tone(440,.12,"triangle",.06,.16); }); },
  whoosh(){ this.sfx(()=>{ this.tone(300,.14,"sine",.05); this.tone(700,.16,"sine",.045,.06); }); },
  levelup(){ this.sfx(()=>[659,784,988,1319].forEach((f,i)=>this.tone(f,.12,"square",.05,i*.09))); },
  power(){ this.sfx(()=>[392,523,659,784,1046,1318].forEach((f,i)=>this.tone(f,.11,"square",.05,i*.08))); },
  fanfare(){ this.sfx(()=>[523,523,523,659,784,784,1046].forEach((f,i)=>this.tone(f,.14,"square",.055,i*.12))); }
};

const music = {
  timer:null, step:0, world:"sec-web",
  patterns:{
    "sec-web": { lead:[523,659,784,659,880,784,659,523], bass:[131,131,165,196], ms:170 }
  },
  start(){
    if(this.timer || !audio.ctx) return;
    const self = this;
    function schedule(){
      self.timer = setInterval(()=>{
        if(audio.muted) return;
        const p = self.patterns[self.world] || self.patterns["sec-web"];
        const s = self.step % 8;
        audio.tone(p.lead[s], .09, "square", .018);
        if(s % 2 === 0) audio.tone(p.bass[(self.step/2)%4|0], .16, "triangle", .028);
        self.step++;
      }, self.patterns[self.world].ms);
    }
    schedule();
  },
  setWorld(w){
    this.world = w;
    if(this.timer){ clearInterval(this.timer); this.timer = null; this.start(); }
  }
};
document.getElementById('muteBtn').addEventListener('click', function(e){
  e.stopPropagation();
  audio.muted = !audio.muted;
  this.textContent = audio.muted ? "🔇" : "🔊";
});

/* ---------- Meta-juego ---------- */
const META = { coins:0, xp:0, lvl:1, done:{}, ach:{} };
const elCoins = document.getElementById('mCoins');
const elXP = document.getElementById('xpBar');
const elLvl = document.getElementById('mLvl');
function addCoins(n){
  META.coins += n;
  elCoins.textContent = "🪙 " + META.coins;
  elCoins.classList.add('pulse');
  setTimeout(()=>elCoins.classList.remove('pulse'), 140);
}
function addXP(n){
  META.xp += n;
  const need = META.lvl * 100;
  if(META.xp >= need){
    META.xp -= need; META.lvl++;
    elLvl.textContent = "LV " + META.lvl;
    toast("⬆️", "¡SUBISTE A NIVEL " + META.lvl + "!", "Sigue jugando para más recompensas");
    audio.levelup();
  }
  elXP.style.width = Math.min(100, META.xp / (META.lvl*100) * 100) + "%";
}
function unlock(id, icon, title, sub, xp=20, coins=0){
  if(META.ach[id]) return;
  META.ach[id] = true;
  toast(icon, title, sub);
  addXP(xp);
  if(coins) addCoins(coins);
}
function toast(icon, title, sub){
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<b>${icon} ${title}</b><span>${sub||""}</span>`;
  document.getElementById('toasts').appendChild(t);
  setTimeout(()=>t.remove(), 2900);
}
function missionDone(id){
  if(META.done[id]) return;
  META.done[id] = true;
  setTimeout(()=>{
    unlock("jefe","🏆","¡MISIÓN CUMPLIDA!","Tu web está a un mensaje de distancia. Nivel legendario.", 150, 150);
    audio.fanfare();
  }, 800);
}

/* ---------- Teclado ---------- */
const keys = {};
window.addEventListener('keydown', e => {
  if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(e.key)){
    const typing = /input|textarea/i.test(document.activeElement?.tagName || "");
    if(!typing) e.preventDefault();
  }
  keys[e.key.toLowerCase()] = true;
  if(activeGame && activeGame.onAnyKey) activeGame.onAnyKey();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const isCoarse = window.matchMedia('(pointer:coarse)').matches;
if(isCoarse) document.body.classList.add('coarse');

/* ============================================================
   CRM — el lead cae directo en ziv-crm.html
   Escribe en la misma llave de localStorage que usa el CRM,
   y avisa en vivo si el CRM está abierto en otra pestaña.
   ============================================================ */
const CRM_KEY = "ziv_crm_v1";

function scoreLead(a){
  let s = 20;
  if(a.whatsapp) s += 25;
  if(a.giro) s += 8;
  if(a.productos) s += 8;
  if(/s[ií]/i.test(a.dominio || "")) s += 12;
  if(/s[ií]/i.test(a.logo || "")) s += 5;
  if(fuenteDeLead() === "Meta Ads") s += 10;
  return Math.min(100, s);
}

function saveToLocalCRM(answers){
  if(!CONFIG.crmLocal) return null;
  try{
    const db = JSON.parse(localStorage.getItem(CRM_KEY) || "null") || { leads: [], cfg: {} };
    db.leads = db.leads || [];
    const now = new Date().toISOString();
    const lead = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      creado: now,
      etapa: "nuevo",
      negocio:   answers.negocio   || "Sin nombre",
      contacto:  "",
      whatsapp:  answers.whatsapp  || "",
      giro:      answers.giro       || "",
      productos: answers.productos  || "",
      logo:      answers.logo       || "",
      dominio:   (answers.dominio || "") + (answers.dominioCual ? " (" + answers.dominioCual + ")" : ""),
      valor:     0,
      responsable: (db.cfg && db.cfg.equipo && db.cfg.equipo[0]) || "Ismael",
      fuente:    fuenteDeLead(),
      campania:  campaniaDeLead(),
      utm:       ATTR,
      notas:     "Llegó jugando el Super Web Quest. Completó las 3 mejoras.",
      actividad: [{ fecha: now, texto: "🎮 Lead capturado en Super Web Quest", por: "Landing" }],
      fotosN: 0
    };
    db.leads.unshift(lead);
    localStorage.setItem(CRM_KEY, JSON.stringify(db));
    // aviso en vivo al CRM si está abierto
    try{ new BroadcastChannel("ziv_crm").postMessage("sync"); }catch(e){}
    return lead;
  }catch(e){ return null; }
}

function sendToCRM(answers){
  const lead = saveToLocalCRM(answers);

  // evento de conversión para que Meta optimice hacia gente que sí llena el formulario
  pixel("Lead", {
    content_name: "Super Web Quest",
    content_category: answers.giro || "",
    value: 1,
    currency: "MXN"
  });

  // opcional: además mandarlo a un backend / Make / Zapier
  if(CONFIG.crmWebhook){
    const payload = JSON.stringify(Object.assign({}, lead || answers, {
      fuente: fuenteDeLead(),
      campania: campaniaDeLead(),
      score: scoreLead(answers),
      atribucion: ATTR,
      fecha: new Date().toISOString()
    }));
    try{
      if(navigator.sendBeacon){
        navigator.sendBeacon(CONFIG.crmWebhook, new Blob([payload], { type:"text/plain" }));
      } else {
        fetch(CONFIG.crmWebhook, { method:"POST", mode:"no-cors", keepalive:true,
          headers:{ "Content-Type":"text/plain" }, body: payload });
      }
    }catch(e){}
  }
  return lead;
}

/* ---------- WhatsApp ---------- */
function waLink(header, fields){
  const lines = [header, ""];
  fields.forEach(([label, val]) => lines.push(`*${label}:* ${val || "-"}`));
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/* ---------- Formulario por diálogos ---------- */
function runForm(overlay, levelName, questions, onDone){
  const answers = {};
  function show(i){
    const q = questions[i];
    const total = questions.length;
    const bar = "▮".repeat(i) + "▯".repeat(total - i);
    let inputHTML = "";
    if(q.type === "radio"){
      inputHTML = `<div class="radio-row">` +
        q.opts.map(o => `<button type="button" class="radio-opt" data-v="${o}">${o}</button>`).join("") + `</div>`;
      if(q.follow) inputHTML += `<input class="q-input" id="qFollow" style="display:none" placeholder="${q.follow.ph}" autocomplete="off">`;
    } else {
      const t = q.type === "tel" ? "tel" : q.type === "email" ? "email" : "text";
      inputHTML = `<input class="q-input" id="qInput" type="${t}" placeholder="${q.ph||''}" autocomplete="off">`;
    }
    overlay.innerHTML = `
      <div class="dialog">
        <div class="progress">${levelName} · PREGUNTA ${i+1}/${total}<br><span class="bar">${bar}</span></div>
        <div class="q-label">${q.label}</div>
        ${inputHTML}
        <div class="err" id="qErr"></div>
        <button class="btn" id="qNext">${i === total-1 ? "ENVIAR ▶" : "SIGUIENTE ▶"}</button>
      </div>`;
    let radioVal = null;
    if(q.type === "radio"){
      overlay.querySelectorAll('.radio-opt').forEach(b => {
        b.addEventListener('click', () => {
          overlay.querySelectorAll('.radio-opt').forEach(x => x.classList.remove('sel'));
          b.classList.add('sel');
          radioVal = b.dataset.v;
          audio.blip();
          const f = overlay.querySelector('#qFollow');
          if(f) f.style.display = (q.follow && radioVal === q.follow.when) ? "block" : "none";
        });
      });
    } else {
      const inp = overlay.querySelector('#qInput');
      setTimeout(() => inp.focus(), 60);
      inp.addEventListener('keydown', e => { if(e.key === "Enter") next(); });
    }
    function fail(msg){
      const e = overlay.querySelector('#qErr');
      e.textContent = msg; e.style.display = "block";
      audio.bump();
    }
    function next(){
      let val;
      if(q.type === "radio"){
        if(!radioVal) return fail("¡Elige una opción para continuar!");
        val = radioVal;
        const f = overlay.querySelector('#qFollow');
        if(f && f.style.display !== "none" && f.value.trim()) answers[q.follow.key] = f.value.trim();
      } else {
        val = overlay.querySelector('#qInput').value.trim();
        if(!val) return fail("¡Este campo es tu llave al siguiente nivel!");
        if(q.type === "tel"){
          const digits = val.replace(/\D/g,"");
          if(digits.length < 10) return fail("Necesito al menos 10 dígitos 📱");
          val = digits;
        }
        if(q.type === "email" && !/^\S+@\S+\.\S+$/.test(val)) return fail("Mmm... ese correo no se ve válido 📧");
      }
      answers[q.key] = val;
      audio.blip();
      addXP(8);
      if(i + 1 < questions.length) show(i + 1);
      else { overlay.innerHTML = ""; onDone(answers); }
    }
    overlay.querySelector('#qNext').addEventListener('click', next);
  }
  show(0);
}

function fitCanvas(sec, cv){
  const r = sec.getBoundingClientRect();
  const ar = r.width / Math.max(1, r.height);
  let W, H;
  if(ar >= 1){ H = 270; W = Math.round(270 * ar); }
  else { W = 360; H = Math.round(360 / ar); }
  cv.width = W; cv.height = H;
  cv.getContext('2d').imageSmoothingEnabled = false;
  return { W, H };
}
function canvasPos(cv, e){
  const r = cv.getBoundingClientRect();
  return { x:(e.clientX - r.left)/r.width*cv.width, y:(e.clientY - r.top)/r.height*cv.height };
}

/* ============================================================
   MUNDO 1 · SUPER WEB QUEST
   3 cajas sorpresa (mejoras) + obstáculo "sitio lento"
   ============================================================ */
const GameWeb = (() => {
  const sec = document.getElementById('sec-web');
  const cv = sec.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const overlay = sec.querySelector('.overlay');
  const touch = sec.querySelector('.touch');
  const fx = makeFX();

  let W = 480, H = 270, GROUND = 232;
  const S = 2;
  let state = "TITLE";
  let ticks = 0, growTimer = 0, finaleShroom = null;
  let prevOnGround = true;
  let hitCooldown = 0;
  let lastAnswers = {};

  const FEATURES = ["✨ DISEÑO PREMIUM", "🔍 SEO", "💬 CHAT EN VIVO"];
  const blocks = [
    { fx:0.34, fy:94,  used:false, bump:0 },
    { fx:0.54, fy:112, used:false, bump:0 },
    { fx:0.74, fy:94,  used:false, bump:0 }
  ];
  let upgrades = 0;

  const player = { x:60, y:0, w:24, h:32, vx:0, vy:0, onGround:true, facing:1, frame:0, big:false, visible:true };
  const shroom = { active:false, x:0, y:0, vx:0, vy:0, rising:0, landed:false };
  const snail = { fxa:0.12, fxb:0.28, x:0, min:0, max:0, dir:1 };
  let coins = [
    { fx:0.24, fy:64,  got:false },
    { fx:0.9,  fy:60,  got:false }
  ];

  function resize(){
    ({W, H} = fitCanvas(sec, cv));
    GROUND = H - 38;
    blocks.forEach(b => { b.x = Math.round(W*b.fx) - 16; b.y = GROUND - b.fy; });
    snail.min = W*snail.fxa; snail.max = W*snail.fxb;
    if(snail.x === 0) snail.x = snail.min;
    snail.x = Math.max(snail.min, Math.min(snail.max, snail.x));
    player.x = Math.min(player.x, W - player.w - 4);
    if(player.onGround) player.y = GROUND - player.h;
    coins.forEach(c => { c.x = W*c.fx; c.y = GROUND - c.fy; });
  }

  function bindTouch(cls, key){
    const el = touch.querySelector('.' + cls);
    el.addEventListener('pointerdown', e => { e.preventDefault(); keys[key] = true; });
    el.addEventListener('pointerup',   e => { e.preventDefault(); keys[key] = false; });
    el.addEventListener('pointerleave',e => { keys[key] = false; });
  }
  bindTouch('tLeft','arrowleft');
  bindTouch('tRight','arrowright');
  bindTouch('tJump',' ');

  sec.addEventListener('pointerdown', e => {
    if(state === "TITLE" && !e.target.closest('.scrollHint')) start();
  });
  function onAnyKey(){ if(state === "TITLE") start(); }
  function start(){
    audio.init(); audio.blip(); music.start();
    state = "PLAY";
    touch.classList.add('on');
  }

  function update(){
    ticks++;
    fx.update();
    if(hitCooldown > 0) hitCooldown--;

    if(state === "PLAY" || state === "FINALE" || state === "DONE"){
      if(state === "PLAY" || state === "DONE"){
        let mv = 0;
        if(keys['arrowleft'] || keys['a']) mv = -1;
        if(keys['arrowright'] || keys['d']) mv = 1;
        player.vx = mv * 2.2;
        if(mv !== 0) player.facing = mv;
        const wantJump = keys[' '] || keys['arrowup'] || keys['w'];
        if(wantJump && player.onGround){
          player.vy = -8.6; player.onGround = false;
          audio.jump();
          fx.burst(player.x + player.w/2, player.y + player.h, ["#c9a06a","#e0c39a"], 6, 1.6);
          unlock("salto","🦘","¡Primer salto!","Ya dominas los controles", 10);
        }
      } else player.vx = 0;

      player.x += player.vx;
      player.vy += 0.5;
      player.y += player.vy;
      player.x = Math.max(4, Math.min(W - player.w - 4, player.x));

      prevOnGround = player.onGround;
      if(player.y + player.h >= GROUND){
        player.y = GROUND - player.h; player.vy = 0; player.onGround = true;
        if(!prevOnGround) fx.burst(player.x + player.w/2, GROUND, ["#c9a06a","#8f4322"], 8, 2);
      }

      // Cajas sorpresa
      blocks.forEach((b, bi) => {
        if(b.bump > 0) b.bump--;
        // golpe de cabeza
        if(!b.used && player.vy < 0 &&
           player.x + player.w > b.x + 4 && player.x < b.x + 32 - 4 &&
           player.y <= b.y + 32 && player.y >= b.y + 32 - 12){
          player.y = b.y + 32; player.vy = 1;
          b.used = true; b.bump = 8;
          upgrades++;
          audio.bump();
          fx.shake(4);
          fx.burst(b.x + 16, b.y, ["#FFD400","#fff","#F5A800"], 18, 3.4);
          fx.text(b.x + 16, b.y - 12, FEATURES[bi]);
          fx.text(b.x + 16, b.y - 26, "¡DESBLOQUEADO!", "#39d98a", 6);
          addXP(15); addCoins(3);
          unlock("pow","💥","¡Primera mejora!","Tu web está subiendo de nivel", 25);
          setTimeout(()=>audio.spawn(), 150);
          if(upgrades === 3){
            unlock("full","🌟","¡WEB COMPLETA!","Diseño + SEO + Chat: nivel premium", 30);
            shroom.active = true; shroom.rising = 20;
            shroom.x = b.x + 4; shroom.y = b.y;
          }
        }
        // pisarla
        if(player.vy >= 0 &&
           player.x + player.w > b.x + 2 && player.x < b.x + 32 - 2 &&
           player.y + player.h >= b.y && player.y + player.h <= b.y + 14){
          player.y = b.y - player.h; player.vy = 0; player.onGround = true;
        }
      });

      // Obstáculo: sitio lento 🐌
      if(state === "PLAY"){
        snail.x += snail.dir * 0.5;
        if(snail.x < snail.min){ snail.x = snail.min; snail.dir = 1; }
        if(snail.x > snail.max){ snail.x = snail.max; snail.dir = -1; }
        const sw = 20, sh = 12;
        if(hitCooldown === 0 &&
           player.x + player.w > snail.x && player.x < snail.x + sw &&
           player.y + player.h > GROUND - sh){
          hitCooldown = 40;
          const push = player.x + player.w/2 < snail.x + sw/2 ? -16 : 16;
          player.x += push;
          player.vy = -3;
          player.onGround = false;
          fx.shake(3);
          fx.text(snail.x + 10, GROUND - 24, "¡SITIO LENTO!", "#ff6b6b", 6);
          audio.bad();
        }
      }

      if(Math.abs(player.vx) > 0 && player.onGround && ticks % 8 === 0) player.frame = 1 - player.frame;

      coins.forEach(c => {
        if(c.got) return;
        if(player.x + player.w > c.x - 6 && player.x < c.x + 12 &&
           player.y + player.h > c.y - 6 && player.y < c.y + 14){
          c.got = true;
          audio.coin();
          addCoins(5); addXP(5);
          fx.burst(c.x, c.y, ["#FFD400","#F5A800","#fff"], 10, 2.6);
          fx.text(c.x, c.y - 6, "+5 🪙");
        }
      });
    }

    if(shroom.active && state === "PLAY"){
      if(shroom.rising > 0){
        shroom.y -= 1; shroom.rising--;
        if(shroom.rising === 0) shroom.vx = 1.1;
      } else if(!shroom.landed){
        shroom.x += shroom.vx;
        let onBlock = false;
        blocks.forEach(b => {
          if(shroom.x + 20 > b.x && shroom.x < b.x + 32 &&
             shroom.y + 20 >= b.y - 2 && shroom.y + 20 <= b.y + 6) onBlock = true;
        });
        if(!onBlock){
          shroom.vy += 0.4; shroom.y += shroom.vy;
          if(shroom.y + 20 >= GROUND){
            shroom.y = GROUND - 20; shroom.vy = 0; shroom.landed = true;
            fx.burst(shroom.x + 12, GROUND, ["#FFF3DC","#E86A2B"], 10, 2.2);
            setTimeout(() => { state = "FROZEN"; showPowerUp(); }, 350);
          }
        }
      }
    }

    if(state === "FINALE" && finaleShroom){
      finaleShroom.vy += 0.4;
      finaleShroom.y += finaleShroom.vy;
      if(finaleShroom.y + 20 >= GROUND){ finaleShroom.y = GROUND - 20; finaleShroom.vy = 0; }
      const t = finaleShroom.x < player.x + player.w && finaleShroom.x + 24 > player.x &&
                finaleShroom.y + 20 >= player.y;
      if(t && growTimer === 0){
        growTimer = 60; finaleShroom = null;
        audio.power();
        fx.shake(5);
        fx.burst(player.x + player.w/2, player.y + 10, ["#fff","#FFD400","#EF3B36","#2EDC6E"], 30, 4);
      }
    }
    if(growTimer > 0){
      growTimer--;
      player.visible = (growTimer % 8 < 4) || growTimer < 20;
      if(growTimer === 30) player.big = true;
      if(growTimer === 0){
        player.visible = true; player.big = true; state = "DONE";
        setTimeout(showFinal, 500);
      }
    }
    if(player.big){
      player.h = 48; player.w = 30;
      if(player.y + player.h > GROUND) player.y = GROUND - player.h;
    }
  }

  function drawCloud(x, y, sc=1){
    const o = 2*sc;
    ctx.fillStyle="#000";
    ctx.fillRect(x+8*sc-o,y-o,24*sc+o*2,8*sc+o*2);
    ctx.fillRect(x-o,y+8*sc-o,40*sc+o*2,10*sc+o*2);
    ctx.fillRect(x+4*sc-o,y+18*sc-o,32*sc+o*2,4*sc+o*2);
    ctx.fillStyle="#fff";
    ctx.fillRect(x+8*sc,y,24*sc,8*sc); ctx.fillRect(x,y+8*sc,40*sc,10*sc); ctx.fillRect(x+4*sc,y+18*sc,32*sc,4*sc);
  }
  function drawHill(x,w,h,col){
    ctx.fillStyle="#000";
    for(let i=0;i<h;i+=4){
      const s=(i/h)*w*0.5;
      ctx.fillRect(x+s-3, GROUND-i-4, w-s*2+6, 4);
    }
    ctx.fillRect(x+(w*0.5)-4, GROUND-h-7, 8, 4);
    ctx.fillStyle=col;
    for(let i=0;i<h;i+=4){
      const s=(i/h)*w*0.5;
      ctx.fillRect(x+s, GROUND-i-4, w-s*2, 4);
    }
  }
  function drawGround(){
    ctx.fillStyle="#C0521E"; ctx.fillRect(0,GROUND,W,H-GROUND);
    ctx.fillStyle="#000";
    ctx.fillRect(0,GROUND,W,3);
    for(let y=GROUND;y<H;y+=16) ctx.fillRect(0,y,W,2);
    for(let y=GROUND,row=0;y<H;y+=16,row++)
      for(let x=(row%2)*8;x<W;x+=16) ctx.fillRect(x,y,2,16);
  }
  function drawBlock(b){
    const by = b.y - (b.bump > 4 ? (8-b.bump)*2 : b.bump);
    ctx.fillStyle = "#000";
    ctx.fillRect(b.x-2, by-2, 36, 36);
    ctx.fillStyle = b.used ? "#9a7440" : "#F5A800";
    ctx.fillRect(b.x, by, 32, 32);
    ctx.fillStyle = "#000";
    ctx.fillRect(b.x+3,by+3,4,4); ctx.fillRect(b.x+25,by+3,4,4);
    ctx.fillRect(b.x+3,by+25,4,4); ctx.fillRect(b.x+25,by+25,4,4);
    if(!b.used){
      ctx.font = "16px 'Press Start 2P', monospace";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      const wob = (Math.floor(ticks/20)%2) ? 0 : 1;
      ctx.fillStyle = "#000"; ctx.fillText("?", b.x+17, by+19+wob);
      ctx.fillStyle = "#fff"; ctx.fillText("?", b.x+16, by+18+wob);
    }
  }
  function drawFlag(){
    const fxp = W - 40;
    ctx.fillStyle="#000"; ctx.fillRect(fxp,GROUND-90,4,90);
    ctx.fillStyle="#000"; ctx.fillRect(fxp-30,GROUND-92,32,22);
    ctx.fillStyle="#EF3B36"; ctx.fillRect(fxp-28,GROUND-90,28,18);
    ctx.fillStyle="#fff"; ctx.font="7px 'Press Start 2P', monospace"; ctx.textAlign="center";
    ctx.fillText("ZIV", fxp-14, GROUND-78);
  }
  function drawCoin(c){
    if(c.got) return;
    const sp = Math.abs(Math.sin(ticks*0.1));
    const w = Math.max(2, 10*sp);
  