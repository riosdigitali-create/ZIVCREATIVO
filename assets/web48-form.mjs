import { buildWhatsAppUrl, validateDemoRequest } from './offer.mjs?v=20260903-systems';

export function initializeDemoForm(doc) {
  const form = doc.getElementById('demo-request');
  if (!form) return;
  const track = (name, details = {}) => {
    const win = doc.defaultView || (typeof window !== 'undefined' ? window : null);
    if (!win) return;
    win.dataLayer = win.dataLayer || [];
    win.dataLayer.push({ event: `ziv_${name}`, ...details });
  };
  const submit = doc.getElementById('prepare-demo');
  const error = doc.getElementById('form-error');
  const prepared = doc.getElementById('prepared-request');
  const whatsapp = doc.getElementById('whatsapp-request');
  const resetPrepared = () => {
    prepared.hidden = true;
    submit.hidden = false;
    error.hidden = true;
    error.textContent = '';
    whatsapp.removeAttribute('href');
  };
  form.addEventListener('input', resetPrepared);
  form.addEventListener('change', resetPrepared);
  form.addEventListener('submit', event => {
    event.preventDefault();
    resetPrepared();
    const field = name => form.elements.namedItem(name);
    const request = {
      business: field('business').value,
      activity: field('activity').value,
      city: field('city').value,
      plan: field('plan').value,
      acceptedPrice: field('acceptedPrice').checked,
    };
    const issue = validateDemoRequest(request);
    if (issue) {
      error.textContent = issue;
      error.hidden = false;
      return;
    }
    whatsapp.href = buildWhatsAppUrl(request);
    prepared.hidden = false;
    submit.hidden = true;
    track('demo_message_prepared');
    whatsapp.focus();
  });
  doc.addEventListener?.('click', event => {
    const link = event.target.closest?.('a');
    if (!link) return;
    if (link.matches('a[href^="https://wa.me/"]')) track('whatsapp_click');
    if (link.matches('.plan-cta')) track('plan_interest', { plan: link.closest('article')?.id || 'unknown' });
    if (link.matches('a[href*="portafolio"]')) track('portfolio_view');
    if (link.matches('a[href="#planes"]')) track('price_view');
    if (link.getAttribute?.('href')?.startsWith('#')) doc.querySelector?.('.site-menu')?.removeAttribute('open');
  });
  submit.disabled = false;
}

if (typeof document !== 'undefined') initializeDemoForm(document);
