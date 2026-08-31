export const OFFER = {
    price: 5900,
    deposit: 2950,
    currency: 'MXN',
    whatsapp: '525540161213',
    reference: 'ZIV-WEB48',
};
export function validateDemoRequest(request) {
    for (const value of [request.business, request.activity, request.city]) {
        if (value.trim().length < 2 || value.trim().length > 100)
            return 'Completa cada campo con entre 2 y 100 caracteres.';
    }
    if (!request.acceptedPrice)
        return 'Confirma que conoces el precio de la web completa. La demo sigue siendo gratis.';
    return null;
}
export function buildDemoMessage(request) {
    if (validateDemoRequest(request))
        throw new Error('Solicitud incompleta');
    return [
        'Hola ZIV. Quiero una demo visual gratis, sin compromiso.',
        `Negocio: ${request.business.trim()}`,
        `Actividad: ${request.activity.trim()}`,
        `Ciudad: ${request.city.trim()}`,
        'Conozco el precio de la web completa: $5,900 MXN IVA incluido; dominio y hosting aparte.',
        'Entiendo que las 48 horas comienzan con demo aprobada, anticipo y materiales completos.',
        'Si no me gusta la demo, no tengo que contratar ni pagar.',
        `Referencia: ${OFFER.reference}`,
    ].join('\n');
}
export function buildWhatsAppUrl(request) {
    return `https://wa.me/${OFFER.whatsapp}?text=${encodeURIComponent(buildDemoMessage(request))}`;
}
