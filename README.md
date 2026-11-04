# ZIV Creativo · E-commerce sin límites

Sitio público: https://zivcreativo.shop/

Sitio estático publicado mediante GitHub Pages desde `main`, carpeta raíz. Conservar `CNAME` y la publicación existente. El repositorio de `ziv.mx` es independiente.

La portada corresponde a `ZIV-Creativo-Ecommerce.zip`, proporcionado el 4 de noviembre de 2026. Presenta a Ismael Ríos con visuales espaciales, videos adaptados al dispositivo y un simulador local de publicación de mercancía en distintos canales.

- `index.html`, `style.css`: contenido y presentación de la portada.
- `app.js`: animaciones, videos y control de movimiento.
- `mission.js`: simulación de selección de canales y escaparates.
- `sky.js`: efectos visuales del fondo.
- `assets/`: imágenes, videos e iconos de canales.
- `portafolio.html`, `demos-ecommerce.html`, `demos/`, `thumbs/`: portafolio y demos conservados.

La simulación no publica productos, transmite mensajes ni realiza cobros reales. El contacto principal es `hola@ziv.mx`, mediante enlaces de correo.

## Verificación

Vista local: `python -m http.server 4178 --bind 127.0.0.1`.

Sintaxis: `node --check app.js`, `node --check mission.js`, `node --check sky.js`.

Revisar escritorio y móvil, carga de recursos, selección de canales, finalización y reinicio del simulador, control de movimiento y enlaces de contacto antes de publicar.

`assets/ismael.css`, `assets/ismael.mjs` y `tests/web48.test.mjs` pertenecen a la portada anterior. Sus pruebas de contenido no aplican a esta versión del ZIP.
