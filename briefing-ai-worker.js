/* =====================================================
   BRIEFING AI · Cloudflare Worker
   Proxy seguro entre el frontend y la API de Google Gemini.
   La API key NUNCA viaja al navegador: vive como variable
   de entorno (Settings → Variables → GEMINI_API_KEY) en
   el dashboard de Cloudflare.
   =====================================================
   Endpoints expuestos (POST):
     /briefing  body: { prompt }                  -> { text } (JSON con preguntas)
     /generate  body: { prompt }                  -> { text } (HTML envuelto en ```html)
     /edit      body: { html, instruction }       -> { text } (HTML envuelto en ```html)

   Despliegue rápido: ver BRIEFING-AI-SETUP.md
   ===================================================== */

// Modelo Gemini gratuito recomendado en mayo 2026.
// Si Google cambia el nombre, ajústalo aquí.
const MODEL = 'gemini-flash-latest';
const API_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// CORS — pon aquí tu(s) dominio(s) o '*' si quieres permitir cualquiera.
// Recomendado: lista los dominios reales en producción.
const ALLOWED_ORIGINS = [
  'https://ziv-creativo.pages.dev',
  'https://www.tu-dominio.com',
  'http://localhost:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'null',
];

// ---------- System prompts (los que pediste) ----------
const SYS_BRIEFING = `Eres un experto en briefing de proyectos web. El usuario describirá lo que quiere y debes devolver entre 3 y 5 preguntas clave que realmente cambien el diseño final. NO preguntes obviedades. Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura, sin texto adicional, sin markdown:
{
  "preguntas": [
    {
      "id": "identificador_corto",
      "pregunta": "texto de la pregunta",
      "tipo": "texto" | "select" | "checkbox",
      "opciones": ["opcion1", "opcion2"]
    }
  ]
}
Las opciones solo aplican para tipos select y checkbox. Las preguntas deben ser específicas al proyecto descrito por el usuario.`;

const SYS_GENERATE = `Eres un desarrollador web experto. Genera UN SOLO archivo HTML completo y autocontenido según el briefing. Requisitos obligatorios:
- Un único archivo HTML con CSS y JS en línea (nada de archivos externos excepto CDN)
- Tailwind CSS desde CDN (https://cdn.tailwindcss.com)
- Diseño moderno, responsive (mobile-first), accesible
- Paleta de colores armónica acorde al tono pedido
- Imágenes desde https://images.unsplash.com con búsquedas relevantes
- Tipografía con Google Fonts si encaja
- Iconos con lucide via CDN si hacen falta
- NO incluyas explicaciones ni comentarios de texto fuera del código
- Devuelve el código envuelto entre etiquetas \`\`\`html y \`\`\``;

const SYS_EDIT = `Eres un desarrollador web experto. Recibirás un HTML completo y una instrucción de cambio. Devuelve el HTML modificado COMPLETO (no parches), envuelto entre \`\`\`html y \`\`\`. Mantén la misma estructura general salvo que la instrucción pida lo contrario. NO añadas explicaciones fuera del código.`;

// ---------- Helpers ----------
function corsHeaders(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*');
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

async function callGemini(apiKey, systemInstruction, userText, opts = {}) {
  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      thinkingConfig: { thinkingBudget: 0 },
      ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 55000);
  try {
    const r = await fetch(`${API_BASE}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Gemini ${r.status}: ${errText.slice(0, 300)}`);
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (!text) {
      const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || 'sin contenido';
      throw new Error(`Respuesta vacía de Gemini (${reason})`);
    }
    return text;
  } finally {
    clearTimeout(t);
  }
}

// ---------- Handlers ----------
async function handleBriefing(req, env, origin) {
  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
    return json({ error: 'prompt inválido (mínimo 5 caracteres)' }, 400, origin);
  }
  const text = await callGemini(env.GEMINI_API_KEY, SYS_BRIEFING, prompt.trim(), {
    temperature: 0.5,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
  });
  return json({ text }, 200, origin);
}

async function handleGenerate(req, env, origin) {
  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
    return json({ error: 'prompt inválido' }, 400, origin);
  }
  const text = await callGemini(env.GEMINI_API_KEY, SYS_GENERATE, prompt.trim(), {
    temperature: 0.85,
    maxOutputTokens: 8192,
  });
  return json({ text }, 200, origin);
}

async function handleEdit(req, env, origin) {
  const { html, instruction } = await req.json();
  if (!html || !instruction) {
    return json({ error: 'faltan html o instruction' }, 400, origin);
  }
  const userText = `INSTRUCCIÓN DE CAMBIO:\n${instruction}\n\nHTML ACTUAL:\n\`\`\`html\n${html}\n\`\`\``;
  const text = await callGemini(env.GEMINI_API_KEY, SYS_EDIT, userText, {
    temperature: 0.7,
    maxOutputTokens: 8192,
  });
  return json({ text }, 200, origin);
}

// ---------- Entry ----------
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';

    // Preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (req.method === 'GET' && url.pathname === '/') {
      return json({ ok: true, service: 'briefing-ai', model: MODEL }, 200, origin);
    }

    if (req.method !== 'POST') {
      return json({ error: 'método no permitido' }, 405, origin);
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: 'GEMINI_API_KEY no configurada en el Worker' }, 500, origin);
    }

    try {
      switch (url.pathname) {
        case '/briefing': return await handleBriefing(req, env, origin);
        case '/generate': return await handleGenerate(req, env, origin);
        case '/edit':     return await handleEdit(req, env, origin);
        default:          return json({ error: 'ruta no encontrada' }, 404, origin);
      }
    } catch (err) {
      console.error(err);
      const msg = (err && err.message) || 'error interno';
      return json({ error: msg }, 500, origin);
    }
  },
};
