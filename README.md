# ZIV Creativo · Web en 48 horas

Sitio público: https://zivcreativo.shop/

Página estática para GitHub Pages. Publicación existente desde `main`, carpeta raíz. El archivo `CNAME` conserva el dominio y no necesita cambiarse.

## Contenido

- `index.html`: oferta, condiciones, muestras y solicitud de demo gratis.
- `assets/web48.css`: estilos de la página de ventas.
- `assets/offer.mjs`: validación y preparación del mensaje de WhatsApp.
- `assets/web48-form.mjs`: interacción del formulario, sin guardar datos ni enviar mensajes automáticamente.
- `portafolio.html`, `thumbs/` y `perfil-cutout.png`: portafolio anterior conservado.

Las seis muestras de la página de ventas son Aritza Salazar, Maggie Salmerón, CAESI, AVIV, The Image Method y Mundo Simz. Los tres primeros fueron agregados el 31 de agosto de 2026 sin reemplazar los anteriores. Mantener estas muestras en `index.html`: la publicación actual es estática y no depende de un generador externo.

La demo no obliga a contratar. Precio de Web Esencial: $5,900 MXN IVA incluido; dominio y hosting aparte. Las 48 horas empiezan con demo aprobada, anticipo y materiales completos.

No hay cobros, claves, API de Google Ads ni etiquetas publicitarias en este repositorio. El visitante revisa y envía por sí mismo su mensaje en WhatsApp. La página no activa anuncios ni gasto.

## Verificación

Con Node.js: `node --test tests/*.test.mjs`.

## Recuperación

La etiqueta `backup/pre-web48-2026-08-30` conserva el estado anterior completo. El historial no se reescribió. Para recuperar la portada anterior se puede restaurar `index.html` desde esa etiqueta en un nuevo commit; los recursos anteriores siguen presentes.
