import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  OFFER,
  validateDemoRequest,
  buildDemoMessage,
  buildWhatsAppUrl,
} from "../assets/offer.mjs";
import { initializeDemoForm } from "../assets/web48-form.mjs";

const request = {
  name: "Ana Martínez",
  phone: "5512345678",
  business: " Magnolia & Co. ",
  activity: "Diseño de interiores",
  city: "Ciudad de México",
  plan: "ZIV BUSINESS",
  acceptedPrice: true,
  contactConsent: true,
};
test("Servicios y destinatario correctos", () => {
  assert.equal(OFFER.price, 5900);
  assert.equal(OFFER.whatsapp, "525540161213");
  assert.ok(OFFER.plans.includes("Catálogo digital"));
  assert.ok(OFFER.plans.includes("E-commerce"));
  assert.ok(OFFER.plans.includes("CRM + IA"));
  assert.equal(validateDemoRequest(request), null);
  assert.match(buildDemoMessage(request), /Negocio: Magnolia & Co\./);
  assert.match(buildDemoMessage(request), /Servicio de interés: ZIV BUSINESS/);
  assert.match(buildDemoMessage(request), /precios publicados en la sección de servicios/);
});
test("Rechaza datos incompletos y falta de aceptación del precio", () => {
  assert.ok(validateDemoRequest({ ...request, acceptedPrice: false }));
  assert.ok(validateDemoRequest({ ...request, city: " " }));
  assert.ok(validateDemoRequest({ ...request, plan: "Plan inventado" }));
  assert.throws(() => buildWhatsAppUrl({ ...request, business: "x".repeat(101) }));
});
test("El mensaje no puede alterar el destinatario ni crear parámetros extra", () => {
  const url = new URL(buildWhatsAppUrl({ ...request, business: "&text=otro / ? # á" }));
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/525540161213");
  assert.deepEqual([...url.searchParams.keys()], ["text"]);
  assert.match(url.searchParams.get("text"), /&text=otro/);
});
function fakeForm() {
  const handlers = {};
  const fields = Object.fromEntries(
    Object.entries(request).map(([name, value]) => [name, { value, checked: value }]),
  );
  const ids = Object.fromEntries(
    ["demo-request", "prepare-demo", "form-error", "prepared-request", "whatsapp-request"].map(
      (id) => [
        id,
        {
          hidden: false,
          disabled: true,
          textContent: "",
          removeAttribute(name) {
            delete this[name];
          },
          focus() {
            this.focused = true;
          },
        },
      ],
    ),
  );
  ids["demo-request"].elements = { namedItem: (name) => fields[name] };
  ids["demo-request"].addEventListener = (name, callback) => {
    handlers[name] = callback;
  };
  initializeDemoForm({ getElementById: (id) => ids[id] });
  return { handlers, fields, ids };
}
test("Preparar no envía: sólo habilita un enlace explícito, y editar lo invalida", () => {
  const { handlers, fields, ids } = fakeForm();
  let prevented = false;
  handlers.submit({
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(ids["prepared-request"].hidden, false);
  assert.equal(ids["prepare-demo"].hidden, true);
  assert.equal(ids["whatsapp-request"].href, buildWhatsAppUrl(request));
  assert.equal(ids["whatsapp-request"].focused, true);
  fields.business.value = "Otro negocio";
  handlers.input();
  assert.equal(ids["prepared-request"].hidden, true);
  assert.equal(ids["whatsapp-request"].href, undefined);
});
test("La falta de consentimiento no genera un enlace de WhatsApp", () => {
  const { handlers, fields, ids } = fakeForm();
  fields.acceptedPrice.checked = false;
  handlers.submit({ preventDefault() {} });
  assert.equal(ids["form-error"].hidden, false);
  assert.equal(ids["whatsapp-request"].href, undefined);
});
test("Publicación completa, dominio intacto y sin dependencias del servidor privado", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(
    (await fs.readFile(new URL("../CNAME", import.meta.url), "utf8")).trim(),
    "zivcreativo.shop",
  );
  const portfolio = await fs.readFile(new URL("../portafolio.html", import.meta.url), "utf8");
  for (const url of ["https://aviv.mx/", "https://theimagemethod.com/", "https://mundosimz.com/"])
    assert.ok(portfolio.includes(`href="${url}"`));
  assert.ok(html.includes('href="/portafolio.html"'));
  assert.ok(html.includes("https://zivcreativo.shop/og-image.jpg"));
  assert.ok(html.includes('name="robots" content="index,follow"'));
  assert.doesNotMatch(html, /localhost|chatgpt\.site|workers\.dev|_rsc|__next|noindex/);
  for (const [, asset] of html.matchAll(
    /(?:src|href)="\/(assets\/[^"?]+|estudio-web\.jpg|favicon\.svg)(?:\?[^" ]*)?"/g,
  )) {
    assert.ok((await fs.stat(new URL(`../${asset}`, import.meta.url))).isFile());
  }
  const css = await fs.readFile(new URL("../assets/designjoy.css", import.meta.url), "utf8");
  assert.ok(css.includes("[hidden]{display:none!important}"));
  assert.doesNotMatch(css, /@import/);
});

test("Rediseño: navegación completa, imágenes locales y accesibilidad básica", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "No hay identificadores duplicados");
  for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(anchor), "Existe el destino " + anchor);
  }
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  for (const [, tag] of html.matchAll(/(<img\b[^>]*>)/g)) {
    assert.match(tag, /alt="[^"]*"/);
    const src = tag.match(/src="([^"]+)"/)?.[1];
    assert.ok(src?.startsWith("/"));
    assert.ok((await fs.stat(new URL(".." + src, import.meta.url))).isFile());
  }
  for (const [, src] of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)(?:\?[^"]*)?"/g)) {
    assert.ok((await fs.stat(new URL(".." + src, import.meta.url))).isFile());
  }
  assert.match(html, /aria-label="Navegación principal"/);
  assert.match(html, /aria-label="Menú móvil"/);
  assert.match(html, /aria-label="Accesos rápidos"/);
  assert.match(html, /name="plan"/);
  assert.match(html, /name="acceptedPrice"/);
  assert.match(html, /Todavía|todavía no se ha enviado/);
  assert.doesNotMatch(
    html,
    /buy\.stripe\.com|billing\.stripe\.com|hello@designjoy|cdn\.prod\.website-files/,
  );
  const css = await fs.readFile(new URL("../assets/designjoy.css", import.meta.url), "utf8");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(css, /@media\(max-width:760px\)/);
});

test("Oferta comercial: proyectos de pago único y costos externos transparentes", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const price of ["$3,900", "$5,900", "$6,900", "$7,900", "$9,900", "$12,900", "$16,300", "$19,900"])
    assert.ok(html.includes(price));
  for (const plan of ["ZIV WEB", "ZIV BUSINESS", "ZIV AI"])
    assert.ok(html.includes(plan));
  assert.equal((html.match(/class="project-pricing-card /g) || []).length, 3);
  assert.ok((html.match(/PAGO ÚNICO/g) || []).length >= 8);
  for (const solution of ["Catálogo digital", "E-commerce", "CRM", "Agente IA", "CRM + IA"])
    assert.ok(html.includes(solution));
  assert.match(html, /50% para comenzar/);
  assert.match(html, /50% al aprobar/);
  assert.match(html, /servicios externos son independientes/i);
  assert.match(html, /Stripe, Mercado Pago/);
  assert.match(html, /¿Tengo que pagar mensualidad\?/);
  assert.match(html, /¿Después de pagar el sistema es mío\?/);
  assert.match(html, /¿Qué pasa si después necesito nuevas funciones\?/);
  assert.match(html, /Ver demos de e-commerce/);
  assert.doesNotMatch(
    html,
    /\$(?:199|249|280|299|350|499|500)\b|\/ mes|planes mensuales|suscripción ZIV|plan mensual|renovación mensual/i,
  );
  assert.doesNotMatch(html, /Somos Ismael|Abraham|525539480470/);
  for (const href of html.matchAll(/href="(https:\/\/wa\.me\/[^"?]+\?text=[^"]+)"/g)) {
    const url = new URL(href[1]);
    assert.equal(url.pathname, "/525540161213");
    assert.ok(url.searchParams.get("text")?.startsWith("Hola ZIV Creativo."));
  }
});
test("Galería ecommerce enlaza las diez demos reales y ningún enlace a ziv.mx", async () => {
  const html = await fs.readFile(new URL("../demos-ecommerce.html", import.meta.url), "utf8");
  assert.equal((html.match(/class="demo-project /g) || []).length, 10);
  assert.doesNotMatch(html, /href="https:\/\/ziv\.mx/);
  const demos = [
    ["burgers-pizza", "DOBLE HUMO"], ["tenis", "VELTRA"], ["ropa", "ATRIO"],
    ["joyeria", "MARÉ"], ["floreria", "TALLO"], ["barberia", "CUERVO"],
    ["lashes", "IRIS"], ["unas", "CIRUELA"], ["spa", "CASA YUMA"],
    ["inmobiliaria", "CANTERA"],
  ];
  for (const [slug, name] of demos) {
    assert.match(html, new RegExp(`href="/demos/${slug}/"`));
    assert.ok(html.includes(name));
    const demo = await fs.readFile(new URL(`../demos/${slug}/index.html`, import.meta.url), "utf8");
    assert.match(demo, /<!doctype html>/i);
    assert.match(demo, new RegExp(name, "i"));
  }
});

test("Portada muestra nueve proyectos públicos y ningún panel privado", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const section = html.match(/<section[^>]*id="trabajo"[\s\S]*?<\/section>/)[0];
  for (const url of ["https://aviv.mx/", "https://reprofem.com.mx/", "https://ziv.mx/", "https://theimagemethod.com/", "https://academia.ziv.mx/", "https://maggiesalmeron.com/", "https://caesi.mx/", "https://mundosimz.com/", "https://makersconference.org/"])
    assert.ok(section.includes(`href="${url}"`));
  for (const name of ["AVIV", "REPROFEM", "ZIV", "THE IMAGE METHOD", "ACADEMIA IA", "MAGGIE SALMERÓN", "CAESI", "MUNDO SIMZ", "MAKERS26"])
    assert.ok(section.includes(name));
  assert.equal((section.match(/class="public-project"/g) || []).length, 9);
  assert.doesNotMatch(section, /Aritza Salazar|aritzasalazar\.com/i);
  assert.doesNotMatch(section, /crm\.ziv\.mx|aviv-crm|Commerce Hub|Cerebro Aviv/i);
  assert.match(section, /Sitios reales que puedes/);
  const portfolio = await fs.readFile(new URL("../portafolio.html", import.meta.url), "utf8");
  assert.match(portfolio, /https:\/\/academia\.ziv\.mx\//);
  assert.doesNotMatch(portfolio, /Aritza Salazar|aritzasalazar\.com/i);
});

test("Las capturas de sitios sólo aparecen en Trabajo; el resto usa arte original", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const work = html.match(/<section[^>]*id="trabajo"[\s\S]*?<\/section>/)?.[0];
  assert.ok(work);
  assert.equal((work.match(/src="\/thumbs\/public\//g) || []).length, 9);
  assert.doesNotMatch(html.replace(work, ""), /src="\/thumbs\//);
  for (const path of [
    "/assets/editorial/studio-hero-ai-v2.webp",
    "/assets/editorial/studio-web-workspace-v2.webp",
    "/assets/editorial/studio-business-workspace-v2.webp",
    "/assets/editorial/studio-ai-workspace-v2.webp",
  ]) {
    assert.ok(html.includes(`src="${path}"`));
    assert.ok((await fs.stat(new URL(".." + path, import.meta.url))).isFile());
  }
  assert.doesNotMatch(html, /studio-(?:hero|web|business|ai)-object\.webp|studio-proof-cutout\.webp/);
  assert.match(html, /ChatGPT[\s\S]*Claude[\s\S]*Gemini/);
  const toolmarks = html.match(/<ul class="hero-toolmarks-track"[\s\S]*?<\/ul>/)?.[0];
  assert.ok(toolmarks);
  assert.equal((toolmarks.match(/<li>/g) || []).length, 27);
  for (const name of ["Meta", "Grok", "GitHub", "Cloudflare"])
    assert.match(toolmarks, new RegExp(`>${name}<`));
  for (const [, path] of toolmarks.matchAll(/src="(\/assets\/marks\/[^\"]+)"/g))
    assert.ok((await fs.stat(new URL(".." + path, import.meta.url))).isFile());
  const proof = html.split('<div class="studio-proof"')[1]?.split('<div class="benefits-grid">')[0];
  assert.ok(proof);
  assert.match(proof, /class="studio-proof-marquee"/);
  const marks = (section) => [...section.matchAll(/src="(\/assets\/marks\/[^\"]+)"/g)].map((match) => match[1]).sort();
  assert.deepEqual(marks(proof), marks(toolmarks));
  const motion = await fs.readFile(new URL("../assets/studio-motion.js", import.meta.url), "utf8");
  assert.match(motion, /duplicate\.setAttribute\('aria-hidden', 'true'\)/);
});
