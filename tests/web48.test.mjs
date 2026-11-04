import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildContactMessage, whatsappUrl, CONTACT_INTRO} from '../assets/ismael.mjs';

const read = path => fs.readFile(new URL('../' + path, import.meta.url), 'utf8');
const request = {name:'Ana Martínez',business:'Magnolia & Co.',contact:'ana@example.com',improvement:'Organizar los pedidos y dar seguimiento a cotizaciones.'};

test('La solicitud conserva el contexto y el destinatario confirmado', () => {
  const message = buildContactMessage(request);
  assert.ok(message.startsWith(CONTACT_INTRO));
  for (const value of Object.values(request)) assert.ok(message.includes(value));
  const url = new URL(whatsappUrl(message));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/525540161213');
  assert.equal(url.searchParams.get('text'), message);
});
test('Los caracteres del visitante no cambian destinatario ni parámetros', () => {
  const message = buildContactMessage({...request,business:'<script>alert(1)</script> &text=otro? # / á'});
  const url = new URL(whatsappUrl(message));
  assert.equal(url.pathname, '/525540161213');
  assert.deepEqual([...url.searchParams.keys()], ['text']);
  assert.equal(url.searchParams.get('text'), message);
});
test('Valida contacto útil, límites y datos vacíos', () => {
  for (const contact of ['hola', 'sin-correo@', '----------', '+1', '9999999999999999999999999']) assert.throws(() => buildContactMessage({...request,contact}));
  for (const contact of ['+52 55 4016 1213', '(55) 4016-1213','hola@negocio.mx']) assert.doesNotThrow(() => buildContactMessage({...request,contact}));
  assert.throws(() => buildContactMessage({...request,name:' '}));
  assert.throws(() => buildContactMessage({...request,business:'a'.repeat(141)}));
  assert.throws(() => buildContactMessage({...request,improvement:'a'.repeat(1501)}));
  assert.throws(() => buildContactMessage({...request,improvement:'Hola'}));
});
test('Dominio, destinos internos y recursos de la portada existen', async () => {
  assert.equal((await read('CNAME')).trim(),'zivcreativo.shop');
  const html = await read('index.html');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size,ids.length);
  for (const [,anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(anchor),'Destino: '+anchor);
  for (const [,asset] of html.matchAll(/(?:src|href)="(\/(?:assets|thumbs)\/[^"?]+)(?:\?[^" ]*)?"/g)) assert.ok((await fs.stat(new URL('..'+asset,import.meta.url))).isFile(),asset);
  for (const [,path] of html.matchAll(/href="(\/[^"?#]+)"/g)) {
    const local = path.endsWith('/') ? path+'index.html' : path;
    assert.ok((await fs.stat(new URL('..'+local,import.meta.url))).isFile(),path);
  }
});
test('Metadatos y contenido sin compromisos comerciales obsoletos', async () => {
  const html = await read('index.html');
  assert.match(html, /name="robots" content="index,follow"/);
  assert.match(html, /rel="canonical" href="https:\/\/zivcreativo.shop\/"/);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.doesNotMatch(html, /PAGO ÚNICO|50% para|ventas garantizadas|\[TU NÚMERO\]|localhost|workers\.dev/);
  assert.match(html,/Simulación interactiva/);
  assert.match(html,/Implementado/);
  assert.match(html,/sujetas a cuentas de vendedor, acceso, requisitos y viabilidad técnica/);
});
test('No hay envíos implícitos, ni HTML del visitante insertado como marcado', async () => {
  const html = await read('index.html');
  const js = await read('assets/ismael.mjs');
  assert.match(html, /onsubmit="return false"/);
  assert.match(html, /id="prepare-message" type="submit" disabled/);
  assert.match(html, /Todavía no se ha enviado/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/);
  assert.match(js, /el\('message-preview'\)\.textContent = message/);
});
test('Las diez demos originales permanecen disponibles', async () => {
  const html = await read('demos-ecommerce.html');
  for (const slug of ['burgers-pizza','tenis','ropa','joyeria','floreria','barberia','lashes','unas','spa','inmobiliaria']) {
    assert.ok(html.includes(`href="/demos/${slug}/"`));
    assert.match(await read(`demos/${slug}/index.html`),/<!doctype html>/i);
  }
  const portfolio = await read('portafolio.html');
  assert.ok(portfolio.includes('href="/#contacto"'));
  assert.ok(html.includes('href="/#sistemas"'));
});
