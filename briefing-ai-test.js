/* =====================================================
   BRIEFING AI · ZIV CREATIVO
   Flujo:
     1) prompt corto -> Worker /briefing -> 3-5 preguntas JSON
     2) usuario responde -> Worker /generate -> HTML completo
     3) preview en iframe + descargar + chat de cambios
   ===================================================== */
(function () {
  'use strict';

  /* -------- CONFIG -------- */
  // Cambia esta URL por la de tu Cloudflare Worker desplegado
  // (p.ej. https://briefing-ai.tu-usuario.workers.dev)
  const WORKER_URL = window.BAI_WORKER_URL || 'https://briefing-ai.TU-USUARIO.workers.dev';
  const TIMEOUT_MS = 60000;
  const MIN_CHARS  = 5;
  const HISTORY_KEY = 'ziv_bai_history_v1';
  const LAST_KEY    = 'ziv_bai_last_v1';
  const HISTORY_LIMIT = 5;
  const WHATSAPP_NUMBER = '525540161213'; // Ismael — mismo número del cotizador

  /* -------- CATÁLOGO DE NEGOCIOS (mismo que cotizador.html) -------- */
  const BUSINESSES = [
    { keys:['salon de unas','salon de uñas','manicurista','manicure','nail','unas','uñas','nailtech','nail art','salón'],
      name:'Salón de uñas / Manicurista', title:'Landing de Belleza Premium', price:1949 },
    { keys:['spa','masajes','masaje','relajacion','wellness','sauna'],
      name:'Spa / Masajes / Wellness', title:'Landing de Spa Premium', price:2299 },
    { keys:['estilista','peluqueria','peluquería','barberia','barbería','barber','hair','peluquero'],
      name:'Estilista / Barbería / Peluquería', title:'Landing de Estética', price:1949 },
    { keys:['restaurante','restaurant','cocina','chef','comida','cafe','cafetería','cafeteria','coffee','bistró','bistro','taqueria','taquería'],
      name:'Restaurante / Café / Bar', title:'Landing Gastronómica', price:2499 },
    { keys:['bar','bar de copas','cocteleria','coctelería','rooftop','speakeasy','pub'],
      name:'Bar / Coctelería / Rooftop', title:'Landing Bar Editorial', price:2499 },
    { keys:['inmobiliaria','bienes raices','bienes raíces','realtor','propiedades','casas','departamentos','broker','desarrollos'],
      name:'Inmobiliaria / Broker', title:'Landing Inmobiliaria', price:3499 },
    { keys:['consultor','coach','consultoria','consultoría','coaching','mentor','asesor','consultora'],
      name:'Consultor / Coach', title:'Landing de Autoridad', price:2299 },
    { keys:['abogado','despacho','juridico','jurídico','legal','notario','abogados','derecho'],
      name:'Abogado / Despacho legal', title:'Landing Legal', price:2499 },
    { keys:['medico','médico','doctor','clinica','clínica','dental','dentista','psicologo','psicólogo','nutriologo','nutriólogo','ortodoncista','ginecologa','dermatologa'],
      name:'Médico / Clínica', title:'Landing Clínica', price:2499 },
    { keys:['fotografo','fotógrafo','foto','photographer','wedding','sesiones','newborn'],
      name:'Fotógrafo / Wedding', title:'Landing Portfolio', price:2299 },
    { keys:['gimnasio','gym','fitness','crossfit','yoga','pilates','entrenador','coach fit','box','boxeo'],
      name:'Gimnasio / Coach fitness', title:'Landing Fitness', price:2499 },
    { keys:['tienda online','ecommerce','e-commerce','tienda virtual','venta online','online shop','shopify','tienda'],
      name:'Tienda online / E-commerce', title:'Landing E-commerce de Lujo', price:3499 },
    { keys:['boutique','ropa','moda','fashion','accesorios','bolsas','calzado'],
      name:'Boutique / Moda / Accesorios', title:'Landing Boutique', price:2999 },
    { keys:['agencia viajes','viajes','turismo','tours','escapadas','operadora'],
      name:'Agencia de viajes / Tours', title:'Landing Travel', price:2799 },
    { keys:['eventos','catering','banquetes','wedding planner','organizador','organizadora','salones de eventos'],
      name:'Eventos / Catering / Banquetes', title:'Landing de Eventos', price:2499 },
    { keys:['arquitecto','arquitectura','interior','diseno interiores','diseño de interiores','interiorista'],
      name:'Arquitecto / Diseñador de interiores', title:'Landing de Portafolio', price:2999 },
    { keys:['constructora','construccion','construcción','obra','remodelacion','remodelación','contratista'],
      name:'Constructora / Remodelaciones', title:'Landing Constructora', price:2999 },
    { keys:['industrial','manufactura','b2b','distribuidor','mayorista','fabricante','planta'],
      name:'Industrial / B2B / Distribuidor', title:'Landing Industrial B2B', price:3499 },
    { keys:['marca personal','influencer','creador','creator','personal','tiktoker','youtuber','podcaster'],
      name:'Marca personal / Creador', title:'Landing Personal', price:1949 },
    { keys:['educacion','educación','curso','cursos','academia','escuela','online course','clases'],
      name:'Educación / Cursos online', title:'Landing de Curso', price:2799 },
    { keys:['mecanico','mecánico','automotriz','refacciones','taller','auto','autos','llantera'],
      name:'Taller automotriz / Refacciones', title:'Landing Automotriz', price:2499 },
    { keys:['veterinaria','veterinario','pet','mascota','mascotas','vet','peluqueria canina'],
      name:'Veterinaria / Pet shop', title:'Landing Pet', price:1949 },
    { keys:['agencia','marketing','publicidad','digital','seo','agencia digital','social media'],
      name:'Agencia de marketing', title:'Landing de Agencia', price:2999 },
    { keys:['hotel','hostal','airbnb','rental','vacacional','cabana','cabaña','hospedaje'],
      name:'Hotel / Airbnb / Renta', title:'Landing de Hospedaje', price:2799 },
    { keys:['contador','contabilidad','despacho contable','fiscalista'],
      name:'Contador / Fiscalista', title:'Landing Despacho', price:2299 },
    { keys:['desarrollador','desarrollos','obra nueva','venta departamentos','construccion vivienda','preventa'],
      name:'Desarrollador inmobiliario', title:'Landing de Desarrollo', price:3999 },
    { keys:['joyeria','joyas','joyería','accesorios lujo','plata','oro','diseñador joyas'],
      name:'Joyería / Diseñador de joyas', title:'Landing Joyería', price:2999 },
    { keys:['invitacion','invitación','invitaciones','invitacion digital','boda','bodas','xv','xv años','xv anos','quince','quinceañera','baby shower','bautizo','cumpleaños','cumpleanos','aniversario','save the date'],
      name:'Invitación digital · Bodas / XV', title:'Invitación Digital Editorial', price:1299 },
  ];

  const FALLBACK_BIZ = {
    name: 'Tu negocio',
    title: 'Landing Premium ZIV',
    price: 1949
  };

  function _norm(s){
    return (s || '').toString().toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
  function detectBusiness(prompt, answers) {
    const haystack = _norm(prompt + ' ' + Object.values(answers || {}).map(v => Array.isArray(v) ? v.join(' ') : v).join(' '));
    for (const biz of BUSINESSES) {
      for (const key of biz.keys) {
        if (haystack.includes(_norm(key))) return biz;
      }
    }
    return FALLBACK_BIZ;
  }
  function fmtPrice(n){ return n.toLocaleString('es-MX'); }
  function compareAgency(price){ return price < 9800 ? 9800 : Math.round(price * 2.2); }
  function buildWhatsAppLink(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  /* -------- FALLBACK PREGUNTAS GENÉRICAS -------- */
  const FALLBACK_QUESTIONS = [
    { id: 'nombre',    pregunta: '¿Cómo se llama el proyecto / negocio?', tipo: 'texto' },
    { id: 'tono',      pregunta: '¿Qué tono visual prefieres?',
      tipo: 'select', opciones: ['Minimalista y limpio','Premium y elegante','Divertido y colorido','Tecnológico y moderno','Editorial y serio'] },
    { id: 'secciones', pregunta: '¿Qué secciones necesitas?',
      tipo: 'checkbox', opciones: ['Hero','Servicios','Productos','Galería','Testimonios','Precios','Sobre mí','Contacto','FAQ'] },
    { id: 'cta',       pregunta: '¿Cuál es la acción principal que quieres del visitante?', tipo: 'texto' },
    { id: 'colores',   pregunta: '¿Tienes una paleta de colores en mente? (opcional)', tipo: 'texto' }
  ];

  /* -------- STATE -------- */
  let state = {
    prompt: '',
    questions: [],
    answers: {},
    html: '',
    chatLog: [], // [{role:'user'|'bot', text:''}]
  };

  /* -------- DOM helpers -------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* -------- API call con timeout y retry automático -------- */
  async function apiCallOnce(endpoint, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(WORKER_URL.replace(/\/$/, '') + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = j.error || j.message || ''; } catch (_) {}
        const err = new Error(`HTTP ${res.status}${detail ? ' · ' + detail : ''}`);
        err.status = res.status;
        err.retriable = res.status === 503 || res.status === 429 || res.status === 500;
        throw err;
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const e = new Error('La IA tardó demasiado (más de 60 s). Intenta de nuevo.');
        e.retriable = true;
        throw e;
      }
      throw err;
    }
  }

  // Reintenta automáticamente en 503/429/500 (saturación de Gemini)
  // hasta 3 veces con backoff exponencial: 2s, 4s, 8s.
  async function apiCall(endpoint, payload) {
    const maxRetries = 3;
    let lastErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCallOnce(endpoint, payload);
      } catch (err) {
        lastErr = err;
        if (!err.retriable || attempt === maxRetries) break;
        const wait = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
        const loadingEl = document.getElementById('bai-loading-text');
        if (loadingEl) loadingEl.innerHTML = `Gemini saturado, reintentando… <strong>(${attempt + 1}/${maxRetries})</strong>`;
        await new Promise(r => setTimeout(r, wait));
      }
    }
    throw lastErr;
  }

  /* -------- Llamada 1: briefing -------- */
  async function fetchBriefing(prompt) {
    const data = await apiCall('/briefing', { prompt });
    // Worker devuelve { text: '...' }
    let raw = (data.text || '').trim();
    // Quitar bloques markdown si vienen
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) {
      console.warn('[briefing-ai] JSON malformado, usando fallback', e, raw);
      return FALLBACK_QUESTIONS;
    }
    const qs = Array.isArray(parsed?.preguntas) ? parsed.preguntas : null;
    if (!qs || qs.length < 1) {
      console.warn('[briefing-ai] preguntas inválidas, usando fallback');
      return FALLBACK_QUESTIONS;
    }
    // Sanitizar
    return qs.slice(0, 5).map((q, i) => ({
      id: q.id || ('q' + i),
      pregunta: q.pregunta || `Pregunta ${i + 1}`,
      tipo: ['texto', 'select', 'checkbox'].includes(q.tipo) ? q.tipo : 'texto',
      opciones: Array.isArray(q.opciones) ? q.opciones : []
    }));
  }

  /* -------- Llamada 2: generar HTML -------- */
  async function fetchHtml(enrichedPrompt) {
    const data = await apiCall('/generate', { prompt: enrichedPrompt });
    const raw = data.text || '';
    const match = raw.match(/```html\s*([\s\S]*?)\s*```/i);
    return match ? match[1] : raw;
  }

  /* -------- Llamada 3: chat de cambios -------- */
  async function fetchEdit(currentHtml, instruction) {
    const data = await apiCall('/edit', { html: currentHtml, instruction });
    const raw = data.text || '';
    const match = raw.match(/```html\s*([\s\S]*?)\s*```/i);
    return match ? match[1] : raw;
  }

  /* -------- LocalStorage -------- */
  function saveLast(html, prompt) {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ html, prompt, ts: Date.now() }));
    } catch (_) {}
  }
  function loadLast() {
    try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch (_) { return null; }
  }
  function pushHistory(html, prompt) {
    try {
      const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      list.unshift({ html, prompt, ts: Date.now() });
      const trimmed = list.slice(0, HISTORY_LIMIT);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch (_) {}
  }
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) { return []; }
  }

  /* -------- Render markup base del modal -------- */
  function buildModal() {
    const wrap = document.createElement('div');
    wrap.className = 'bai-backdrop';
    wrap.id = 'bai-backdrop';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = `
      <div class="bai-modal" role="document">
        <div class="bai-modal-head">
          <div class="bai-modal-title">
            <span class="bai-tag">BETA</span>
            <span>Generador <em>con IA</em></span>
          </div>
          <button class="bai-close" id="bai-close" aria-label="Cerrar">×</button>
        </div>
        <div class="bai-modal-body">
          <div class="bai-steps" id="bai-steps">
            <span class="bai-step" data-step="1"><span class="bai-num">1</span> Idea</span>
            <span class="bai-arrow">→</span>
            <span class="bai-step" data-step="2"><span class="bai-num">2</span> Briefing</span>
            <span class="bai-arrow">→</span>
            <span class="bai-step" data-step="3"><span class="bai-num">3</span> Tu landing</span>
          </div>

          <!-- STAGE 1 -->
          <div class="bai-stage" id="bai-stage-1">
            <h3>Cuéntame <span class="sans">qué</span> necesitas.</h3>
            <p class="bai-help">Una frase basta. Ej: <em>"una landing para mi cafetería de especialidad"</em>. La IA te hará 3-5 preguntas para afinar el diseño.</p>
            <div class="bai-error" id="bai-error-1" style="display:none"></div>
            <div class="bai-field">
              <textarea id="bai-prompt" class="bai-textarea" placeholder="Describe tu proyecto en una frase…" maxlength="600"></textarea>
              <div class="bai-counter" id="bai-counter">0 / 600</div>
            </div>
            <div class="bai-actions">
              <button class="bai-btn bai-btn-lime" id="bai-go-briefing">Generar briefing →</button>
              <button class="bai-history-toggle" id="bai-history-btn">Historial</button>
            </div>
            <div class="bai-history" id="bai-history">
              <h4>Últimas generaciones</h4>
              <div class="bai-history-list" id="bai-history-list"></div>
            </div>
          </div>

          <!-- STAGE 2 -->
          <div class="bai-stage" id="bai-stage-2">
            <h3>Afinemos <span class="sans">los detalles</span>.</h3>
            <p class="bai-help">Estas preguntas las generó la IA según tu idea. Responde lo que apliquen.</p>
            <div class="bai-error" id="bai-error-2" style="display:none"></div>
            <div id="bai-questions"></div>
            <div class="bai-actions">
              <button class="bai-btn bai-btn-ghost" id="bai-back-1">← Volver</button>
              <button class="bai-btn bai-btn-lime" id="bai-go-generate">Generar landing →</button>
            </div>
          </div>

          <!-- STAGE 3 -->
          <div class="bai-stage" id="bai-stage-3">
            <h3>Tu landing <span class="sans">está lista</span>.</h3>
            <p class="bai-help">Esto es un <em>borrador automático</em> con imágenes random. La versión real, con tus fotos, tu marca y dominio .com, te la entrego en 48 horas.</p>
            <div class="bai-error" id="bai-error-3" style="display:none"></div>
            <div class="bai-preview-wrap">
              <div class="bai-preview-bar">
                <span class="bai-dot bai-dot-r"></span>
                <span class="bai-dot bai-dot-y"></span>
                <span class="bai-dot bai-dot-g"></span>
                <span class="bai-url">vista previa · generada con IA</span>
              </div>
              <iframe id="bai-iframe" class="bai-iframe" sandbox="allow-scripts" title="Vista previa"></iframe>
            </div>

            <!-- CTA WhatsApp con precio del cotizador -->
            <div class="bai-cta" id="bai-cta">
              <div class="bai-cta-header">
                <span class="bai-cta-pill">¿Te gusta?</span>
                <h4 class="bai-cta-title">Termina tu landing <span class="bai-cta-real">de verdad</span> por</h4>
              </div>
              <div class="bai-cta-price">
                <div class="bai-cta-price-main">
                  <span class="bai-cta-currency">$</span><span class="bai-cta-num" id="bai-cta-price">1,949</span>
                  <span class="bai-cta-mxn">MXN · pago único</span>
                </div>
                <div class="bai-cta-vs">
                  <span class="bai-cta-strike">agencia <s>$<span id="bai-cta-compare">9,800</span></s></span>
                  <span class="bai-cta-save">ahorras +$<span id="bai-cta-save">7,851</span></span>
                </div>
              </div>
              <p class="bai-cta-text">Mándame <strong>tus fotos, tus textos, tu marca</strong> — la entrego lista en <strong>48 horas</strong> con dominio .com, hosting, agenda online y todo lo que necesitas para vender de verdad.</p>
              <a class="bai-btn bai-btn-wa" id="bai-cta-wa" target="_blank" rel="noopener">
                <span class="bai-wa-icon">🟢</span> Pedir mi landing por WhatsApp →
              </a>
            </div>

            <div class="bai-actions">
              <button class="bai-btn bai-btn-ghost" id="bai-download">⬇ Descargar borrador</button>
              <button class="bai-btn bai-btn-ghost" id="bai-restart">Empezar de nuevo</button>
            </div>

            <!-- Chat → ahora abre WhatsApp directo -->
            <div class="bai-chat">
              <h4 style="font-family:'Archivo Black',sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">¿Quieres cambios específicos?</h4>
              <p style="font-family:'Space Grotesk',sans-serif;font-size:13px;color:var(--ink-soft);margin-bottom:12px;">Escribe abajo lo que quieres ajustar y te llevo directo a WhatsApp con tu pedido listo.</p>
              <div class="bai-chat-input-wrap">
                <input type="text" class="bai-input" id="bai-chat-input" placeholder="Ej: que los colores sean azul marino y oro, y que tenga sección de equipo" />
                <button class="bai-btn bai-btn-wa" id="bai-chat-send">
                  <span class="bai-wa-icon">🟢</span> Enviar a WhatsApp
                </button>
              </div>
            </div>
          </div>

          <!-- LOADING (compartido) -->
          <div class="bai-stage" id="bai-stage-loading">
            <div class="bai-loading">
              <div class="bai-spinner"></div>
              <p class="bai-loading-text" id="bai-loading-text">La IA está pensando… <strong>un momento</strong></p>
            </div>
          </div>
        </div>
      </div>
    `;
    return wrap;
  }

  /* -------- Estado de pasos -------- */
  function setStep(n) {
    $$('.bai-step').forEach(el => {
      const s = +el.dataset.step;
      el.classList.toggle('active', s === n);
      el.classList.toggle('done', s < n);
    });
  }
  function showStage(id) {
    $$('.bai-stage').forEach(s => s.classList.remove('show'));
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
  }

  /* -------- Render dinámico de preguntas -------- */
  function renderQuestions(questions) {
    const root = $('#bai-questions');
    root.innerHTML = '';
    questions.forEach((q, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'bai-field';
      const label = document.createElement('label');
      label.textContent = q.pregunta;
      label.setAttribute('for', 'bai-q-' + idx);
      wrap.appendChild(label);

      if (q.tipo === 'texto') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'bai-input';
        inp.id = 'bai-q-' + idx; inp.dataset.qid = q.id;
        inp.placeholder = 'Tu respuesta…';
        wrap.appendChild(inp);
      } else if (q.tipo === 'select') {
        const sel = document.createElement('select');
        sel.className = 'bai-select'; sel.id = 'bai-q-' + idx; sel.dataset.qid = q.id;
        const empty = document.createElement('option');
        empty.value = ''; empty.textContent = '— Elige una opción —';
        sel.appendChild(empty);
        (q.opciones || []).forEach(op => {
          const o = document.createElement('option'); o.value = op; o.textContent = op;
          sel.appendChild(o);
        });
        wrap.appendChild(sel);
      } else if (q.tipo === 'checkbox') {
        const group = document.createElement('div');
        group.className = 'bai-checkboxes'; group.dataset.qid = q.id; group.id = 'bai-q-' + idx;
        (q.opciones || []).forEach((op, i) => {
          const lbl = document.createElement('label');
          lbl.className = 'bai-chk';
          const cb = document.createElement('input');
          cb.type = 'checkbox'; cb.value = op;
          cb.addEventListener('change', () => lbl.classList.toggle('checked', cb.checked));
          lbl.appendChild(cb);
          lbl.appendChild(document.createTextNode(' ' + op));
          group.appendChild(lbl);
        });
        wrap.appendChild(group);
      }
      root.appendChild(wrap);
    });
  }

  function collectAnswers(questions) {
    const out = {};
    questions.forEach((q, idx) => {
      const el = document.getElementById('bai-q-' + idx);
      if (!el) return;
      if (q.tipo === 'checkbox') {
        out[q.id] = $$('input[type=checkbox]', el).filter(cb => cb.checked).map(cb => cb.value);