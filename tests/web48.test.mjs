import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { OFFER, validateDemoRequest, buildDemoMessage, buildWhatsAppUrl } from '../assets/offer.mjs';
import { initializeDemoForm } from '../assets/web48-form.mjs';

const request = { business: ' Magnolia & Co. ', activity: 'Diseño de interiores', city: 'Ciudad de México', acceptedPrice: true };
test('Precio, anticipo, demo y destinatario correctos', () => {
  assert.equal(OFFER.deposit * 2, OFFER.price);
  assert.equal(OFFER.whatsapp, '525539480470');
  assert.equal(validateDemoRequest(request), null);
  assert.match(buildDemoMessage(request), /Negocio: Magnolia & Co\./);
  assert.match(buildDemoMessage(request), /gratis, sin compromiso/);
  assert.match(buildDemoMessage(request), /\$5,900 MXN IVA incluido/);
});
test('Rechaza datos incompletos y falta de aceptación del precio', () => {
  assert.ok(validateDemoRequest({ ...request, acceptedPrice: false }));
  assert.ok(validateDemoRequest({ ...request, city: ' ' }));
  assert.throws(() => buildWhatsAppUrl({ ...request, business: 'x'.repeat(101) }));
});
test('El mensaje no puede alterar el destinatario ni crear parámetros extra', () => {
  const url = new URL(buildWhatsAppUrl({ ...request, business: '&text=otro / ? # á' }));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/525539480470');
  assert.deepEqual([...url.searchParams.keys()], ['text']);
  assert.match(url.searchParams.get('text'), /&text=otro/);
});
function fakeForm() {
  const handlers = {};
  const fields = Object.fromEntries(Object.entries(request).map(([name, value]) => [name, { value, checked: value }]));
  const ids = Object.fromEntries(['demo-request','prepare-demo','form-error','prepared-request','whatsapp-request'].map(id => [id, { hidden: false, disabled: true, textContent: '', removeAttribute(name) { delete this[name]; }, focus() { this.focused = true; } }]));
  ids['demo-request'].elements = { namedItem: name => fields[name] };
  ids['demo-request'].addEventListener = (name, callback) => { handlers[name] = callback; };
  initializeDemoForm({ getElementById: id => ids[id] });
  return { handlers, fields, ids };
}
test('Preparar no envía: sólo habilita un enlace explícito, y editar lo invalida', () => {
  const { handlers, fields, ids } = fakeForm();
  let prevented = false;
  handlers.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(ids['prepared-request'].hidden, false);
  assert.equal(ids['prepare-demo'].hidden, true);
  assert.equal(ids['whatsapp-request'].href, buildWhatsAppUrl(request));
  assert.equal(ids['whatsapp-request'].focused, true);
  fields.business.value = 'Otro negocio';
  handlers.input();
  assert.equal(ids['prepared-request'].hidden, true);
  assert.equal(ids['whatsapp-request'].href, undefined);
});
test('La falta de consentimiento no genera un enlace de WhatsApp', () => {
  const { handlers, fields, ids } = fakeForm();
  fields.acceptedPrice.checked = false;
  handlers.submit({ preventDefault() {} });
  assert.equal(ids['form-error'].hidden, false);
  assert.equal(ids['whatsapp-request'].href, undefined);
});
test('Publicación completa, dominio intacto y sin dependencias del servidor privado', async () => {
  const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((await fs.readFile(new URL('../CNAME', import.meta.url), 'utf8')).trim(), 'zivcreativo.shop');
  for (const url of ['https://aviv.mx/', 'https://theimagemethod.com/', 'https://mundosimz.com/']) assert.ok(html.includes(`href="${url}"`));
  assert.ok(html.includes('href="/portafolio.html"'));
  assert.ok(html.includes('https://zivcreativo.shop/og-image.jpg'));
  assert.ok(html.includes('name="robots" content="index,follow"'));
  assert.doesNotMatch(html, /localhost|chatgpt\.site|workers\.dev|_rsc|__next|noindex/);
  for (const [, asset] of html.matchAll(/(?:src|href)="\/(assets\/[^"?]+|estudio-web\.jpg|favicon\.svg)(?:\?[^" ]*)?"/g)) {
    assert.ok((await fs.stat(new URL(`../${asset}`, import.meta.url))).isFile());
  }
  const css = await fs.readFile(new URL('../assets/web48.css', import.meta.url), 'utf8');
  assert.ok(css.includes('[hidden]{display:none!important}'));
  assert.doesNotMatch(css, /@import/);
});

test('Portafolio de seis muestras: nuevas primero y anteriores conservadas', async () => {
  const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
  const section = html.match(/<div class="project-list">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(section, 'La lista de proyectos está incluida en el HTML estático');
  const rows = [...section.matchAll(/<a href="([^"]+)"([^>]*)class="project-row"([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(rows.map(row => row[1]), [
    'https://aritzasalazar.com/',
    'https://maggiesalmeron.com/',
    'https://caesi.mx/',
    'https://aviv.mx/',
    'https://theimagemethod.com/',
    'https://mundosimz.com/',
  ]);
  for (const row of rows) {
    assert.match(row[2] + row[3], /target="_blank"/);
    assert.match(row[2] + row[3], /rel="noopener noreferrer"/);
    assert.match(row[4], /class="project-name">[^<]+<\/span>/);
    assert.match(row[4], /class="project-type">[^<]+<\/span>/);
  }
});
