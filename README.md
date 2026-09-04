# ZIV Creativo · Sistemas digitales para negocios

Sitio público: https://zivcreativo.shop/

Página estática para GitHub Pages. Publicación existente desde `main`, carpeta raíz. El archivo `CNAME` conserva el dominio y no necesita cambiarse.

## Contenido

- `index.html`: posicionamiento, niveles comerciales, comparador, muestras y formulario de contacto.
- `assets/designjoy.css`: sistema visual de ZIV: fondo cálido, contraste negro/azul, galería, tarjetas editoriales, navegación responsive y microinteracciones.
- `assets/web48.css`: estilos de la página de ventas anterior, conservados para recuperación.
- `assets/offer.mjs`: validación y preparación del mensaje de WhatsApp según el nivel elegido.
- `assets/web48-form.mjs`: interacción del formulario, sin guardar datos ni enviar mensajes automáticamente.
- `portafolio.html`, `thumbs/` y `perfil-cutout.png`: portafolio anterior conservado.

Las seis muestras de la página de ventas son Aritza Salazar, Maggie Salmerón, CAESI, AVIV, The Image Method y Mundo Simz. Los tres primeros fueron agregados el 31 de agosto de 2026 sin reemplazar los anteriores. Mantener estas muestras en `index.html`: la publicación actual es estática y no depende de un generador externo.

El rediseño del 31 de agosto conserva esas seis muestras y añade una galería visual de CIRUELA, CANTERA, DOBLE HUMO y VELTRA utilizando las miniaturas locales del portafolio. No incorpora imágenes, testimonios, clientes, precios ni condiciones de Designjoy. Conserva el formulario, el destinatario de WhatsApp, los metadatos sociales existentes y el dominio. El proyecto `web-ventas` es independiente y no se modifica para publicar esta portada estática.

La oferta se presenta en tres niveles acumulativos: ZIV WEB por $5,900 MXN, ZIV BUSINESS por $12,900 MXN y ZIV AI con implementación de $19,900 MXN más operación desde $499 MXN al mes según uso y volumen. Las métricas comerciales son ilustrativas y no se prometen ventas ni cierres automáticos.

No hay cobros, claves, API de Google Ads ni etiquetas publicitarias en este repositorio. El visitante elige el nivel, revisa el mensaje preparado y lo envía por sí mismo en WhatsApp. La página no activa anuncios ni gasto.

## Verificación

Con Node.js: `node --test tests/*.test.mjs`.

## Recuperación

La etiqueta `backup/pre-web48-2026-08-30` conserva el estado anterior completo. El historial no se reescribió. Para recuperar la portada anterior se puede restaurar `index.html` desde esa etiqueta en un nuevo commit; los recursos anteriores siguen presentes.
