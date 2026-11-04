# ZIV Creativo · Horizontes azules

Sitio público: https://zivcreativo.shop/

Sitio estático publicado mediante GitHub Pages desde `main`, carpeta raíz. Conservar `CNAME`. El repositorio de `ziv.mx` es independiente.

La portada conserva el contenido y la demo del ZIP proporcionado por el usuario, con una paleta azul y un fondo continuo inspirado en su HTML «Horizontes · Desde el borde».

## Fondo

`horizons.js` dibuja esferas texturizadas mediante WebGL, con iluminación direccional, borde atmosférico, nubes, reflejo oceánico y luces nocturnas en la Tierra. La portada comienza en órbita terrestre y continúa por Marte, Júpiter, Mercurio y Venus. El HTML independiente conserva su recorrido de Mercurio a Júpiter. El relieve y la órbita usan la misma superficie, sin superponer fotografías de terreno.

El fondo se comparte entre todas las secciones. Los paneles translúcidos conservan la legibilidad. Sólo se dibujan cuadros al cargar imágenes, cambiar el tamaño o interpolar un desplazamiento; no hay un bucle de animación permanente. Se limita la resolución de dibujo y se respeta movimiento reducido. El control del pie permite pausar el fondo. Si WebGL no está disponible, se muestra una imagen estática.

Mapas de Solar System Scope, CC BY 4.0; fuente, licencia y adaptaciones documentadas en `assets/horizons/credits.txt` y acreditadas en el pie. El recorrido es artístico, no representa distancias ni escalas científicas.

## Archivos

- `index.html`, `style.css`: portada y diseño responsivo.
- `app.js`: inicializa el fondo, el control de movimiento y la aparición de contenido.
- `mission.js`: simulación local de publicación, con producto y controles azules.
- `horizontes.html`: recorrido independiente con selector de planetas y modo sin guía.
- `scripts/export-horizons.py`: genera un HTML autónomo con todos los mapas y el motor incluidos. Ejemplo: `python scripts/export-horizons.py C:/ruta/Horizontes-Afinado.html`.
- Portafolio, galerías y demos anteriores conservados.

La demo no publica mercancía ni hace cobros. El contacto principal es `hola@ziv.mx`.

## Verificación

Vista local: `python -m http.server 4181 --bind 127.0.0.1`.
Sintaxis: `node --check horizons.js`, `node --check app.js`, `node --check mission.js`.
Revisar escritorio y móvil, recorrido, selección de canales, finalización, reinicio y pausa antes de publicar.

`assets/ismael.css`, `assets/ismael.mjs` y `tests/web48.test.mjs` pertenecen a una portada anterior; sus pruebas de contenido no aplican a esta versión.

## Intro orbital

`intro.js` y `intro.css` añaden una entrada de 9.6 segundos: cabina, ascenso atmosférico, nubes, salida al espacio y llegada a la misma vista de la Tierra que usa la portada. El planeta y la cámara pertenecen al mismo motor que el fondo. Durante el ascenso, las nubes y la franja atmosférica descienden por el parabrisas, sin deriva lateral. La Tierra permanece centrada y se aleja hacia abajo; su encuadre final se ajusta al desvanecerse la cabina. Las estrellas permanecen estables en esta secuencia.

Se reproduce una vez por sesión de pestaña, permite pausar, continuar, omitir con un botón o Escape y repetir desde el pie. Mientras está activa, la página está inerte y el foco permanece en los controles de la intro. Al salir, el foco pasa al título principal. Los enlaces directos a secciones y la preferencia de movimiento reducido acceden directamente al contenido.

La entrada usa recursos locales, sin audio automático ni dependencias externas. El arranque libera el contenido si el módulo no carga; la falta de WebGL o una textura que no llega a tiempo también omite la entrada. Una pérdida del contexto gráfico termina la intro y permite acceder a la página.

Cabina y nubes generadas mediante la herramienta integrada `image_gen`; archivos y prompts en `assets/flight/README.md`. Los archivos WebP suman aproximadamente 264 KB.

## Astronauta y recorrido al desplazar

La portada usa el recorte transparente proporcionado por Ismael, optimizado a WebP en `assets/ismael-astronaut.webp`. `astronaut.js` coloca el retrato junto al título, añade una oscilación suave y comparte el progreso de cámara para reducirlo, acercarlo visualmente al planeta y desvanecerlo al salir de la portada. El retrato se adapta a escritorio y móvil y permanece oculto durante el despegue. La preferencia de movimiento reducido y el control de pausa usan una imagen estática que sale con el contenido.

La cámara interpola el desplazamiento con amortiguación de 420 ms y una velocidad máxima de 0.30 recorridos por segundo, con una ventana de transición más amplia entre planetas. Las texturas se precargan en el orden del recorrido para evitar apariciones sin detalle al desplazar rápido.

## Efectos del espacio

`space-effects.js` añade una capa Canvas 2D decorativa: estrellas con brillo lento, nebulosa azul con profundidad, cometas y pequeñas lluvias de meteoros a intervalos aleatorios, y destellos de difracción ocasionales. No usa archivos externos ni sonido. La capa está detrás del contenido y deja pasar todos los clics y gestos. Se oculta durante el despegue y con movimiento reducido; el control general de pausa congela los efectos y las pestañas ocultas suspenden el dibujo. El render está limitado a 30 fps, 900 mil píxeles y menos estrellas en móvil; las texturas de luz y gas se preparan una vez y se reutilizan.
