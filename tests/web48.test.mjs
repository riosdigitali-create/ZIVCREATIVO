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
test("Precios, niveles y destinatario correctos", () => {
  assert.equal(OFFER.price, 5900);
  assert.equal(OFFER.whatsapp, "525539480470");
  assert.deepEqual(OFFER.plans, ["ZIV WEB", "ZIV BUSINESS", "ZIV AI", "Quiero orientación"]);
  assert.equal(validateDemoRequest(request), null);
  assert.match(buildDemoMessage(request), /Negocio: Magnolia & Co\./);
  assert.match(buildDemoMessage(request), /Nivel de interés: ZIV BUSINESS/);
  assert.match(buildDemoMessage(request), /ZIV WEB \$5,900 MXN/);
  assert.match(buildDemoMessage(request), /ZIV AI \$19,900 MXN/);
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
  assert.equal(url.pathname, "/525539480470");
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

test("Nueva oferta: tres niveles, precios, comparador y avisos responsables", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const id of ["ziv-web", "ziv-business", "ziv-ai"])
    assert.match(html, new RegExp(`id="${id}"`));
  for (const price of ["$5,900", "$12,900", "$19,900", "$499"]) assert.ok(html.includes(price));
  for (const item of [
    "Panel administrativo",
    "CRM integrado",
    "Agente de ventas con Inteligencia Artificial",
  ])
    assert.ok(html.includes(item));
  assert.match(html, /Datos ilustrativos/);
  assert.match(html, /ni garantiza el cierre de ventas/i);
  assert.match(html, /<table>/);
});

test("Portada con tres destacados y portafolio completo con demos activas", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const portfolio = await fs.readFile(new URL("../portafolio.html", import.meta.url), "utf8");
  const previewPortfolio = await fs.readFile(
    new URL("../../web-ventas/public/portafolio.html", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(
    await fs.readFile(new URL("../../demos/projects.json", import.meta.url), "utf8"),
  );
  const active = manifest.filter((p) => p.active !== false);
  const section = html.match(/<section[^>]*id="trabajo"[\s\S]*?<\/section>/)[0];
  assert.deepEqual(
    [...section.matchAll(/data-project="([^"]+)"/g)].map((x) => x[1]),
    active.slice(0, 3).map((p) => p.slug),
  );
  assert.deepEqual(
    [...portfolio.matchAll(/data-project="([^"]+)"/g)].map((x) => x[1]),
    active.map((p) => p.slug),
  );
  assert.deepEqual(
    [...portfolio.matchAll(/data-project="([^"]+)"/g)].map((x) => x[1]),
    [...previewPortfolio.matchAll(/data-project="([^"]+)"/g)].map((x) => x[1]),
    "Las dos versiones conservan los mismos proyectos",
  );
  for (const p of active) {
    assert.ok(portfolio.includes('href="https://' + p.slug + '.pages.dev/"'));
    const thumbnail = p.thumbFile || p.thumb + ".webp";
    assert.ok(portfolio.includes("/thumbs/" + thumbnail));
    assert.ok((await fs.stat(new URL("../thumbs/" + thumbnail, import.meta.url))).isFile());
  }
  for (const domain of [
    "aritzasalazar.com",
    "maggiesalmeron.com",
    "caesi.mx",
    "aviv.mx",
    "theimagemethod.com",
    "mundosimz.com",
  ])
    assert.ok(portfolio.includes("https://" + domain + "/"));
  assert.match(portfolio, /aria-pressed="true"/);
  assert.match(portfolio, /aria-live="polite"/);
  assert.match(portfolio, />9<\/strong>conceptos web/);
  assert.doesNotMatch(portfolio, /ciruela-riosdigital|CIRUELA/);
  assert.doesNotMatch(portfolio, /1,950|iframe/);
  const previewLanding = await fs.readFile(
    new URL("../../web-ventas/lib/landing.ts", import.meta.url),
    "utf8",
  );
  const previewUpdate = await fs.readFile(
    new URL("../../web-ventas/lib/landing-updated.ts", import.meta.url),
    "utf8",
  );
  for (const p of active.slice(0, 2))
    assert.ok(previewLanding.includes(p.slug), p.name + " está también en la página con CRM");
  assert.ok(
    previewUpdate.includes(active[2].slug),
    active[2].name + " está también en la página con CRM",
  );
});
