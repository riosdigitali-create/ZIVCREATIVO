# ZIV Creativo · Ismael Ríos

Sitio público: https://zivcreativo.shop/

Sitio estático publicado mediante GitHub Pages desde `main`, carpeta raíz. Conservar `CNAME` y la publicación existente. El repositorio de `ziv.mx` es independiente.

La portada presenta a Ismael Ríos y su especialidad en e-commerce, sistemas de ventas y automatización. Usa marfil, negro tinta, violeta y Manrope local, bajo licencia OFL incluida. No publica precios, promesas de ventas ni testimonios.

- `index.html`: experiencia completa, capacidades, demo, casos, presentación personal, proceso y contacto.
- `assets/ismael.css`: estilos responsivos, foco visible y movimiento reducido.
- `assets/ismael.mjs`: simulaciones locales de muebles, moda y servicios; preparación del mensaje de WhatsApp.
- `assets/demo/`: imágenes ilustrativas de las simulaciones, reutilizadas de los recursos locales de ZIV. Productos, existencias, precios y personas de las simulaciones son ejemplos.
- `assets/fonts/`: Manrope y su licencia.
- `portafolio.html`, `demos-ecommerce.html`, `demos/`, `thumbs/`: trabajo y demos existentes conservados.

WhatsApp confirmado por la publicación anterior: +52 55 4016 1213. Correo solicitado: hola@ziv.mx. El formulario valida nombre, negocio, contacto y objetivo; muestra el texto y prepara un enlace de WhatsApp. No guarda datos ni envía mensajes, y no afirma que hubo un envío. Sin JavaScript, los enlaces directos a WhatsApp y correo continúan disponibles. La composición tipográfica de Ismael está preparada para sustituirse por una fotografía real.

Las tres simulaciones no usan APIs, inteligencia artificial en vivo, pagos, mensajes ni reservas reales. Muestran el contexto que recibiría un panel y distinguen una intención de compra de una venta confirmada.

## Desarrollo y verificación

Vista local: `python -m http.server 4173 --bind 127.0.0.1`.

Pruebas: `node --test tests/*.test.mjs`. Sintaxis: `node --check assets/ismael.mjs`.

Verificar escritorio y móvil, los tres giros, reinicio, menú y formulario antes de publicar. Los estilos, scripts y recursos anteriores siguen en el historial para recuperación; la portada actual sólo carga sus propios recursos.
