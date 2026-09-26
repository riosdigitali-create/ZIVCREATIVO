# ZIV Creativo · Sistemas digitales para negocios

Sitio público: https://zivcreativo.shop/

Página estática para GitHub Pages. Publicación existente desde `main`, carpeta raíz. El archivo `CNAME` conserva el dominio y no necesita cambiarse.

## Contenido

- `index.html`: portada del estudio, campañas de servicios, trabajos reales, oferta comercial, preguntas y formulario de contacto.
- `assets/studio-ziv.css`: dirección visual vigente para portada, secciones comerciales, portafolio y galería de demos; usa arte original en las composiciones comerciales y reserva los proyectos reales para las galerías.
- `assets/studio-motion.js`: revelados de scroll progresivos con `IntersectionObserver`; respeta la preferencia de movimiento reducido y no oculta contenido si JavaScript falla.
- `assets/editorial/studio-*-object.webp` y `assets/editorial/studio-proof-cutout.webp`: cinco recursos editoriales originales con transparencia para portada, servicios, planes y estudio.
- `assets/designjoy.css` y `assets/editorial-ziv.css`: estilos base conservados bajo la capa visual vigente.
- `assets/web48.css`: estilos de la página de ventas anterior, conservados para recuperación.
- `assets/offer.mjs`: validación y preparación del mensaje de WhatsApp según el nivel elegido.
- `assets/web48-form.mjs`: validación y envío consentido de la solicitud al CRM privado; prepara el enlace de WhatsApp, pero nunca envía el mensaje automáticamente.
- `portafolio.html`, `demos-ecommerce.html` y `thumbs/`: galerías públicas y capturas locales de proyectos y demos.

Las capturas de proyectos y demos se reservan para las galerías donde el visitante puede explorar el trabajo real. Portada, servicios y planes usan objetos originales generados con fondo transparente y canal alfa conservado. Los cuatro renders editoriales anteriores permanecen en el historial y en `assets/editorial/` para recuperación, pero ya no se cargan en la experiencia vigente. Este repositorio no implementa un checkout en producción: la contratación se inicia por WhatsApp o el formulario y las diez demos independientes mantienen su propia lógica.

La sección «Trabajo» muestra nueve sitios públicos, incluido MAKERS26. Mantener sus enlaces y miniaturas en `index.html`: la publicación actual es estática y no depende de un generador externo.

El rediseño del 31 de agosto conserva esas seis muestras y añade una galería visual de CIRUELA, CANTERA, DOBLE HUMO y VELTRA utilizando las miniaturas locales del portafolio. No incorpora imágenes, testimonios, clientes, precios ni condiciones de Designjoy. Conserva el formulario, el destinatario de WhatsApp, los metadatos sociales existentes y el dominio. El proyecto `web-ventas` es independiente y no se modifica para publicar esta portada estática.

La oferta se presenta como proyectos de pago único: ZIV WEB por $5,900 MXN, ZIV BUSINESS por $12,900 MXN y ZIV AI por $19,900 MXN. Las soluciones individuales también se cotizan como implementaciones de pago único. Dominio, hosting, APIs, IA, WhatsApp, correo, envíos, Stripe, Mercado Pago y otras plataformas pueden generar costos independientes cobrados por sus proveedores. Las métricas comerciales son ilustrativas y no se prometen ventas ni cierres automáticos.

No hay cobros, claves ni API de Google Ads en este repositorio. La etiqueta de Google Ads `AW-18416108948` mide visitas y acciones relevantes; una solicitud guardada correctamente emite el evento `generate_lead`. El visitante elige el nivel, revisa el mensaje preparado y lo envía por sí mismo en WhatsApp. La página no activa anuncios ni gasto por sí sola.

## Verificación

Con Node.js: `node --test tests/*.test.mjs`.

## Recuperación

La etiqueta `backup/pre-web48-2026-08-30` conserva el estado anterior completo. El historial no se reescribió. Para recuperar la portada anterior se puede restaurar `index.html` desde esa etiqueta en un nuevo commit; los recursos anteriores siguen presentes.
