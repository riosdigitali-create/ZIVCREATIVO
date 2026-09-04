import { buildWhatsAppUrl, validateDemoRequest } from "./offer.mjs?v=20260904-leads";

export function initializeDemoForm(doc) {
  const form = doc.getElementById("demo-request");
  if (!form) return;
  const track = (name, details = {}) => {
    const win = doc.defaultView || (typeof window !== "undefined" ? window : null);
    if (!win) return;
    win.dataLayer = win.dataLayer || [];
    win.dataLayer.push({ event: `ziv_${name}`, ...details });
  };
  const submit = doc.getElementById("prepare-demo");
  const error = doc.getElementById("form-error");
  const prepared = doc.getElementById("prepared-request");
  const whatsapp = doc.getElementById("whatsapp-request");
  const resetPrepared = () => {
    prepared.hidden = true;
    submit.hidden = false;
    error.hidden = true;
    error.textContent = "";
    whatsapp.removeAttribute("href");
  };
  form.addEventListener("input", resetPrepared);
  form.addEventListener("change", resetPrepared);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    resetPrepared();
    const field = (name) => form.elements.namedItem(name);
    const request = {
      name: field("name").value,
      phone: field("phone").value,
      business: field("business").value,
      activity: field("activity").value,
      city: field("city").value,
      plan: field("plan").value,
      acceptedPrice: field("acceptedPrice").checked,
      contactConsent: field("contactConsent").checked,
    };
    const issue = validateDemoRequest(request);
    if (issue) {
      error.textContent = issue;
      error.hidden = false;
      return;
    }
    const win = doc.defaultView || (typeof window !== "undefined" ? window : null);
    if (win?.fetch) {
      submit.disabled = true;
      const originalSubmit = submit.innerHTML;
      submit.textContent = "Guardando contacto…";
      try {
        const key = "ziv_session_id";
        let sessionId = win.sessionStorage.getItem(key);
        if (!sessionId) {
          sessionId = win.crypto.randomUUID().replace(/-/g, "");
          win.sessionStorage.setItem(key, sessionId);
        }
        const params = new URLSearchParams(win.location.search);
        const response = await win.fetch("https://crm.ziv.mx/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: request.name,
            phone: request.phone,
            company: request.business,
            interest: request.activity,
            city: request.city,
            plan: request.plan,
            consent: request.contactConsent,
            sessionId,
            utmSource: params.get("utm_source"),
            utmMedium: params.get("utm_medium"),
            utmCampaign: params.get("utm_campaign"),
          }),
        });
        if (!response.ok) throw new Error();
      } catch {
        error.textContent = "No pudimos guardar tus datos. Revisa tu teléfono e inténtalo otra vez.";
        error.hidden = false;
        submit.disabled = false;
        submit.innerHTML = originalSubmit;
        return;
      }
    }
    whatsapp.href = buildWhatsAppUrl(request);
    prepared.hidden = false;
    submit.hidden = true;
    track("demo_message_prepared");
    whatsapp.focus();
  });
  doc.addEventListener?.("click", (event) => {
    const link = event.target.closest?.("a");
    if (!link) return;
    if (link.matches('a[href^="https://wa.me/"]')) track("whatsapp_click");
    if (link.matches(".plan-cta"))
      track("plan_interest", { plan: link.closest("article")?.id || "unknown" });
    if (link.matches('a[href*="portafolio"]')) track("portfolio_view");
    if (link.matches('a[href="#planes"]')) track("price_view");
    if (link.getAttribute?.("href")?.startsWith("#"))
      doc.querySelector?.(".site-menu")?.removeAttribute("open");
  });
  submit.disabled = false;
}

if (typeof document !== "undefined") initializeDemoForm(document);
