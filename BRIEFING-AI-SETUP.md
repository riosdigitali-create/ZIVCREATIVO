# BRIEFING AI · Guía de instalación paso a paso

Ismael, esta es la guía completa para que el módulo de "Briefing dinámico con IA" funcione en tu sitio ZIV CREATIVO. Léela una vez de arriba abajo antes de empezar; toma 15-20 minutos en total.

---

## Resumen de la arquitectura

```
[Tu sitio: ZIV creativo (estático)]
        │
        │ POST /briefing  /generate  /edit   (CORS)
        ▼
[Cloudflare Worker: briefing-ai-worker.js]   ← aquí vive la API key
        │
        │ POST con tu GEMINI_API_KEY
        ▼
[Google Gemini API]
```

Ventaja: tu sitio sigue siendo 100% estático (sirve igual desde GitHub Pages, Cloudflare Pages o donde sea). El Worker es un endpoint aparte y barato (gratis hasta 100k peticiones/día).

---

## Archivos creados

| Ruta | Para qué sirve | ¿Va al sitio público? |
|---|---|---|
| `briefing-ai.css` | Estilos del modal | **Sí** — súbelo |
| `briefing-ai.js` | Lógica del frontend | **Sí** — súbelo |
| `index.html` (modificado) | Triggers + scripts | **Sí** — súbelo |
| `briefing-ai-worker.js` | Proxy seguro a Gemini | **No** — va al Worker |
| `BRIEFING-AI-SETUP.md` | Esta guía | No es necesario |

---

## PASO 1 — Obtener tu API key de Google Gemini (gratis)

1. Abre **Google AI Studio**: https://aistudio.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google (la misma de Gmail está bien).
3. Acepta los términos si te los muestra.
4. Click en **"Create API key"** (botón azul arriba a la derecha).
5. Si te pide elegir proyecto, elige **"Create API key in new project"**.
6. Te aparecerá una key larga tipo `AIzaSy...`. **Cópiala y guárdala en un lugar seguro** — no la vas a poder volver a ver completa.

> **Importante:** esta key NO va a ningún archivo del repositorio. Sólo la pegarás dentro del dashboard de Cloudflare en el Paso 3. Trátala como una contraseña.

**Cuota gratuita actual:** 15 peticiones por minuto, 1,500 al día. Más que suficiente para una landing en producción.

---

## PASO 2 — Crear y desplegar el Cloudflare Worker

Tienes dos caminos: el rápido (web, sin instalar nada) y el de desarrollador (CLI). Elige uno.

### Opción A · Dashboard web (recomendada si no quieres tocar terminal)

1. Entra a **Cloudflare Workers**: https://dash.cloudflare.com → **Workers & Pages**.
2. Click en **"Create application"** → **"Create Worker"**.
3. Ponle un nombre, p.ej. `briefing-ai`. Cloudflare te dará una URL como `https://briefing-ai.TU-USUARIO.workers.dev`. **Apunta esta URL** — la usarás en el Paso 4.
4. Click en **"Deploy"** (te despliega un Worker dummy).
5. Una vez desplegado, click en **"Edit code"**.
6. Borra todo el código del editor.
7. Abre el archivo `briefing-ai-worker.js` que te creé, **copia todo el contenido** y **pégalo** en el editor de Cloudflare.
8. Antes de guardar: dentro del archivo verás una constante `ALLOWED_ORIGINS`. Edítala con los dominios desde donde se servirá tu sitio. Ejemplo:
   ```js
   const ALLOWED_ORIGINS = [
     'https://riosdigitali.github.io',          // tu dominio GitHub Pages
     'https://ziv-creativo.pages.dev',           // si migras a Cloudflare Pages
     'https://ziv-creativo.com',                 // tu dominio personalizado, si lo tienes
     'http://localhost:5500',                    // para pruebas locales con Live Server
     'http://127.0.0.1:5500',
   ];
   ```
9. Click en **"Save and deploy"**.
10. Verifica que funciona: abre `https://briefing-ai.TU-USUARIO.workers.dev/` en una pestaña. Debes ver `{"ok":true,"service":"briefing-ai","model":"gemini-2.0-flash"}`.

### Opción B · CLI con Wrangler (si prefieres)

```bash
npm install -g wrangler
wrangler login
mkdir briefing-ai && cd briefing-ai
# copia briefing-ai-worker.js como src/index.js
mkdir src && cp ../briefing-ai-worker.js src/index.js

# crea wrangler.toml con:
cat > wrangler.toml <<EOF
name = "briefing-ai"
main = "src/index.js"
compatibility_date = "2024-09-01"
EOF

wrangler deploy
```

Luego configura el secret (ver Paso 3 abajo).

---

## PASO 3 — Configurar la API key como variable de entorno (secret)

**No pegues la key dentro del archivo del Worker.** Ponla como secret cifrado:

### Vía web (Opción A del Paso 2):
1. En el dashboard de tu Worker, ve a **"Settings"** → **"Variables and Secrets"**.
2. Click en **"Add variable"**.
3. **Type:** Secret. **Variable name:** `GEMINI_API_KEY`. **Value:** pega tu key de Gemini.
4. Click en **"Save and deploy"**.

### Vía CLI (Opción B):
```bash
wrangler secret put GEMINI_API_KEY
# te pedirá pegar la key — pégala y enter
```

---

## PASO 4 — Conectar el frontend al Worker

Abre `index.html` y busca esta línea cerca del final:

```html
<script>
  window.BAI_WORKER_URL = 'https://briefing-ai.TU-USUARIO.workers.dev';
</script>
```

Reemplaza `TU-USUARIO` por tu nombre real de Cloudflare (la URL que apuntaste en el Paso 2.3). Guarda.

---

## PASO 5 — Probar localmente

1. Abre la carpeta `ZIV creativo` con **VS Code** (o tu editor).
2. Instala la extensión **"Live Server"** (Ritwick Dey).
3. Click derecho sobre `index.html` → **"Open with Live Server"**.
4. Se abre en `http://localhost:5500/index.html` o `http://127.0.0.1:5500/index.html`.
5. Verifica que esos orígenes están en `ALLOWED_ORIGINS` del Worker (los puse por defecto en el ejemplo).
6. Click en el FAB **"Generar con IA ✦"** abajo a la derecha.
7. Escribe algo, p.ej. *"una landing para mi cafetería de especialidad en Roma Norte"*.
8. Debe aparecer el formulario con preguntas en ~3-5 segundos. Responde y dale a Generar.
9. La landing aparece en el iframe. Pruébala, descárgala, pídele cambios.

### ¿No funciona?

| Síntoma | Causa probable | Fix |
|---|---|---|
| `CORS error` en consola | Tu origen no está en `ALLOWED_ORIGINS` | Edita el Worker, añade el origen exacto, guarda |
| `GEMINI_API_KEY no configurada` | Te saltaste el Paso 3 | Añádela como Secret en Settings del Worker |
| `Gemini 429` | Cuota gratuita excedida | Espera 1 minuto o sube de plan |
| El JSON viene mal y caen las preguntas genéricas | Modelo se confundió con prompt corto | Ya tiene fallback automático — funciona igual |
| Modal no abre | Falta `briefing-ai.js` en la raíz, o ruta mal | Verifica que está junto a `index.html` |

---

## PASO 6 — Desplegar a producción

### Si estás en **GitHub Pages**:
1. Sube los 3 archivos nuevos (`briefing-ai.css`, `briefing-ai.js`, y el `index.html` modificado) a tu repo.
2. Asegúrate de que tu dominio `https://TU-USUARIO.github.io` (o tu dominio custom) está en `ALLOWED_ORIGINS` del Worker.
3. Listo. Cloudflare se encarga del resto.

### Si migras (o ya estás) en **Cloudflare Pages**:
1. Sube los archivos al repo.
2. Cloudflare Pages re-despliega automáticamente.
3. Asegúrate de que `https://*.pages.dev` y tu dominio custom están en `ALLOWED_ORIGINS`.

> **Tip pro:** si te animas, en Cloudflare Pages podrías meter el Worker como **"Pages Function"** dentro del mismo proyecto, así el frontend llama a `/api/briefing` directamente (mismo origen, sin CORS). Si quieres que lo migre a esa estructura, avísame.

---

## ¿Qué hace cada endpoint?

| Endpoint | Body | Devuelve |
|---|---|---|
| `POST /briefing` | `{prompt: string}` | `{text: "<JSON con preguntas>"}` |
| `POST /generate` | `{prompt: string}` (prompt enriquecido) | `{text: "```html ... ```"}` |
| `POST /edit` | `{html, instruction}` | `{text: "```html ... ```"}` |

El frontend extrae el HTML de los bloques markdown y parsea el JSON; si algo viene mal, hay fallback automático.

---

## Seguridad — checklist

- [x] La API key vive como Secret en Cloudflare, NUNCA en el código del frontend.
- [x] El Worker valida CORS con whitelist de dominios.
- [x] Timeout de 60s en frontend y 55s en Worker.
- [x] El iframe del preview usa `sandbox="allow-scripts"` (sin `allow-same-origin`) para que el HTML generado no pueda tocar tu sitio.
- [x] El frontend valida mínimo 5 caracteres antes de enviar.
- [x] Fallback de preguntas si el JSON viene mal formado.

---

## Costes

- **Cloudflare Workers:** 100,000 peticiones/día gratis. Cada landing son 2-3 peticiones, así que tienes margen para ~30,000 landings al día gratis.
- **Gemini 2.0 Flash:** 1,500 peticiones/día gratis. Si pasas eso, el plan de pago empieza en ~$0.075 por millón de tokens de input. Una landing usa ~3,000 tokens en total → costo cero a baja escala.

---

## Si quieres extenderlo

Ideas que puedes pedirme luego:
- Capturar email del usuario antes de generar (lead magnet para tu cotizador).
- Botón "Quiero ESTA landing pero hecha por humano" que rellene tu cotizador con el briefing automáticamente.
- A/B test: si genera más leads tener el FAB visible vs solo el botón del hero.
- Persistir landings generadas en KV de Cloudflare (no sólo localStorage).
- Añadir analytics: contar cuántos pasan de paso 1 → paso 2 → paso 3 → descarga.

---

Si algo del setup falla, copia el error de consola y mándamelo. Lo afinamos.
