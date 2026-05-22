/* =====================================================================
   BRIEFING AI · ZIV CREATIVO
   Frontend del generador de páginas web con IA.
   - Conecta el hero conversacional (#hero-idea-input) con el Cloudflare
     Worker que llama a Gemini.
   - Inyecta un modal full-screen con preview en iframe + acciones.
   - Atajos: cualquier elemento [data-bai-open] abre el modal.
   - Estado interno usa window.BAI_open(text) y #bai-prompt para
     compatibilidad con el JS del hero.
   ===================================================================== */
(function () {
  'use strict';

  const WORKER_URL = window.BAI_WORKER_URL || 'https://ziv-ai.riosdigitali.workers.dev';
  const LS_LAST = 'ziv_bai_last';
  const WHATSAPP_NUM = '525540161213';

  // -------- helpers --------
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

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

  // -------- API calls al Worker --------
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

  function extractHTML(text){
    if (!text) return '';
    const m = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
    return (m ? m[1] : text).trim();
  }

  // -------- Estado --------
  const state = {
    prompt: '',
    html: '',
    busy: false,
  };

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
          <p class="bai-head-sub">Cuéntame tu idea y la IA arma tu primer borrador en segundos. Después podemos hacerla premium en 48 horas.</p>
        </header>

        <div class="bai-body">
          <div class="bai-stage" data-bai-stage id="bai-stage-prompt">
            <label class="bai-label" for="bai-prompt">¿Cuál es tu idea de página web?</label>
            <textarea
              id="bai-prompt"
              class="bai-textarea"
              rows="4"
              maxlength="600"
              placeholder="Ejemplo: una página para mi cafetería de especialidad en Roma Norte, vibe minimalista y agenda online."
            ></textarea>
            <div class="bai-row">
              <button type="button" class="bai-btn bai-btn-primary" id="bai-generate">
                <span>Crear mi página ✦</span>
              </button>
              <span class="bai-mini">↳ Gratis · sin tarjeta · sin registro</span>
            </div>
          </div>

          <div class="bai-stage" data-bai-stage id="bai-stage-loading" style="display:none">
            <div class="bai-loader">
              <div class="bai-spinner" aria-hidden="true"></div>
              <p class="bai-loader-title">Generando tu página con IA…</p>
              <p class="bai-loader-sub">Estoy escribiendo el copy, eligiendo paleta y armando las secciones. Tarda 10-30 segundos.</p>
            </div>
          </div>

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

            <div class="bai-actions">
              <a id="bai-cta-wa" class="bai-btn bai-btn-primary" target="_blank" rel="noopener">
                Lo amo, cotizar la versión real →
              </a>
              <button type="button" class="bai-btn bai-btn-ghost" id="bai-download">
                ⬇ Descargar HTML
              </button>
              <button type="button" class="bai-btn bai-btn-ghost" id="bai-edit-toggle">
                ✎ Pedir cambios
              </button>
              <button type="button" class="bai-btn bai-btn-ghost" id="bai-restart">
                ↻ Empezar de cero
              </button>
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

  function renderPreview(html){
    const iframe = $('#bai-iframe');
    if (!iframe) return;
    iframe.srcdoc = html;
    const wa = $('#bai-cta-wa');
    if (wa){
      const summary = (state.prompt || '').slice(0,120);
      const msg = `Hola Ismael, generé un borrador con tu IA: "${summary}". Quiero cotizar la versión real lista en 48 horas. ¿Cuándo platicamos?`;
      wa.href = waLink(msg);
    }
  }

  function saveLast(prompt, html){
    try { localStorage.setItem(LS_LAST, JSON.stringify({prompt, html, ts: Date.now()})); }
    catch(_) {}
  }
  function loadLast(){
    try {
      const raw = localStorage.getItem(LS_LAST);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj && obj.html){
        state.prompt = obj.prompt || '';
        state.html = obj.html || '';
      }
    } catch(_) {}
  }

  async function doGenerate(prompt){
    if (state.busy) return;
    state.busy = true;
    state.prompt = (prompt || '').trim();
    if (state.prompt.length < 5){
      showStage('prompt');
      state.busy = false;
      return;
    }
    showStage('loading');
    try {
      const enriched =
        `Eres el generador de páginas web premium de ZIV CREATIVO (México). ` +
        `Devuelve UN SOLO archivo HTML completo y autocontenido (incluye <!doctype html>, <html>, <head> con <style> y <body>). ` +
        `Diseño editorial premium, mobile-first, fuentes Google (Playfair Display + Space Grotesk), paleta acorde al negocio. ` +
        `Incluye: hero con headline y CTA principal, sección de propuesta de valor (3 puntos), sección de servicios o catálogo según el giro, sección de contacto con botón WhatsApp 55 4016 1213, footer. ` +
        `Copy en español de México, persuasivo, sin emojis sobrados. Marca "Hecha con ZIV CREATIVO ✦" en el footer. ` +
        `PROYECTO DEL CLIENTE: "${state.prompt}"`;
      const data = await apiCall('/generate', { prompt: enriched });
      const html = extractHTML(data && data.text);
      if (!html) throw new Error('La IA devolvió vacío.');
      state.html = html;
      saveLast(state.prompt, html);
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
    showStage('loading');
    try {
      const data = await apiCall('/edit', { html: state.html, instruction });
      const html = extractHTML(data && data.text);
      if (!html) throw new Error('La IA devolvió vacío.');
      state.html = html;
      saveLast(state.prompt, html);
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
    if (!state.html) return;
    const safe = (state.prompt || 'pagina-web')
      .slice(0,40).replace(/[^a-z0-9]+/gi,'-').toLowerCase() || 'pagina-web';
    const blob = new Blob([state.html], {type:'text/html;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ziv-${safe}.html`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    showToast('HTML descargado ✓');
  }

  function attachHandlers(){
    $('#bai-close').addEventListener('click', closeModal);
    $('#bai-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'bai-backdrop') closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    $('#bai-generate').addEventListener('click', () => {
      doGenerate($('#bai-prompt').value);
    });
    $('#bai-prompt').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doGenerate($('#bai-prompt').value);
    });

    $('#bai-restart').addEventListener('click', () => {
      state.html = ''; state.prompt = '';
      $('#bai-prompt').value = '';
      showStage('prompt');
      setTimeout(() => $('#bai-prompt').focus(), 100);
    });

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

    $('#bai-download').addEventListener('click', downloadHTML);

    $('#bai-retry').addEventListener('click', () => {
      if (state.prompt) doGenerate(state.prompt);
      else showStage('prompt');
    });
  }

  function attachTriggers(){
    $$('[data-bai-open]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    });
  }

  window.BAI_open = function(text){
    if (text && typeof text === 'string'){
      if (!document.getElementById('bai-backdrop')) init();
      const ta = document.getElementById('bai-prompt');
      if (ta) ta.value = text;
      state.prompt = text;
      openModal();
      setTimeout(() => doGenerate(text), 250);
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
