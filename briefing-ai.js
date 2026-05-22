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

  // -------- Construir mega prompt (PREMIUM · WOW factor) --------
  function buildMegaPrompt(){
    const answersBlock = state.questions.map((q, i) => {
      const id = q.id || ('q' + (i+1));
      const ans = state.answers[id] || '(sin respuesta)';
      return `   ${i+1}. ${q.label}\n      → ${ans}`;
    }).join('\n');

    return (
`Eres el director creativo de ZIV CREATIVO, un estudio mexicano que diseña páginas web premiadas en Awwwards y FWA. Tu trabajo es producir páginas que MARAVILLEN al primer scroll, no plantillas genéricas.

═══════════════════════════════════════════════════════════════
PROYECTO DEL CLIENTE
═══════════════════════════════════════════════════════════════
"${state.prompt}"

BRIEFING (respuestas del cliente a 5 preguntas críticas):
${answersBlock}

═══════════════════════════════════════════════════════════════
TU MISIÓN
═══════════════════════════════════════════════════════════════
Crear UN SOLO archivo HTML autocontenido (incluye <!doctype html>, <html>, <head> con <style> + <link> fuentes, y <body>) que sea una pieza editorial PREMIUM digna de mostrar en Behance o Dribbble.

═══════════════════════════════════════════════════════════════
PROHIBIDO (lo que NUNCA debes hacer)
═══════════════════════════════════════════════════════════════
× NO uses Bootstrap, Tailwind CDN, ni frameworks. CSS 100% custom.
× NO uses fondo blanco puro #fff o negro puro #000. Siempre con un tinte (off-white #f7f2ea, ink #161618, etc.)
× NO uses Times New Roman, Arial, Helvetica directo. SIEMPRE fuentes Google.
× NO uses layouts simétricos aburridos tipo "3 columnas iguales". Rompe la simetría.
× NO uses iconos genéricos de Font Awesome. Usa unicode editorial: ✦ ★ ◆ ◉ ↳ → // — ↗ ✱ ◐
× NO repitas "Lorem ipsum" ni placeholders genéricos. Copy real y persuasivo.
× NO uses gradientes saturados tipo "blue to purple". Gradientes sutiles o paletas planas con personalidad.

═══════════════════════════════════════════════════════════════
OBLIGATORIO (elementos de páginas premiadas)
═══════════════════════════════════════════════════════════════
✦ Fuentes Google obligatorias (cárgalas con <link rel="preconnect"> + <link href="https://fonts.googleapis.com/css2?family=...">):
   - 'Playfair Display' (Italic 400 + 900, para headlines en italic gigantes)
   - 'Space Grotesk' (300, 500, 700, para body y UI)
   - 'Archivo Black' (400, para acentos pesados / display)
   - 'Caveat' (700, para guiños escritos a mano)
✦ Headline del hero MEZCLADO: combina Playfair italic GIGANTE (clamp 3rem a 7rem) + Archivo Black sans en la misma frase, en líneas separadas para crear contraste editorial.
✦ Mínimo UNA textura/efecto: noise SVG sutil, blob gradiente blur, grain overlay, o gradient orb pegado al hero.
✦ Marcadores editoriales decorativos: '// SECCIÓN' en kicker antes de los H2 (estilo magazine), pequeños "↳" en captions, "✦" en CTAs.
✦ Highlight en headline: una palabra clave subrayada con un trazo de color tipo marcador (background lima/coral con rotate -1deg, position relative + z-index -1).
✦ Tipografía respirable: line-height 1.15 en headlines, 1.6 en body, letter-spacing -0.02em en display.
✦ Microinteracciones: hover transitions con cubic-bezier(.16,1,.3,1), translate(-2px,-2px) + box-shadow offset 5px 5px 0 ink en botones, hover scale(1.03) en cards.
✦ Detalles editoriales: bordes con border-radius asimétricos (ej. 22px 4px 22px 4px), o anti-radius (esquinas duras), pero coherente con la vibra.
✦ Padding generoso: secciones con padding 120px 0 (desktop) / 70px 0 (móvil).

═══════════════════════════════════════════════════════════════
PALETA (según vibra del cliente)
═══════════════════════════════════════════════════════════════
- Aplica EXACTAMENTE la paleta que el cliente eligió, no inventes.
- Define las variables CSS al inicio:
  :root { --paper:#xxx; --ink:#xxx; --accent:#xxx; --soft:#xxx; }
- Usa máximo 4 colores: 1 fondo principal (paper), 1 texto principal (ink), 1 acento vibrante (para CTAs y highlights), 1 secundario neutro.
- NO uses muchos colores que distraigan.

═══════════════════════════════════════════════════════════════
ESTRUCTURA OBLIGATORIA (8 secciones, en este orden)
═══════════════════════════════════════════════════════════════
1. TOPBAR delgada con un mini-anuncio o tagline (ej. "Reserva con anticipo — promoción enero").
2. HEADER con marca a la izquierda + nav horizontal a la derecha + un CTA pill al final.
3. HERO ASIMÉTRICO con:
   - Kicker pequeño arriba (categoria/giro en mayúsculas con letter-spacing 4px).
   - Headline en 2-3 líneas mezclando italic + bold sans + un highlight de color.
   - Lead párrafo en serif italic.
   - 2 CTAs (uno sólido, uno ghost outline).
   - Trust strip abajo (★★★★★ rating + N reseñas) o badges (✓ feature).
   - Algún elemento visual: foto placeholder con borde duro 2px, o ilustración con gradient orb detrás.
4. MARQUEE / CINTILLA infinita con palabras clave del negocio separadas por · — animation: marquee 30s linear infinite.
5. SECCIÓN PROBLEMA (PAIN): "Lo que nadie te dice" con 4-6 puntos de dolor del cliente ideal, cada uno con × roja y texto persuasivo.
6. SECCIÓN PROPUESTA con 3 pilares (numerados 01., 02., 03. en display gigante) con título + descripción específica al giro.
7. SECCIÓN SERVICIOS/CATÁLOGO/MENÚ con 4-6 cards editoriales (no genéricas — cards con número grande arriba, título serif italic, descripción, precio si aplica, hover transform).
8. SECCIÓN AUTORIDAD con foto del fundador (placeholder con bordes editoriales) + bio breve + badges de credenciales.
9. SECCIÓN TESTIMONIOS con 3 reseñas en cards verticales con avatar circular + ★★★★★ + texto + nombre + giro del cliente.
10. SECCIÓN CTA FINAL grande con headline + 2 botones (WhatsApp 55 4016 1213 + email/agenda).
11. FOOTER editorial con grid 3-4 columnas: marca + tagline, navegación, contacto, redes con unicode (instagram, facebook, etc.). Bottom bar con "© 2026" + "Hecha con ZIV CREATIVO ✦".

═══════════════════════════════════════════════════════════════
COPY (escritura)
═══════════════════════════════════════════════════════════════
- Español de México, voz de vendedor experto, conversacional pero con criterio editorial.
- Headlines cortos, en 2-3 líneas, con contraste italic + bold.
- Subtítulos descriptivos que vendan beneficio, no característica.
- Inventa nombres realistas del negocio del cliente (si es cafetería: "Café Nogal", "Tienda de moda: Mara&Co", etc.).
- Precios coherentes con el giro y la vibra premium elegida.
- Testimonios verosímiles con nombres mexicanos comunes (Andrea, Mariana, Diego, Sofía, etc.).
- Tono según la "vibra" elegida en el briefing.

═══════════════════════════════════════════════════════════════
TÉCNICA
═══════════════════════════════════════════════════════════════
- Mobile-first responsive con media queries en max-width: 720px.
- Todo el CSS en <style> dentro de <head>. Nada de scripts externos.
- Usa CSS Grid + Flexbox modernos. Variables CSS al inicio.
- Imágenes: usa placeholders con \`https://picsum.photos/seed/XXX/600/800\` (cambia el seed según contexto, ej "cafe", "fashion", "spa").
- WhatsApp link real: https://wa.me/525540161213?text=Hola%2C%20vengo%20de%20tu%20p%C3%A1gina

═══════════════════════════════════════════════════════════════
ENTREGABLE
═══════════════════════════════════════════════════════════════
Devuelve EXCLUSIVAMENTE el HTML completo dentro de un bloque \`\`\`html ... \`\`\`. Nada de explicaciones, nada de texto antes o después. El archivo debe abrir directamente en un navegador y verse 100% terminado, sin errores de sintaxis, con todo dentro de <style> en <head>.

Sé valiente. Diseña algo que pueda postearse en Awwwards mañana. Sorpréndeme.`
    );
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
