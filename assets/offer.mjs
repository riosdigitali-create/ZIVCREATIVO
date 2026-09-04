export const OFFER = {
  price: 5900,
  currency: "MXN",
  whatsapp: "525539480470",
  reference: "ZIV-SYSTEMS",
  plans: ["ZIV WEB", "ZIV BUSINESS", "ZIV AI", "Quiero orientación"],
};
export function validateDemoRequest(request) {
  for (const value of [request.name, request.business, request.activity, request.city]) {
    if (value.trim().length < 2 || value.trim().length > 100)
      return "Completa cada campo con entre 2 y 100 caracteres.";
  }
  if (!OFFER.plans.includes(request.plan))
    return "Selecciona el nivel que te interesa o pide orientación.";
  if (!request.acceptedPrice)
    return "Confirma que revisaste los precios publicados. La conversación no te obliga a contratar.";
  if (!/^\+?[0-9 ()-]{10,20}$/.test(request.phone) || request.phone.replace(/\D/g, "").length < 10)
    return "Escribe un teléfono válido de al menos 10 dígitos.";
  if (!request.contactConsent)
    return "Necesitamos tu autorización para guardar el contacto y poder llamarte.";
  return null;
}
export function buildDemoMessage(request) {
  if (validateDemoRequest(request)) throw new Error("Solicitud incompleta");
  return [
    "Hola ZIV. Quiero construir el sistema digital de mi negocio.",
    `Nombre: ${request.name.trim()}`,
    `Teléfono: ${request.phone.trim()}`,
    `Negocio: ${request.business.trim()}`,
    `Actividad: ${request.activity.trim()}`,
    `Ciudad: ${request.city.trim()}`,
    `Nivel de interés: ${request.plan}`,
    "Revisé los precios publicados: ZIV WEB $5,900 MXN; ZIV BUSINESS $12,900 MXN; ZIV AI $19,900 MXN de implementación + mensualidad desde $499 MXN.",
    "Entiendo que el alcance, calendario y posibles servicios recurrentes se confirman por escrito.",
    "Esta conversación no me obliga a contratar.",
    `Referencia: ${OFFER.reference}`,
  ].join("\n");
}
export function buildWhatsAppUrl(request) {
  return `https://wa.me/${OFFER.whatsapp}?text=${encodeURIComponent(buildDemoMessage(request))}`;
}
