import { buildWhatsAppUrl, validateDemoRequest } from './offer.mjs';

export function initializeDemoForm(doc) {
  const form = doc.getElementById('demo-request');
  if (!form) return;
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
    whatsapp.focus();
  });
  submit.disabled = false;
}

if (typeof document !== 'undefined') initializeDemoForm(document);
