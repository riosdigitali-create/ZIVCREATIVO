/* =====================================================================
   BRIEFING AI · ZIV CREATIVO (v2)
   Generador de paginas web premium con flujo de 4 etapas:

     Etapa 1 - PROMPT       el usuario describe su negocio en una frase
     Etapa 2 - PREGUNTAS    la IA hace 5 preguntas (4 con opciones + 1 libre)
     Etapa 3 - LOADING      se construye un mega prompt y se llama a Gemini
     Etapa 4 - PREVIEW      iframe con la pagina + banner precio + 2 CTAs
                            que descargan el HTML y abren WhatsApp

   Conecta con el Cloudflare Worker definido en window.BAI_WORKER_URL.
   ===================================================================== */
(function () {
  'use strict';

  const WORKER_URL    = window.BAI_WORKER_URL || 'https://ziv-ai.riosdigitali.workers.dev';
  const LS_LAST       = 'ziv_bai_last';
  const WHATSAPP_NUM  = '525540161213';
  const BASE_PRICE    = 1949;   // MXN
  const DELIVERY_HRS  = 48;

  // -------- helpers --------
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function showToast(msg){
    const t = document.getElementById('toast');
    if (!t) return;
    if (msg) t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  }

  function waLink(text){
    return 'https://wa.me/' + WHATSAPP_NUM + '?text=' + encodeURIComponent(text || '');
  }

  function extractHTML(text){
    if (!text) return '';
    const m = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
    return (m ? m[1] : text).trim();
  }

  function extractJSON(text){
    if (!text) return null;
    // Quitar bloque markdown si vino con ```json ... ```
    const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gi, '').trim();
    // Buscar el primer { y el ultimo }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (e) {
      console.warn('[BAI] JSON parse error', e);
      return null;
    }
  }

  // -------- API calls --------
  async function apiCall(endpoint, body){
    const res = await fetch(WORKER_URL + endpoint, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body || {}),
    });
    if (!res.ok){
      let detail = '';
      try { detail = await res.text(); } catch(_) {}
      throw new Error('Worker ' + res.status + ': ' + detail.slice(0,200));
    }
    return await res.json();
  }

  // -------- Estado --------
  const state = {
    prompt: '',
    questions: [],
    answers: {},
    html: '',
    busy: false,
  };

  // -------- Fallback de preguntas si /briefing falla --------
  const FALLBACK_QUESTIONS = [
    {id:'q1', label:'¿Qué vibra quieres en tu página?', type:'options',
      options:['Minimalista elegante','Vibrante y colorido','Editorial premium','Casual y cercana']},
    {id:'q2', label:'¿Qué paleta te late?', type:'options',
      options:['Tonos cálidos (terracota, crema)','Tonos fríos (azul, verde)','Negro + blanco + un acento','Pasteles suaves']},
    {id:'q3', label:'¿Quién es tu cliente ideal?', type:'options',
      options:['Profesionales 30-50','Jóvenes 18-30','Familias','Empresas / B2B']},
    {id:'q4', label:'¿Qué quieres que hagan en tu página?', type:'options',
      options:['Agendar una cita','Comprar online','Llamar / WhatsApp','Conocer mi historia']},
    {id:'q5', label:'¿Algo único que te haga especial?', type:'text',
      placeholder:'Cuéntame el detalle que te distingue de la competencia.'}
  ];

  // -------- Modal: construcción --------
  function buildModal(){
    const wrap = document.createElement('div');
    wrap.id = 'bai-backdrop';
    wrap.className = 'bai-backdrop';
    wrap.innerHTML = `
      <div class="bai-modal" role="dialog" aria-modal="true" aria-label="Generador de páginas web con IA">
        <button class="bai-close" id="bai-close" type="button" aria-label="Cerrar">×</button>

        <header class="bai-head">
          <div class="bai-head-title">
            <span class="bai-spark">✦</span>
            <span class="bai-head-name">ZIV · Generador IA</span>
            <span class="bai-head-tag">beta</span>
          </div>
          <p class="bai-head-sub">Cuéntame tu idea, contesta 5 preguntas rápidas y la IA arma tu página premium en segundos.</p>
        </header>

        <div class="bai-body">
          <!-- ETAPA 1: PROMPT -->
          <div class="bai-stage" data-bai-stage id="bai-stage-prompt">
            <label class="bai-label" for="bai-prompt">¿Cuál es tu idea de página web?</label>
            <textarea
              id="bai-prompt"
              class="bai-textarea"
              rows="3"
              maxlength="600"
              placeholder="Ejemplo: una página para mi cafetería de especialidad en Roma Norte, vibe minimalista y agenda online."
            ></textarea>
            <div class="bai-row">
              <button type="button" class="bai-btn bai-btn-primary" id="bai-go-briefing">
                <span>Continuar ✦</span>
              </button>
              <span class="bai-mini">↳ La IA te hará 5 preguntas para diseñarla a tu medida</span>
            </div>
          </div>

          <!-- ETAPA 2: LOADING BRIEFING -->
          <div class="bai-stage" data-bai-stage id="bai-stage-briefing-loading" style="display:none">
            <div class="bai-loader">
              <div class="bai-spinner" aria-hidden="true"></div>
              <p class="bai-loader-title">Preparando tu briefing inteligente…</p>
              <p class="bai-loader-sub">La IA está analizando tu negocio para hacerte las preguntas más útiles. 5-10 segundos.</p>
            </div>
          </div>

          <!-- ETAPA 3: PREGUNTAS -->
          <div class="bai-stage" data-bai-stage id="bai-stage-questions" style="display:none">
            <div class="bai-q-head">
              <span class="bai-q-step">PASO 2 DE 3</span>
              <h3 class="bai-q-title">Diseñemos tu página juntos.</h3>
              <p class="bai-q-sub">Contesta estas 5 preguntas para que la IA arme la página acorde a tu visión.</p>
            </div>
            <div id="bai-questions-list"></div>
            <div class="bai-row bai-row-actions">
              <button type="button" class="bai-btn bai-btn-ghost" id="bai-back-prompt">← Cambiar idea</button>
              <button type="button" class="bai-btn bai-btn-primary" id="bai-generate-final">
                <span>Generar mi página ✦</span>
              </button>
            </div>
          </div>

          <!-- ETAPA 4: LOADING GENERATE -->
          <div class="bai-stage" data-bai-stage id="bai-stage-generate-loading" style="display:none">
            <div class="bai-loader">
              <div class="bai-spinner" aria-hidden="true"></div>
              <p class="bai-loader-title">Diseñando tu página premium…</p>
              <p class="bai-loader-sub">La IA está escribiendo el copy, eligiendo paleta, armando secciones. 15-30 segundos.</p>
            </div>
          </div>

          <!-- ETAPA 5: PREVIEW + CTAs -->
          <div class="bai-stage" data-bai-stage id="bai-stage-preview" style="display:none">
            <div class="bai-preview-wrap">
              <div class="bai-preview-bar">
                <span class="bai-preview-dot"></span>
                <span class="bai-preview-dot bai-preview-dot-y"></span>
                <span class="bai-preview-dot bai-preview-dot-g"></span>
                <span class="bai-preview-url">tu-negocio.zivcreativo.shop</span>
              </div>
              <iframe id="bai-iframe" class="bai-iframe" sandbox="allow-scripts" title="Tu página web generada por IA"></iframe>
            </div>

            <!-- BANNER DE PRECIO -->
            <div class="bai-pricing">
              <div class="bai-pricing-left">
                <span class="bai-pricing-tag">★ Este borrador, entregado en producción premium</span>
                <div class="bai-pricing-amount">
                  <span class="bai-pricing-from">desde</span>
                  <span class="bai-pricing-price">$${BASE_PRICE.toLocaleString('es-MX')}</span>
                  <span class="bai-pricing-mxn">MXN</span>
                </div>
                <div class="bai-pricing-feats">
                  <span>✓ Lista en ${DELIVERY_HRS} hrs</span>
                  <span>✓ Dominio .com 1 año</span>
                  <span>✓ Pago único · sin mensualidad</span>
                  <span>✓ Garantía 7 días</span>
                </div>
              </div>
              <div class="bai-pricing-right">
                <button type="button" class="bai-cta bai-cta-primary" id="bai-buy">
                  <span class="bai-cta-emo">♥</span>
                  <span class="bai-cta-text">Lo amo así<br><b>Contratar →</b></span>
                </button>
                <button type="button" class="bai-cta bai-cta-secondary" id="bai-customize">
                  <span class="bai-cta-emo">✦</span>
                  <span class="bai-cta-text">Personalizar al 1000%<br><b>Hablar con Ismael →</b></span>
                </button>
              </div>
            </div>

            <div class="bai-actions">
              <button type="button" class="bai-btn bai-btn-ghost" id="bai-download">⬇ Descargar HTML</button>
              <button type="button" class="bai-btn bai-btn-ghost" id="bai-edit-toggle">✎ Pedir cambios a la IA</button>
              <button type="button" class="bai-btn bai-btn-ghost" id="bai-restart">↻ Empezar de cero</button>
            </div>

            <div class="bai-edit" id="bai-edit" style="display:none">
              <label class="bai-label" for="bai-edit-input">¿Qué quieres cambiar?</label>
              <textarea
                id="bai-edit-input"
                class="bai-textarea bai-textarea-small"
                rows="2"
                maxlength="400"
                placeholder="Ejemplo: cambia la paleta a verdes pastel y agrega una sección de menú."
              ></textarea>
              <div class="bai-row">
                <button type="button" class="bai-btn bai-btn-primary" id="bai-edit-apply">
                  Aplicar cambios ✦
                </button>
                <span class="bai-mini">↳ La IA reescribe tu página con tu nota.</span>
              </div>
            </div>
          </div>

          <!-- ETAPA ERROR -->
          <div class="bai-stage" data-bai-stage id="bai-stage-error" style="display:none">
            <div class="bai-error">
              <p class="bai-error-title">Ups — algo salió mal.</p>
              <p class="bai-error-msg" id="bai-error-msg">No pude conectar con la IA.</p>
              <button type="button" class="bai-btn bai-btn-primary" id="bai-retry">Reintentar</button>
              <a class="bai-btn bai-btn-ghost" target="_blank" rel="noopener" href="${waLink('Hola Ismael, el generador IA me marcó error. ¿Me ayudas?')}">Escribir a WhatsApp</a>
            </div>
          </div>
        </div>
      </div>
    `;
    return wrap;
  }

  function showStage(name){
    $$('[data-bai-stage]').forEach(el => el.style.display = 'none');
    const target = document.getElementById('bai-stage-' + name);
    if (target) target.style.display = 'block';
  }

  // -------- Open / Close --------
  function openModal(){
    const bd = $('#bai-backdrop');
    if (!bd) return;
    bd.classList.add('open');
    document.body.classList.add('bai-locked');
    if (state.html){
      renderPreview(state.html);
      showStage('preview');
    } else {
      showStage('prompt');
      const ta = $('#bai-prompt');
      if (ta) setTimeout(()=>ta.focus(), 150);
    }
  }
  function closeModal(){
    const bd = $('#bai-backdrop');
    if (!bd) return;
    bd.classList.remove('open');
    document.body.classList.remove('bai-locked');
  }

  // -------- Render de preguntas dinámicas --------
  function renderQuestions(questions){
    const list = $('#bai-questions-list');
    list.innerHTML = '';
    state.questions = questions;
    state.answers = {};

    questions.forEach((q, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'bai-q';
      wrap.dataset.qid = q.id || ('q' + (idx+1));

      const num = document.createElement('span');
      num.className = 'bai-q-num';
      num.textContent = String(idx + 1).padStart(2, '0');
      wrap.appendChild(num);

      const lbl = document.createElement('p');
      lbl.className = 'bai-q-label';
      lbl.textContent = q.label || ('Pregunta ' + (idx+1));
      wrap.appendChild(lbl);

      if (q.type === 'options' && Array.isArray(q.options)) {
        const opts = document.createElement('div');
        opts.className = 'bai-q-opts';
        q.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'bai-q-chip';
          btn.dataset.value = opt;
          btn.textContent = opt;
          btn.addEventListener('click', () => {
            // Toggle: deseleccionar todos los chips de esta pregunta y marcar éste
            opts.querySelectorAll('.bai-q-chip').forEach(c => c.classList.remove('selected'));
            btn.classList.add('selected');
            state.answers[wrap.dataset.qid] = opt;
          });
          opts.appendChild(btn);
        });
        wrap.appendChild(opts);
      } else {
        // text input
        const inp = document.createElement('textarea');
        inp.className = 'bai-q-text';
        inp.rows = 2;
        inp.maxLength = 300;
        inp.placeholder = q.placeholder || 'Tu respuesta…';
        inp.addEventListener('input', () => {
          state.answers[wrap.dataset.qid] = inp.value.trim();
        });
        wrap.appendChild(inp);
      }

      list.appendChild(wrap);
    });
  }

  // -------- Render preview --------
  function renderPreview(html){
    const iframe = $('#bai-iframe');
    if (!iframe) return;
    iframe.srcdoc = html;
  }

  // -------- Save / Load --------
  function saveLast(){
    try {
      localStorage.setItem(LS_LAST, JSON.stringify({
        prompt: state.prompt, html: state.html, answers: state.answers, ts: Date.now()
      }));
    } catch(_) {}
  }
  function loadLast(){
    try {
      const raw = localStorage.getItem(LS_LAST);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj && obj.html){
        state.prompt = obj.prompt || '';
        state.html = obj.html || '';
        state.answers = obj.answers || {};
      }
    } catch(_) {}
  }

  // -------- Construir mega prompt --------
  function buildMegaPrompt(){
    const lines = [];
    lines.push(`Eres el diseñador senior de ZIV CREATIVO, un estudio mexicano que crea páginas web editoriales premium que VENDEN.`);
    lines.push('');
    lines.push(`Tu tarea: crear UN SOLO archivo HTML completo y autocontenido (con <!doctype html>, <html>, <head> con <style> y <body>) para el siguiente proyecto:`);
    lines.push('');
    lines.push(`PROYECTO DEL CLIENTE: "${state.prompt}"`);
    lines.push('');
    lines.push(`BRIEFING (respuestas del cliente a 5 preguntas clave):`);
    state.questions.forEach((q, i) => {
      const id = q.id || ('q' + (i+1));
      const ans = state.answers[id] || '(sin respuesta)';
      lines.push(`${i+1}. ${q.label} → ${ans}`);
    });
    lines.push('');
    lines.push(`REGLAS DE DISEÑO (críticas):`);
    lines.push(`- Nivel: PREMIUM, editorial, tipo revista. Nada de plantilla genérica.`);
    lines.push(`- Fuentes Google: 'Playfair Display' (serif italic para headlines) + 'Space Grotesk' (sans para body) + 'Caveat' (script para acentos). Cárgalas con <link>.`);
    lines.push(`- Paleta: aplica la elegida por el cliente con elegancia. Usa máximo 3-4 colores. Incluye un color de acento bien usado.`);
    lines.push(`- Mobile-first responsive. Margenes generosos. Tipografía grande y respirable.`);
    lines.push(`- Microinteracciones sutiles (hover, transiciones de 200-300ms).`);
    lines.push(`- Texturas suaves o gradientes ligeros para profundidad.`);
    lines.push('');
    lines.push(`ESTRUCTURA OBLIGATORIA de la página:`);
    lines.push(`1. HERO con headline impactante (mezcla serif italic + sans bold), subtítulo persuasivo, y un CTA principal acorde a la respuesta del cliente.`);
    lines.push(`2. Sección "Por qué nosotros" con 3 pilares (propuesta de valor) específicos al giro del negocio.`);
    lines.push(`3. Sección de servicios/catálogo/menú según el giro, con tarjetas elegantes (mínimo 4 items con título + descripción + ícono o número).`);
    lines.push(`4. Sección de testimonios o prueba social (2-3 reseñas inventadas pero creíbles).`);
    lines.push(`5. Sección de contacto con un botón grande de WhatsApp al número 55 4016 1213.`);
    lines.push(`6. Footer minimalista con redes sociales (placeholders), aviso de privacidad, y la marca "Hecha con ZIV CREATIVO ✦".`);
    lines.push('');
    lines.push(`COPY:`);
    lines.push(`- Español de México, persuasivo, vendedor pero no agresivo.`);
    lines.push(`- Headlines cortos, impactantes, con personalidad.`);
    lines.push(`- Sin emojis sobrados. Usa "✦", "★", "↳" como acentos editoriales.`);
    lines.push(`- Tono según la "vibra" elegida por el cliente.`);
    lines.push('');
    lines.push(`Devuelve SOLO el HTML completo, sin explicaciones, dentro de un bloque \`\`\`html ... \`\`\`. Asegúrate que TODO el CSS esté dentro del <style> del <head> y que el archivo abra correctamente en cualquier browser.`);
    return lines.join('\n');
  }

  // -------- Acciones --------
  async function doBriefing(){
    if (state.busy) return;
    const txt = $('#bai-prompt').value.trim();
    if (txt.length < 5){
      $('#bai-prompt').focus();
      return;
    }
    state.busy = true;
    state.prompt = txt;
    showStage('briefing-loading');
    try {
      const data = await apiCall('/briefing', { prompt: txt });
      const parsed = extractJSON(data && data.text);
      const questions = (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0)
        ? parsed.questions
        : FALLBACK_QUESTIONS;
      renderQuestions(questions);
      showStage('questions');
    } catch (err){
      console.warn('[BAI] briefing fallback', err);
      renderQuestions(FALLBACK_QUESTIONS);
      showStage('questions');
    } finally {
      state.busy = false;
    }
  }

  async function doGenerate(){
    if (state.busy) return;
    // Validar mínimo 3 respuestas
    const ansCount = Object.values(state.answers).filter(v => v && String(v).trim()).length;
    if (ansCount < 3){
      showToast('Contesta al menos 3 preguntas para que quede a tu gusto');
      return;
    }
    state.busy = true;
    showStage('generate-loading');
    try {
      const mega = buildMegaPrompt();
      const data = await apiCall('/generate', { prompt: mega });
      const html = extractHTML(data && data.text);
      if (!html) throw new Error('La IA devolvió vacío.');
      state.html = html;
      saveLast();
      renderPreview(html);
      showStage('preview');
    } catch (err){
      console.error('[BAI] generate error', err);
      const msgEl = $('#bai-error-msg');
      if (msgEl) msgEl.textContent = err.message || 'Error desconocido.';
      showStage('error');
    } finally {
      state.busy = false;
    }
  }

  async function doEdit(instruction){
    if (state.busy || !state.html) return;
    state.busy = true;
    showStage('generate-loading');
    try {
      const data = await apiCall('/edit', { html: state.html, instruction });
      const html = extractHTML(data && data.text);
      if (!html) throw new Error('La IA devolvió vacío.');
      state.html = html;
      saveLast();
      renderPreview(html);
      showStage('preview');
    } catch (err){
      console.error('[BAI] edit error', err);
      const msgEl = $('#bai-error-msg');
      if (msgEl) msgEl.textContent = err.message || 'Error desconocido.';
      showStage('error');
    } finally {
      state.busy = false;
    }
  }

  function downloadHTML(){
    if (!state.html) return '';
    const safe = (state.prompt || 'pagina-web')
      .slice(0,40).replace(/[^a-z0-9]+/gi,'-').toLowerCase() || 'pagina-web';
    const fname = `ziv-${safe}.html`;
    const blob = new Blob([state.html], {type:'text/html;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return fname;
  }

  function ctaBuy(){
    if (!state.html) return;
    const fname = downloadHTML();
    const summary = (state.prompt || '').slice(0,140);
    const msg =
`Hola Ismael ✦

Acabo de generar mi página con el generador IA de ZIV.

Idea: "${summary}"

Me ENCANTÓ como quedó y quiero contratarla tal cual (la versión premium en 48h por $${BASE_PRICE.toLocaleString('es-MX')} MXN).

Te adjunto el HTML que acabo de descargar: ${fname}

¿Cuándo arrancamos?`;
    showToast('HTML descargado ✓ Abriendo WhatsApp…');
    setTimeout(() => {
      window.open(waLink(msg), '_blank', 'noopener');
    }, 500);
  }

  function ctaCustomize(){
    if (!state.html) return;
    const fname = downloadHTML();
    const summary = (state.prompt || '').slice(0,140);
    const msg =
`Hola Ismael ✦

Acabo de generar mi página con el generador IA de ZIV.

Idea: "${summary}"

Me gustó pero quiero PERSONALIZARLA al 1000% para que quede perfecta. Quiero pulir el diseño, copy y todos los detalles contigo.

Te adjunto el HTML que acabo de descargar como base: ${fname}

¿Cuándo platicamos para afinar todo?`;
    showToast('HTML descargado ✓ Abriendo WhatsApp…');
    setTimeout(() => {
      window.open(waLink(msg), '_blank', 'noopener');
    }, 500);
  }

  // -------- Wire handlers --------
  function attachHandlers(){
    $('#bai-close').addEventListener('click', closeModal);
    $('#bai-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'bai-backdrop') closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Etapa 1 → 2: prompt → briefing
    $('#bai-go-briefing').addEventListener('click', doBriefing);
    $('#bai-prompt').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doBriefing();
    });

    // Etapa 3 → 4: preguntas → generate
    $('#bai-generate-final').addEventListener('click', doGenerate);
    $('#bai-back-prompt').addEventListener('click', () => {
      showStage('prompt');
      $('#bai-prompt').focus();
    });

    // Etapa preview · CTAs
    $('#bai-buy').addEventListener('click', ctaBuy);
    $('#bai-customize').addEventListener('click', ctaCustomize);
    $('#bai-download').addEventListener('click', () => {
      downloadHTML();
      showToast('HTML descargado ✓');
    });

    // Editar
    $('#bai-edit-toggle').addEventListener('click', () => {
      const ed = $('#bai-edit');
      ed.style.display = (ed.style.display === 'none') ? 'block' : 'none';
      if (ed.style.display === 'block') $('#bai-edit-input').focus();
    });
    $('#bai-edit-apply').addEventListener('click', () => {
      const txt = $('#bai-edit-input').value.trim();
      if (txt.length < 3) return;
      doEdit(txt);
    });

    // Restart
    $('#bai-restart').addEventListener('click', () => {
      state.html = ''; state.prompt = ''; state.questions = []; state.answers = {};
      $('#bai-prompt').value = '';
      showStage('prompt');
      setTimeout(() => $('#bai-prompt').focus(), 100);
    });

    // Retry desde error
    $('#bai-retry').addEventListener('click', () => {
      if (state.questions.length > 0) doGenerate();
      else if (state.prompt) doBriefing();
      else showStage('prompt');
    });
  }

  function attachTriggers(){
    $$('[data-bai-open]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    });
  }

  // -------- API pública para el hero --------
  window.BAI_open = function(text){
    if (text && typeof text === 'string'){
      if (!document.getElementById('bai-backdrop')) init();
      const ta = document.getElementById('bai-prompt');
      if (ta) ta.value = text;
      state.prompt = text;
      openModal();
      // Disparar briefing automáticamente
      setTimeout(() => doBriefing(), 250);
    } else {
      openModal();
    }
  };

  function init(){
    if (document.getElementById('bai-backdrop')) return;
    document.body.appendChild(buildModal());
    loadLast();
    attachHandlers();
    attachTriggers();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
