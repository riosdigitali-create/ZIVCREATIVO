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
  plan: "Ecommerce",
  acceptedPrice: true,
  contactConsent: true,
};
test("Servicios y destinatario correctos", () => {
  assert.equal(OFFER.price, 5900);
  assert.equal(OFFER.whatsapp, "525540161213");
  assert.ok(OFFER.plans.includes("Catálogo"));
  assert.ok(OFFER.plans.includes("Ecommerce"));
  assert.ok(OFFER.plans.includes("CRM + Asistente IA"));
  assert.equal(validateDemoRequest(request), null);
  assert.match(buildDemoMessage(request), /Negocio: Magnolia & Co\./);
  assert.match(buildDemoMessage(request), /Servicio de interés: Ecommerce/);
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
    assert.match(tag, /alt="[^"]+"/);
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

test("Nueva oferta: cinco categorías, precios y avisos responsables", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const category of ["catalogo", "web", "ecommerce", "ia", "crm"])
    assert.match(html, new RegExp(`data-plan-tab="${category}"`));
  for (const price of ["$199", "$249", "$299", "$350", "$500", "$5,900", "$12,500", "$16,300"])
    assert.ok(html.includes(price));
  assert.equal((html.match(/data-plan-tab=/g) || []).length, 5);
  assert.equal((html.match(/data-plan-panel=/g) || []).length, 5);
  assert.match(html, /¿Qué te gustaría construir\?/);
  for (const choice of ["Catálogo digital", "Página web", "Página ecommerce", "Agente IA", "CRM"])
    assert.ok(html.includes(choice));
  assert.equal((html.match(/class="service-panel is-active"/g) || []).length, 0);
  assert.match(html, /data-change-plan/);
  assert.match(html, /no requiere API de Meta/i);
  assert.match(html, /consumo de IA no incluidos/i);
  assert.ok((html.match(/<summary>Ver proyectos y demos/g) || []).length >= 1);
  assert.equal((html.match(/class="service-examples-link"/g) || []).length, 3);
  assert.equal((html.match(/Ver las 10 demos/g) || []).length, 4);
  assert.match(html, /Ver ejemplos de negocios en línea/);
  assert.match(html, /https:\/\/ismaelrios\.ziv\.mx\//);
  assert.doesNotMatch(html, /https:\/\/ziv\.mx\/(?:\?view=templates|shop\/distrito-demo)/);
  for (const demo of ["burgers-pizza", "tenis", "ropa", "joyeria", "floreria", "barberia", "lashes", "unas", "spa", "inmobiliaria"])
    assert.match(html, new RegExp(`/demos/${demo}/`));
  assert.match(html, /Hasta 15,000 contactos/);
  assert.match(html, /<b>100<\/b><span>contactos<\/span><strong>\$280<\/strong>/);
  assert.match(html, /<b>300<\/b><span>contactos<\/span><strong>\$350<\/strong>/);
  assert.match(html, /<b>Hasta 1,500<\/b><span>contactos<\/span><strong>\$500<\/strong>/);
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
  for (const url of ["https://aviv.mx/", "https://reprofem.com.mx/", "https://ziv.mx/", "https://theimagemethod.com/", "https://aritzasalazar.com/", "https://maggiesalmeron.com/", "https://caesi.mx/", "https://mundosimz.com/", "https://makersconference.org/"])
    assert.ok(section.includes(`href="${url}"`));
  for (const name of ["AVIV", "REPROFEM", "ZIV", "THE IMAGE METHOD", "ARITZA SALAZAR", "MAGGIE SALMERÓN", "CAESI", "MUNDO SIMZ", "MAKERS26"])
    assert.ok(section.includes(name));
  assert.equal((section.match(/class="public-project"/g) || []).length, 9);
  assert.doesNotMatch(section, /crm\.ziv\.mx|aviv-crm|Commerce Hub|Cerebro Aviv/i);
  assert.match(section, /Sitios reales que puedes/);
});
