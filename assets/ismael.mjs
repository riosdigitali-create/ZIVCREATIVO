export const CONTACT_PHONE = '525540161213';
export const CONTACT_INTRO = 'Hola, Ismael. Vi ZIV Creativo y me interesa una demo para mi negocio. Me dedico a…';

// These are authored scenarios. They do not call an AI service, charge, or send messages.
export const SCENARIOS = Object.freeze({
  muebles: {
    business: 'Nido · Muebles', monogram: 'n.', action: 'Comprar',
    question: '¿Tienen el sillón Origen en café? ¿Cuánto tarda en llegar a CDMX?',
    answer: 'Sí. En este ejemplo hay 3 piezas en café, a $4,800 MXN. La entrega en CDMX tarda de 3 a 5 días hábiles. Puedes revisar el producto y continuar a la compra.',
    product: 'Sillón Origen · Café', detail: '3 disponibles · $4,800 MXN', image: '/assets/demo/sillon.webp',
    customer: 'Ana · Cliente de ejemplo', status: 'Intención de compra',
    next: 'Revisar cobertura y completar el checkout.',
    explanation: 'El interés por el sillón llega con el producto, la variante y la duda de entrega. El negocio puede dar seguimiento antes de confirmar una venta.',
    completion: 'Intención de compra registrada en esta simulación. No se realizó un pedido ni un cobro.',
  },
  moda: {
    business: 'Línea · Moda', monogram: 'l.', action: 'Cotizar',
    question: 'Busco 12 playeras para mi equipo. ¿Tienen tallas M y G? ¿Pueden personalizarlas?',
    answer: 'En esta colección de ejemplo hay tallas M y G y podemos preparar una propuesta de personalización. Cotiza las 12 piezas; el equipo confirmaría diseño, disponibilidad y fecha antes de producir.',
    product: 'Playera esencial · Pedido de equipo', detail: '12 piezas · Tallas M y G', image: '/assets/demo/moda.webp',
    customer: 'Luis · Cliente de ejemplo', status: 'Cotización por preparar',
    next: 'Confirmar tallas, diseño, precio y fecha de entrega.',
    explanation: 'La solicitud conserva las cantidades, tallas y necesidad de personalización. El equipo recibe contexto para preparar una cotización.',
    completion: 'Solicitud de cotización registrada en esta simulación. No se envió ningún mensaje.',
  },
  servicios: {
    business: 'Punto · Barbería', monogram: 'p.', action: 'Reservar',
    question: 'Quiero corte y arreglo de barba. ¿Hay lugar el sábado por la mañana?',
    answer: 'El servicio de ejemplo incluye corte y barba por $450 MXN y toma 60 minutos. Para el sábado se muestra un horario ilustrativo a las 11:00. Puedes solicitarlo; el equipo confirmaría la cita.',
    product: 'Corte + barba · Sábado 11:00', detail: '60 minutos · $450 MXN', image: '/assets/demo/servicios.webp',
    customer: 'Diego · Cliente de ejemplo', status: 'Cita por confirmar',
    next: 'Una persona confirma el horario con el cliente.',
    explanation: 'La solicitud llega con el servicio y el horario preferido. El equipo puede revisar la agenda y confirmar con el cliente.',
    completion: 'Solicitud de cita registrada en esta simulación. No se reservó un horario real.',
  },
});

export function buildContactMessage(request) {
  const entries = [['name', 100], ['business', 140], ['contact', 160], ['improvement', 1500]];
  const data = Object.fromEntries(entries.map(([key, limit]) => {
    const value = String(request[key] || '').trim();
    if (!value || value.length > limit) throw new Error('Revisa los datos de tu mensaje.');
    return [key, value];
  }));
  if (data.improvement.length < 10) throw new Error('Cuéntame un poco más sobre lo que te gustaría mejorar.');
  const isPhone = /^\+?[\d\s().-]{10,25}$/.test(data.contact) && /^\d{10,15}$/.test(data.contact.replace(/\D/g, ''));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact) && !isPhone) {
    throw new Error('Escribe un correo completo o un número de WhatsApp con lada.');
  }
  return `${CONTACT_INTRO}\n\nSoy ${data.name}.\nNegocio: ${data.business}\nMi contacto: ${data.contact}\nMe gustaría mejorar: ${data.improvement}`;
}

export function whatsappUrl(message) {
  const url = new URL(`https://wa.me/${CONTACT_PHONE}`);
  url.searchParams.set('text', message);
  return url.href;
}

export function initializePage(doc) {
  let industry = 'muebles';
  const el = id => doc.getElementById(id);
  const panel = el('demo-panel');
  const initialPanel = panel.innerHTML;
  const action = el('demo-action');
  const progress = el('demo-progress');
  const applyScenario = key => {
    if (!Object.hasOwn(SCENARIOS, key)) return;
    industry = key;
    const scenario = SCENARIOS[key];
    doc.querySelectorAll('[data-industry]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.industry === key)));
    for (const [id, field] of [['demo-business','business'],['demo-question','question'],['demo-answer','answer'],['demo-product','product'],['demo-detail','detail']]) el(id).textContent = scenario[field];
    doc.querySelector('.demo-monogram').textContent = scenario.monogram;
    el('demo-image').src = scenario.image;
    el('demo-image').alt = `${scenario.product}, ejemplo ilustrativo`;
    action.replaceChildren(doc.createTextNode(scenario.action + ' '));
    const arrow = doc.createElement('span'); arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '↗'; action.append(arrow);
    action.disabled = false;
    panel.innerHTML = initialPanel;
    panel.querySelector('.empty-row span:last-child').textContent = `Prueba el botón «${scenario.action}» del ejemplo.`;
    panel.classList.remove('is-complete');
    progress.textContent = 'Paso 1 de 2 · Revisa la respuesta y elige el siguiente paso.';
  };
  doc.querySelectorAll('[data-industry]').forEach(button => button.addEventListener('click', () => applyScenario(button.dataset.industry)));
  action.addEventListener('click', () => {
    const scenario = SCENARIOS[industry];
    panel.replaceChildren();
    const add = (tag, className, text) => {const node = doc.createElement(tag);node.className = className;node.textContent = text;panel.append(node);return node;};
    add('span', 'panel-kicker', 'OPORTUNIDAD DE EJEMPLO / 001');
    add('h4', '', 'El siguiente paso ya tiene contexto.');
    add('span', 'record-status', scenario.status);
    const record = add('dl', 'opportunity-record', '');
    for (const [label, value] of [['Cliente',scenario.customer],['Interés',scenario.product],['Acción',scenario.action],['Siguiente paso',scenario.next]]) {
      const term = doc.createElement('dt');term.textContent = label;
      const definition = doc.createElement('dd');definition.textContent = value;
      record.append(term, definition);
    }
    add('p', '', scenario.explanation);
    panel.classList.add('is-complete');
    action.textContent = 'Registrado en la simulación ✓';
    action.disabled = true;
    progress.textContent = `Paso 2 de 2 · ${scenario.completion}`;
    if (doc.defaultView?.matchMedia('(max-width: 760px)').matches) panel.scrollIntoView({block:'center',behavior:doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  el('demo-reset').addEventListener('click', () => applyScenario(industry));
  const form = el('contact-form');
  const review = el('message-review');
  const link = el('send-message');
  const channel = el('contact-channel');
  form.addEventListener('input', () => {review.hidden = true;link.removeAttribute('href');el('message-preview').textContent = '';channel.setCustomValidity('');});
  form.addEventListener('submit', event => {
    event.preventDefault();
    const request = Object.fromEntries(new FormData(form));
    try {
      const message = buildContactMessage(request);
      el('message-preview').textContent = message;
      link.href = whatsappUrl(message);
      review.hidden = false;
      link.focus();
    } catch(error) {
      review.hidden = true;link.removeAttribute('href');
      channel.setCustomValidity(error.message);channel.reportValidity();
    }
  });
  // Never submit the unenhanced form via GET, which would expose contact data in the URL.
  el('prepare-message').disabled = false;
  doc.querySelectorAll('.mobile-menu a').forEach(link => link.addEventListener('click', () => doc.querySelector('.mobile-menu').removeAttribute('open')));
  doc.addEventListener('keydown', event => {if(event.key === 'Escape') doc.querySelector('.mobile-menu').removeAttribute('open');});
}

if (typeof document !== 'undefined') initializePage(document);
